import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";
import { SessionService } from "@/infrastructure/auth/SessionService";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { AuthResponse, RefreshRequest } from "@/presentation/dtos/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RefreshRequest;

    if (!body.refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: body.refreshToken,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message ?? "Invalid refresh token" },
        { status: 401 },
      );
    }

    const admin = createSupabaseAdmin();
    const { data: user } = await admin
      .from("users")
      .select("id, tenant_id, email, name")
      .eq("email", data.user?.email ?? "")
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);

    const { data: permissions } = await admin
      .from("user_permissions")
      .select("permission_id")
      .eq("user_id", user.id);

    const payload = JSON.parse(
      Buffer.from(data.session.access_token.split(".")[1] ?? "", "base64").toString(),
    );
    const expiresAt = new Date((payload.exp ?? 0) * 1000);

    const sessions = new SessionService();
    await sessions.create({
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      roleIds: (roles ?? []).map((r) => r.role_id),
      permissions: (permissions ?? []).map((p) => p.permission_id),
      expiresAt,
      createdAt: new Date(),
    });

    const result: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenant_id,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: expiresAt.toISOString(),
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Refresh error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
