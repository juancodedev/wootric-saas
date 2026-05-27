import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { InvitationService } from "@/infrastructure/auth/InvitationService";
import type { InviteRequest } from "@/presentation/dtos/auth";

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as InviteRequest;
    if (!body.email || !body.roleSlug) {
      return NextResponse.json(
        { error: "Email and roleSlug are required" },
        { status: 400 },
      );
    }

    const invitation = new InvitationService();
    await invitation.invite({
      email: body.email,
      tenantId,
      roleSlug: body.roleSlug,
    });

    return NextResponse.json(
      { success: true, message: "Invitation sent" },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 400 },
    );
  }
}
