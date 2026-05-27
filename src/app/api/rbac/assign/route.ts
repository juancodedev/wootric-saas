import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RbacService } from "@/application/services/RbacService";
import { requirePermission } from "@/infrastructure/middleware/permissions";

export async function POST(request: NextRequest) {
  const guard = requirePermission({ permission: "users.manage" })(request);
  if (guard) return guard;

  try {
    const body = (await request.json()) as {
      userId: string;
      roleId: string;
      tenantId?: string;
    };

    const tenantId = body.tenantId ?? request.headers.get("x-tenant-id");
    if (!body.userId || !body.roleId || !tenantId) {
      return NextResponse.json(
        { error: "userId, roleId, and tenant context are required" },
        { status: 400 },
      );
    }

    const rbac = new RbacService();
    await rbac.assignRole(body.userId, body.roleId, tenantId);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already has this role")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const guard = requirePermission({ permission: "users.manage" })(request);
  if (guard) return guard;

  try {
    const body = (await request.json()) as {
      userId: string;
      roleId: string;
    };

    const tenantId = request.headers.get("x-tenant-id");
    if (!body.userId || !body.roleId || !tenantId) {
      return NextResponse.json(
        { error: "userId, roleId, and tenant context are required" },
        { status: 400 },
      );
    }

    const rbac = new RbacService();
    await rbac.removeRole(body.userId, body.roleId, tenantId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
