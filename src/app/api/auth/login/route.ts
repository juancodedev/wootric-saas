import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { SessionService } from "@/infrastructure/auth/SessionService";
import type { AuthResponse } from "@/presentation/dtos/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !anonKey) {
      console.error("[login] Missing env vars:", {
        hasUrl: !!url,
        hasAnonKey: !!anonKey,
      });
      return NextResponse.json(
        { error: "Supabase URL and publishable key are required" },
        { status: 500 },
      );
    }

    const supabase = createClient(url, anonKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (authError || !authData.session) {
      console.error("[login] Supabase auth error:", authError);
      return NextResponse.json(
        { error: authError?.message ?? "Invalid credentials" },
        { status: 401 },
      );
    }

    const sessions = new SessionService();
    const admin = createSupabaseAdmin();

    const { data: user } = await admin
      .from("users")
      .select("id, tenant_id, email, name")
      .eq("id", authData.user.id)
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

    const roleIds = (roles ?? []).map((r) => r.role_id);
    let permissionSlugs: string[] = [];

    if (roleIds.length > 0) {
      const { data: rolePerms } = await admin
        .from("role_permissions")
        .select("permissions!inner(slug)")
        .in("role_id", roleIds);

      if (rolePerms) {
        permissionSlugs = (rolePerms as unknown as { permissions: { slug: string } }[]).map(
          (rp) => rp.permissions.slug,
        );
      }
    }

    const { data: directPerms } = await admin
      .from("user_permissions")
      .select("permissions!inner(slug)")
      .eq("user_id", user.id);

    if (directPerms) {
      const directSlugs = (directPerms as unknown as { permissions: { slug: string } }[]).map(
        (up) => up.permissions.slug,
      );
      permissionSlugs = [...new Set([...permissionSlugs, ...directSlugs])];
    }

    const expiresAt = new Date((authData.session.expires_at ?? 0) * 1000);

    await sessions.create({
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      roleIds,
      permissions: permissionSlugs,
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
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: expiresAt.toISOString(),
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[login] Error:", err instanceof Error ? err.message : err);
    console.error("[login] Stack:", err instanceof Error ? err.stack : "no stack");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
