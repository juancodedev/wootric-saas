import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  IAuthProvider,
  LoginRequest,
  LoginResponse,
  AuthSession,
} from "@/application/ports/services";
import { SessionService } from "./SessionService";

export class SupabaseAuthProvider implements IAuthProvider {
  constructor(private readonly sessions: SessionService) {}

  async login(request: LoginRequest): Promise<LoginResponse> {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: request.email,
      password: request.password,
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? "Login failed");
    }

    const admin = createSupabaseAdmin();
    const { data: userData } = await admin
      .from("users")
      .select("id, tenant_id, email, name")
      .eq("email", request.email)
      .single();

    if (!userData) {
      throw new Error("User not found in organization");
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userData.id);

    const { data: permissions } = await admin
      .from("user_permissions")
      .select("permission_id")
      .eq("user_id", userData.id);

    // Decode JWT to get expiration
    const payload = JSON.parse(
      Buffer.from(data.session.access_token.split(".")[1] ?? "", "base64").toString(),
    );

    const expiresAt = new Date((payload.exp ?? 0) * 1000);
    const roleIds = (roles ?? []).map((r) => r.role_id);
    const permIds = (permissions ?? []).map((p) => p.permission_id);

    await this.sessions.create({
      userId: userData.id,
      tenantId: userData.tenant_id,
      email: userData.email,
      roleIds,
      permissions: permIds,
      expiresAt,
      createdAt: new Date(),
    });

    const session: AuthSession = {
      userId: userData.id,
      tenantId: userData.tenant_id,
      email: userData.email,
      roleIds,
      permissions: permIds,
      expiresAt,
    };

    return {
      session,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    const payload = JSON.parse(
      Buffer.from(sessionToken.split(".")[1] ?? "", "base64").toString(),
    );
    const userId = payload.sub as string;

    // Find all sessions for this user and delete (single session for now)
    const session = await this.sessions.findByUserId(userId);
    if (session) {
      await this.sessions.remove(userId, session.id);
    }
  }

  async refreshToken(token: string): Promise<LoginResponse> {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: token,
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? "Token refresh failed");
    }

    // Re-run login logic to update session data
    return this.login({
      email: data.user?.email ?? "",
      password: "",
    });
  }

  async validateSession(jwt: string): Promise<AuthSession | null> {
    try {
      const payload = JSON.parse(
        Buffer.from(jwt.split(".")[1] ?? "", "base64").toString(),
      );
      const userId = payload.sub as string;
      const now = Math.floor(Date.now() / 1000);

      if ((payload.exp ?? 0) < now) return null;

      const session = await this.sessions.findByUserId(userId);
      if (!session) return null;

      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < new Date()) return null;

      return {
        userId: session.userId,
        tenantId: session.tenantId,
        email: session.email,
        roleIds: session.roleIds,
        permissions: session.permissions,
        expiresAt,
      };
    } catch {
      return null;
    }
  }

  async createUser(
    email: string,
    password: string,
    _tenantId: string,
  ): Promise<{ id: string }> {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "Failed to create user");
    }

    return { id: data.user.id };
  }

  async inviteUser(email: string, tenantId: string): Promise<void> {
    const admin = createSupabaseAdmin();

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: tenantId },
    });

    if (error) {
      throw new Error(error?.message ?? "Failed to invite user");
    }
  }
}
