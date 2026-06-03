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
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    return NextResponse.json({ config: config ?? {} });
  } catch (err) {
    console.error("Tenant config fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const body = (await request.json()) as {
      branding?: Record<string, unknown>;
      settings?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };

    const admin = createSupabaseAdmin();

    const { data: existing } = await admin
      .from("tenant_config")
      .select("id")
      .eq("tenant_id", tenantId)
      .single();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (body.branding !== undefined) updates.branding = body.branding;
      if (body.settings !== undefined) updates.settings = body.settings;
      if (body.metadata !== undefined) updates.metadata = body.metadata;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }

      const { error } = await admin
        .from("tenant_config")
        .update(updates)
        .eq("tenant_id", tenantId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      const { error } = await admin.from("tenant_config").insert({
        tenant_id: tenantId,
        branding: body.branding ?? {},
        settings: body.settings ?? {},
        metadata: body.metadata ?? {},
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Tenant config update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
