import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export type PermissionCheck = {
  permission?: string;
  permissions?: string[];
  mode?: "all" | "any";
  role?: string;
};

export function requirePermission(
  check: PermissionCheck,
): (request: NextRequest) => NextResponse | null {
  return (request: NextRequest) => {
    const userPermissions =
      request.headers.get("x-user-permissions")?.split(",") ?? [];

    if (check.role) {
      const { getRoleSlugs } = resolveRolesFromHeaders(request);
      if (!getRoleSlugs().includes(check.role)) {
        return NextResponse.json(
          { error: "Insufficient role" },
          { status: 403 },
        );
      }
    }

    if (check.permission && !userPermissions.includes(check.permission)) {
      return NextResponse.json(
        { error: "Forbidden: missing permission" },
        { status: 403 },
      );
    }

    if (check.permissions && check.permissions.length > 0) {
      if (check.mode === "any") {
        const hasAny = check.permissions.some((p) =>
          userPermissions.includes(p),
        );
        if (!hasAny) {
          return NextResponse.json(
            { error: "Forbidden: missing any required permission" },
            { status: 403 },
          );
        }
      } else {
        const hasAll = check.permissions.every((p) =>
          userPermissions.includes(p),
        );
        if (!hasAll) {
          return NextResponse.json(
            { error: "Forbidden: missing required permissions" },
            { status: 403 },
          );
        }
      }
    }

    return null;
  };
}

function resolveRolesFromHeaders(request: NextRequest): {
  getRoleSlugs: () => string[];
} {
  const roleSlugs =
    request.headers.get("x-user-roles")?.split(",").map((r) => r.trim()) ??
    [];
  return { getRoleSlugs: () => roleSlugs };
}

export function withPermission(
  handler: (request: NextRequest) => Promise<NextResponse>,
  check: PermissionCheck,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const guard = requirePermission(check);
    const result = guard(request);
    if (result) return result;
    return handler(request);
  };
}
