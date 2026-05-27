export interface RouteGuardConfig {
  permission?: string;
  permissions?: string[];
  permissionMode?: "all" | "any";
  quotaKey?: string;
  featureFlag?: string;
  skipSubscription?: boolean;
}

const GUARDS: [string, RouteGuardConfig][] = [
  // ── Public (no auth required) ──
  ["/api/auth/login", { skipSubscription: true }],
  ["/api/auth/register", { skipSubscription: true }],
  ["/api/auth/refresh", { skipSubscription: true }],

  // ── RBAC ──
  ["/api/rbac/assign", { permission: "users.manage" }],
  ["/api/rbac/roles", { permission: "users.manage" }],
  ["/api/rbac/permissions", { skipSubscription: true }],

  // ── Feature Flags ──
  ["/api/feature-flags", { permission: "admin.features" }],

  // ── Subscriptions / Billing ──
  ["/api/subscriptions", { permission: "billing.manage" }],

  // ── Quotas ──
  ["/api/quotas", { permission: "admin.manage" }],
];

export function matchRouteGuard(pathname: string): RouteGuardConfig | null {
  for (const [prefix, guard] of GUARDS) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return guard;
    }
  }

  // Dashboard/Widget/Report routes — protected by default
  if (
    pathname.startsWith("/api/dashboards") ||
    pathname.startsWith("/api/widgets") ||
    pathname.startsWith("/api/reports")
  ) {
    return {
      permission: pathname.startsWith("/api/reports/export")
        ? "exports.create"
        : undefined,
      permissions: pathname.startsWith("/api/dashboards")
        ? ["dashboards.*"]
        : undefined,
      quotaKey: pathname.includes("/export") ? "max_exports" : undefined,
    };
  }

  // Default: authenticated but no extra guard
  return { skipSubscription: false };
}
