import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { KVNamespace } from "@cloudflare/workers-types";
import { matchRouteGuard } from "@/infrastructure/middleware/route-guards";

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 100;
const TENANT_CACHE_TTL = 300;
const SUB_CACHE_TTL = 60;
const IS_DEV = process.env.NODE_ENV !== "production";

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

function getIpAddress(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

function resolveTenantSlug(host: string): string | undefined {
  const hostParts = host.split(".");
  if (hostParts.length >= 3 && hostParts[0] !== "app" && hostParts[0] !== "www") {
    return hostParts[0];
  }
  return undefined;
}

async function resolveTenantId(
  request: NextRequest,
  session: StoredSession,
  bindings: CloudflareEnv,
): Promise<{ tenantId: string; tenantStatus: string } | { error: string; status: number }> {
  const host = request.headers.get("host") || "";
  const tenantSlug = resolveTenantSlug(host);
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
    return { error: "Tenant not found", status: 404 };
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

  return { tenantId, tenantStatus: tenantStatus ?? "active" };
}

function checkTenantStatus(tenantStatus: string): { blocked: boolean; response?: NextResponse } {
  if (tenantStatus === "suspended") {
    return {
      blocked: true,
      response: NextResponse.json({ error: "Account suspended" }, { status: 403 }),
    };
  }
  if (tenantStatus === "inactive") {
    return {
      blocked: true,
      response: NextResponse.json({ error: "Account is not active" }, { status: 403 }),
    };
  }
  return { blocked: false };
}

function checkPermissions(
  session: StoredSession,
  guard: { permission?: string; permissions?: string[]; permissionMode?: string },
): boolean {
  if (guard.permission) {
    if (!session.permissions.includes(guard.permission)) return false;
  }

  if (guard.permissions && guard.permissions.length > 0) {
    const mode = guard.permissionMode ?? "any";
    const hasAny = guard.permissions.some((p) =>
      session.permissions.some((sp) => sp === p || sp.startsWith(p.replace("*", ""))),
    );
    const hasAll = guard.permissions.every((p) =>
      session.permissions.some((sp) => sp === p || sp.startsWith(p.replace("*", ""))),
    );
    if (mode === "all" ? !hasAll : !hasAny) return false;
  }

  return true;
}

async function validateSession(
  token: string,
  bindings: CloudflareEnv,
): Promise<{ session: StoredSession | null; reason?: string }> {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { session: null, reason: "failed to decode JWT payload" };
  }
  const userId = payload.sub as string | undefined;
  if (!userId) {
    return { session: null, reason: "no sub claim in JWT" };
  }
  const exp = payload.exp as number | undefined;
  if (!exp || exp < Math.floor(Date.now() / 1000)) {
    return { session: null, reason: `token expired (exp: ${exp})` };
  }

  // Try KV session first
  const prefix = `session:${userId}:`;
  try {
    const keys = await bindings.KV_SESSIONS.list({ prefix });
    if (keys.keys.length > 0) {
      const value = await bindings.KV_SESSIONS.get(
        keys.keys[keys.keys.length - 1]!.name,
      );
      if (value) {
        const session = JSON.parse(value) as StoredSession;
        if (new Date(session.expiresAt) >= new Date()) {
          return { session };
        }
      }
    }
  } catch {
    // KV read failed, continue to fallback
  }

  // Fallback: extract session from JWT + Supabase
  const iss = payload.iss as string | undefined;

  try {
    const supabaseUrl = iss?.replace("/auth/v1", "") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const env = bindings as Record<string, unknown>;
    const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY as string) || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceKey) {
      return { session: null, reason: `missing Supabase credentials (url: ${!!supabaseUrl}, key: ${!!serviceKey})` };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: user, error: userErr } = await admin
      .from("users")
      .select("id, tenant_id, email, name")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      return { session: null, reason: `user query failed: ${userErr?.message ?? "not found"}` };
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId);

    const roleIds = (roles ?? []).map((r) => r.role_id);
    let permissionSlugs: string[] = [];

    if (roleIds.length > 0) {
      const { data: rolePerms } = await admin
        .from("role_permissions")
        .select("permissions!inner(slug)")
        .in("role_id", roleIds);
      if (rolePerms) {
        permissionSlugs = (rolePerms as unknown as { permissions: { slug: string } }[]).map(
          (rp) => rp.permissions.slug,
        );
      }
    }

    const { data: directPerms } = await admin
      .from("user_permissions")
      .select("permissions!inner(slug)")
      .eq("user_id", userId);
    if (directPerms) {
      const directSlugs = (directPerms as unknown as { permissions: { slug: string } }[]).map(
        (up) => up.permissions.slug,
      );
      permissionSlugs = [...new Set([...permissionSlugs, ...directSlugs])];
    }

    const expiresAt = payload.exp ? new Date((payload.exp as number) * 1000) : new Date(Date.now() + 3600000);

    return {
      session: {
        id: "fallback",
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        roleIds,
        permissions: permissionSlugs,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { session: null, reason: `fallback error: ${err instanceof Error ? err.message : String(err)}` };
  }
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

function setContextHeaders(
  response: NextResponse,
  requestHeaders: Headers,
  session: StoredSession,
  tenantId: string,
): void {
  requestHeaders.set("X-User-ID", session.userId);
  requestHeaders.set("X-Tenant-ID", tenantId);
  requestHeaders.set("X-User-Email", session.email);
  requestHeaders.set("X-Session-ID", session.id);
  requestHeaders.set("X-User-Roles", session.roleIds.join(","));
  // NOTE: X-User-Permissions intentionally NOT set on response headers to avoid
  // leaking permission information to the client. Only available via request headers
  // for downstream server-side consumption.

  response.headers.set("X-User-ID", session.userId);
  response.headers.set("X-Tenant-ID", tenantId);
  response.headers.set("X-User-Email", session.email);
  response.headers.set("X-Session-ID", session.id);
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
  let response = NextResponse.next();

  // ── Step 1: Secure Headers ──
  setSecureHeaders(response);

  // ── Step 2: Skip non-API & public routes ──
  if (!isApiRoute(pathname) || isPublicRoute(pathname)) {
    response.headers.set("X-Middleware", "bypassed");
    return response;
  }

  response.headers.set("X-Middleware", "active");

  try {
    const bindings = await getBindings();

    // ── Step 3: Rate Limiting ──
    const ip = getIpAddress(request);

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
      return NextResponse.json(
        { error: "CSRF token missing or invalid" },
        { status: 403, headers: response.headers },
      );
    }

    // ── Step 5: Authentication ──
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: response.headers },
      );
    }

    const { session, reason } = await validateSession(token, bindings);

    if (!session) {
      if (IS_DEV) {
        response.headers.set("X-Debug-Reason", reason ?? "unknown");
      }
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401, headers: response.headers },
      );
    }

    // ── Step 6: Tenant Resolution ──
    const tenantResult = await resolveTenantId(request, session, bindings);
    if ("error" in tenantResult) {
      return NextResponse.json(
        { error: tenantResult.error },
        { status: tenantResult.status, headers: response.headers },
      );
    }
    const { tenantId, tenantStatus } = tenantResult;

    // ── Step 7: Tenant Active Check ──
    const tenantCheck = checkTenantStatus(tenantStatus);
    if (tenantCheck.blocked) {
      return tenantCheck.response!;
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
    if (guard && !checkPermissions(session, guard)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403, headers: response.headers },
      );
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
    const requestHeaders = new Headers(request.headers);
    response = NextResponse.next({ request: { headers: requestHeaders } });
    setContextHeaders(response, requestHeaders, session, tenantId);

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
