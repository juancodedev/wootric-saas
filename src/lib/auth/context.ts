import type { NextRequest } from "next/server";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1] ?? ""));
  } catch {
    return null;
  }
}

export function getAuthContextFromToken(request: NextRequest): {
  tenantId: string | null;
  userId: string | null;
  email: string | null;
} {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { tenantId: null, userId: null, email: null };
  }
  const payload = decodeJwtPayload(authHeader.slice(7));
  if (!payload) {
    return { tenantId: null, userId: null, email: null };
  }
  const meta = payload.user_metadata as Record<string, unknown> | undefined;
  return {
    tenantId: (meta?.tenant_id as string) ?? null,
    userId: (payload.sub as string) ?? null,
    email: (payload.email as string) ?? (meta?.email as string) ?? null,
  };
}
