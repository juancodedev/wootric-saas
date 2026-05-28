import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { SessionService } from "@/infrastructure/auth/SessionService";
import type { LoginRequestDto, AuthResponse } from "@/presentation/dtos/auth";

interface SupabaseAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email: string;
  };
}

async function signInWithPassword(
  email: string,
  password: string,
): Promise<SupabaseAuthResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL and service role key are required");
  }

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error ?? "Invalid credentials");
  }

  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestDto;

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    let auth: SupabaseAuthResponse;
    try {
      auth = await signInWithPassword(body.email, body.password);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid credentials" },
        { status: 401 },
      );
    }

    const sessions = new SessionService();
    const admin = createSupabaseAdmin();

    const { data: user } = await admin
      .from("users")
      .select("id, tenant_id, email, name")
      .eq("email", body.email)
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

    // Resolve permissions from role
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

    // Merge direct user permissions
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

    const expiresAt = new Date(auth.expires_at * 1000);

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
        accessToken: auth.access_token,
        refreshToken: auth.refresh_token,
        expiresAt: expiresAt.toISOString(),
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
