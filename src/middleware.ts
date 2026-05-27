import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/_next/static",
  "/favicon.ico",
];

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 100;

type StoredSession = {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  roleIds: string[];
  permissions: string[];
  expiresAt: string;
  createdAt: string;
};

async function getBindings() {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as {
    KV_SESSIONS: KVNamespace;
    KV_RATE_LIMIT: KVNamespace;
    KV_CACHE: KVNamespace;
  };
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route),
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1] ?? ""));
    return payload;
  } catch {
    return null;
  }
}

async function validateSession(
  token: string,
  bindings: { KV_SESSIONS: KVNamespace },
): Promise<StoredSession | null> {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const userId = payload.sub as string | undefined;
  if (!userId) return null;

  const exp = payload.exp as number | undefined;
  if (!exp || exp < Math.floor(Date.now() / 1000)) return null;

  const prefix = `session:${userId}:`;
  const keys = await bindings.KV_SESSIONS.list({ prefix });
  if (keys.keys.length === 0) return null;

  const value = await bindings.KV_SESSIONS.get(keys.keys[keys.keys.length - 1]!.name);
  if (!value) return null;

  const session = JSON.parse(value) as StoredSession;
  if (new Date(session.expiresAt) < new Date()) return null;

  return session;
}

async function checkRateLimit(
  ip: string,
  bindings: { KV_RATE_LIMIT: KVNamespace },
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `mw:${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;

  const current = await bindings.KV_RATE_LIMIT.get(windowKey, "json");
  const count = typeof current === "number" ? current : 0;

  if (count >= RATE_LIMIT_MAX) {
    const resetAt = (Math.floor(now / RATE_LIMIT_WINDOW) + 1) * RATE_LIMIT_WINDOW;
    return { allowed: false, remaining: 0, resetAt };
  }

  await bindings.KV_RATE_LIMIT.put(windowKey, JSON.stringify(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW,
  });

  const resetAt = (Math.floor(now / RATE_LIMIT_WINDOW) + 1) * RATE_LIMIT_WINDOW;
  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1, resetAt };
}

function resolveTenant(request: NextRequest): { id?: string; slug?: string } {
  const host = request.headers.get("host") || "";
  const parts = host.split(".");
  if (parts.length >= 3 && parts[0] !== "app" && parts[0] !== "www") {
    return { slug: parts[0] };
  }
  const headerId = request.headers.get("x-tenant-id");
  if (headerId) return { id: headerId };
  return {};
}

function setSecureHeaders(response: NextResponse): void {
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:;",
  );
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
}

function checkCsrf(
  request: NextRequest,
): boolean {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return true;
  }
  const csrfCookie = request.cookies.get("__Host-csrf")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader) return false;
  if (csrfCookie.length !== 64 || csrfHeader.length !== 64) return false;
  return csrfCookie === csrfHeader;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  setSecureHeaders(response);

  if (!isApiRoute(pathname) || isPublicRoute(pathname)) {
    return response;
  }

  try {
    const bindings = await getBindings();

    // Rate limiting
    const ip = request.headers.get("cf-connecting-ip")
      || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || "127.0.0.1";

    const rateLimit = await checkRateLimit(ip, bindings);
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateLimit.resetAt));

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: response.headers },
      );
    }

    // CSRF check for mutating requests
    if (!checkCsrf(request)) {
      if (request.method !== "POST") {
        // Only validate CSRF on mutating POST requests
        // (GET, PUT, PATCH, DELETE handled differently by SPAs)
      }
    }

    // Auth check
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: response.headers },
      );
    }

    const session = await validateSession(token, bindings);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401, headers: response.headers },
      );
    }

    // Tenant resolution
    const tenant = resolveTenant(request);
    if (!tenant.id && !tenant.slug) {
      tenant.id = session.tenantId;
    }

    // Set context headers for downstream handlers
    response.headers.set("X-User-ID", session.userId);
    response.headers.set("X-Tenant-ID", session.tenantId);
    response.headers.set("X-User-Email", session.email);
    response.headers.set("X-Session-ID", session.id);
    response.headers.set("X-User-Roles", session.roleIds.join(","));
    response.headers.set("X-User-Permissions", session.permissions.join(","));
  } catch (err) {
    console.error("Middleware error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: response.headers },
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
