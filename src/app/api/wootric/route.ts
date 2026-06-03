import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthContextFromToken } from "@/lib/auth/context";

function getTenantId(request: NextRequest): string | null {
  return request.headers.get("x-tenant-id") ?? getAuthContextFromToken(request).tenantId;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: config } = await admin
      .from("tenant_config")
      .select("settings")
      .eq("tenant_id", tenantId)
      .single();

    const wootric = (config?.settings as Record<string, unknown>)?.wootric ?? null;

    return NextResponse.json({
      configured: !!wootric,
      config: wootric
        ? {
            apiUrl: (wootric as Record<string, string>).api_url ?? "",
            email: (wootric as Record<string, string>).email ?? "",
            hasPassword: !!((wootric as Record<string, string>).password),
            tokenExpiresAt: (wootric as Record<string, number>).expires_at ?? null,
          }
        : null,
    });
  } catch (err) {
    console.error("Wootric config fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
