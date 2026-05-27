import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RbacService } from "@/application/services/RbacService";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const tenantId = request.headers.get("x-tenant-id");

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const rbac = new RbacService();
    const permissions = await rbac.getUserPermissions(userId, tenantId);
    const roles = await rbac.getUserRoles(userId, tenantId);

    return NextResponse.json({ permissions, roles });
  } catch (err) {
    console.error("RBAC permissions error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
