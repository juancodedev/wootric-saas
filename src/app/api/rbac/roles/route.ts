import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/infrastructure/middleware/permissions";

export async function GET(request: NextRequest) {
  const guard = requirePermission({ role: "tenant_admin" })(request);
  if (guard) return guard;

  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: roles } = await admin
      .from("roles")
      .select("*")
      .order("name");

    return NextResponse.json(roles ?? []);
  } catch (err) {
    console.error("Roles fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
