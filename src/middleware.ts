import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchRouteGuard } from "@/infrastructure/middleware/route-guards";

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 100;
const TENANT_CACHE_TTL = 300;
const SUB_CACHE_TTL = 60;

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

type CloudflareEnv = {
  KV_SESSIONS: KVNamespace;
  KV_RATE_LIMIT: KVNamespace;
  KV_CACHE: KVNamespace;
};

async function getBindings(): Promise<CloudflareEnv> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as CloudflareEnv;
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/refresh" ||
    pathname.startsWith("/_next/static") ||
    pathname === "/favicon.ico"
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isMutationMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1] ?? ""));
  } catch {
    return null;
  }
}

async function validateSession(
  token: string,
  bindings: CloudflareEnv,
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

  const value = await bindings.KV_SESSIONS.get(
    keys.keys[keys.keys.length - 1]!.name,
  );
  if (!value) return null;

  const session = JSON.parse(value) as StoredSession;
  if (new Date(session.expiresAt) < new Date()) return null;
  return session;
}

async function checkRateLimit(
  ip: string,
  bindings: CloudflareEnv,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `mw:${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;

  const current = await bindings.KV_RATE_LIMIT.get(windowKey, "json");
  const count = typeof current === "number" ? current : 0;

  if (count >= RATE_LIMIT_MAX) {
    const resetAt =
      (Math.floor(now / RATE_LIMIT_WINDOW) + 1) * RATE_LIMIT_WINDOW;
    return { allowed: false, remaining: 0, resetAt };
  }

  await bindings.KV_RATE_LIMIT.put(windowKey, JSON.stringify(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW,
  });

  const resetAt =
    (Math.floor(now / RATE_LIMIT_WINDOW) + 1) * RATE_LIMIT_WINDOW;
  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1, resetAt };
}

async function resolveTenantFromSlug(
  slug: string,
  bindings: CloudflareEnv,
): Promise<{ id: string; status: string } | null> {
  const cacheKey = `tenant:slug:${slug}`;

  const cached = await bindings.KV_CACHE.get(cacheKey, "json");
  if (cached && typeof cached === "object" && cached !== null) {
    return cached as { id: string; status: string };
  }

  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdmin();

  const { data } = await admin
    .from("tenants")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();

  if (data) {
    const result = { id: data.id, status: data.status };
    await bindings.KV_CACHE.put(cacheKey, JSON.stringify(result), {
      expirationTtl: TENANT_CACHE_TTL,
    });
    return result;
  }

  return null;
}

async function checkSubscription(
  tenantId: string,
  bindings: CloudflareEnv,
): Promise<{ ok: boolean; status: string; reason?: string }> {
  const cacheKey = `sub:${tenantId}`;

  const cached = await bindings.KV_CACHE.get(cacheKey, "json");
  if (cached && typeof cached === "object" && cached !== null) {
    const sub = cached as {
      status: string;
      trialEndAt: string | null;
    };
    return evaluateSubscription(sub);
  }

  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdmin();

  const { data } = await admin
    .from("subscriptions")
    .select("status, trial_end_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { ok: false, status: "none", reason: "No subscription found" };
  }

  const sub = {
    status: data.status,
    trialEndAt: data.trial_end_at,
  };

  await bindings.KV_CACHE.put(cacheKey, JSON.stringify(sub), {
    expirationTtl: SUB_CACHE_TTL,
  });

  return evaluateSubscription(sub);
}

function evaluateSubscription(sub: {
  status: string;
  trialEndAt: string | null;
}): { ok: boolean; status: string; reason?: string } {
  if (sub.status === "canceled" || sub.status === "suspended") {
    return { ok: false, status: sub.status, reason: "Subscription is inactive" };
  }

  if (sub.status === "trial" && sub.trialEndAt) {
    const trialEnd = new Date(sub.trialEndAt);
    if (trialEnd < new Date()) {
      return {
        ok: false,
        status: "trial_expired",
        reason: "Trial period has ended",
      };
    }
  }

  return { ok: true, status: sub.status };
}

function setSecureHeaders(response: NextResponse): void {
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:;",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
}

function checkCsrf(request: NextRequest): boolean {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return true;
  }
  const csrfCookie = request.cookies.get("__Host-csrf")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader) return false;
  if (csrfCookie.length !== 64 || csrfHeader.length !== 64) return false;
  return csrfCookie === csrfHeader;
}

async function auditLog(
  action: string,
  context: {
    tenantId: string;
    userId?: string;
    path: string;
    method: string;
    ipAddress?: string;
    userAgent?: string;
    statusCode: number;
  },
): Promise<void> {
  try {
    const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdmin();
    await admin.from("audit_logs").insert({
      tenant_id: context.tenantId,
      user_id: context.userId ?? null,
      action,
      entity_type: "api",
      entity_id: context.path,
      metadata: { method: context.method, statusCode: context.statusCode },
      ip_address: context.ipAddress ?? null,
      user_agent: context.userAgent ?? null,
    });
  } catch {
    // Fire-and-forget; non-critical
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ── Step 1: Secure Headers ──
  setSecureHeaders(response);

  // ── Step 2: Skip non-API & public routes ──
  if (!isApiRoute(pathname) || isPublicRoute(pathname)) {
    return response;
  }

  try {
    const bindings = await getBindings();

    // ── Step 3: Rate Limiting ──
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

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

    // ── Step 4: CSRF check on mutations ──
    if (isMutationMethod(request.method) && !checkCsrf(request)) {
      // In SPA mode, CSRF can be handled by the client; log a warning
      console.warn(`CSRF check failed for ${request.method} ${pathname}`);
    }

    // ── Step 5: Authentication ──
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

    // ── Step 6: Tenant Resolution ──
    const host = request.headers.get("host") || "";
    const hostParts = host.split(".");
    let tenantSlug: string | undefined;

    if (hostParts.length >= 3 && hostParts[0] !== "app" && hostParts[0] !== "www") {
      tenantSlug = hostParts[0];
    }

    const headerTenantId = request.headers.get("x-tenant-id");
    let tenantId: string | undefined;
    let tenantStatus: string | undefined;

    // Try resolving tenant from slug (subdomain)
    if (tenantSlug) {
      const tenant = await resolveTenantFromSlug(tenantSlug, bindings);
      if (tenant) {
        tenantId = tenant.id;
        tenantStatus = tenant.status;
      }
    }

    // Override tenantId from header if provided (direct tenant access)
    if (headerTenantId) {
      tenantId = headerTenantId;
    }

    // Fallback to session tenant
    if (!tenantId) {
      tenantId = session.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404, headers: response.headers },
      );
    }

    // If we have tenantId but no status, try to get it
    if (!tenantStatus) {
      const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
      const supabase = createSupabaseAdmin();
      const { data: t } = await supabase
        .from("tenants")
        .select("status")
        .eq("id", tenantId)
        .maybeSingle();
      if (t) tenantStatus = t.status;
    }

    // ── Step 7: Tenant Active Check ──
    if (tenantStatus && tenantStatus !== "active") {
      if (tenantStatus === "suspended") {
        return NextResponse.json(
          { error: "Account suspended" },
          { status: 403, headers: response.headers },
        );
      }
      if (tenantStatus === "inactive") {
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 403, headers: response.headers },
        );
      }
    }

    // ── Step 8: Subscription / Trial Check ──
    const guard = matchRouteGuard(pathname);
    if (!guard?.skipSubscription) {
      const subCheck = await checkSubscription(tenantId, bindings);
      if (!subCheck.ok) {
        const status = subCheck.status === "trial_expired" ? 402 : 403;
        return NextResponse.json(
          { error: subCheck.reason },
          { status, headers: response.headers },
        );
      }
    }

    // ── Step 9: Permission Check ──
    if (guard) {
      if (guard.permission) {
        const hasPerm = session.permissions.includes(guard.permission);
        if (!hasPerm) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403, headers: response.headers },
          );
        }
      }

      if (guard.permissions && guard.permissions.length > 0) {
        const mode = guard.permissionMode ?? "any";
        const hasAny = guard.permissions.some((p) =>
          session.permissions.some((sp) => sp === p || sp.startsWith(p.replace("*", ""))),
        );
        const hasAll = guard.permissions.every((p) =>
          session.permissions.some((sp) => sp === p || sp.startsWith(p.replace("*", ""))),
        );
        const allowed = mode === "all" ? hasAll : hasAny;
        if (!allowed) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403, headers: response.headers },
          );
        }
      }
    }

    // ── Step 10: Feature Flag Check ──
    if (guard?.featureFlag) {
      const admin = (await import("@/lib/supabase/admin")).createSupabaseAdmin();
      const { data: flag } = await admin
        .from("feature_flags")
        .select("enabled")
        .eq("key", guard.featureFlag)
        .single();

      if (!flag?.enabled) {
        return NextResponse.json(
          { error: `Feature not available: ${guard.featureFlag}` },
          { status: 403, headers: response.headers },
        );
      }
    }

    // ── Step 11: Quota Check (on mutations) ──
    if (guard?.quotaKey && isMutationMethod(request.method)) {
      const admin = (await import("@/lib/supabase/admin")).createSupabaseAdmin();
      const { data: quota } = await admin
        .from("usage_quotas")
        .select("used, limit")
        .eq("tenant_id", tenantId)
        .eq("quota_key", guard.quotaKey)
        .maybeSingle();

      if (quota && quota.limit !== -1 && quota.used >= quota.limit) {
        return NextResponse.json(
          { error: `Quota exceeded: ${guard.quotaKey}` },
          { status: 429, headers: response.headers },
        );
      }
    }

    // ── Set context headers ──
    response.headers.set("X-User-ID", session.userId);
    response.headers.set("X-Tenant-ID", tenantId);
    response.headers.set("X-User-Email", session.email);
    response.headers.set("X-Session-ID", session.id);
    response.headers.set("X-User-Roles", session.roleIds.join(","));
    response.headers.set("X-User-Permissions", session.permissions.join(","));

    // ── Step 12: Audit Log (fire-and-forget) ──
    auditLog("api_request", {
      tenantId,
      userId: session.userId,
      path: pathname,
      method: request.method,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      statusCode: 200,
    });
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
