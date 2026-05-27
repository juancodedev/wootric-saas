import { injectable } from "tsyringe";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { TRIAL_DURATION_DAYS, TRIAL_MAX_EXPORTS, TRIAL_MAX_DASHBOARDS, TRIAL_MAX_USERS } from "@/lib/constants";
import type { AuthSession } from "@/application/ports/services";

export interface RegistrationInput {
  email: string;
  password: string;
  name: string;
  companyName: string;
  slug: string;
}

export interface RegistrationResult {
  tenantId: string;
  userId: string;
  session: AuthSession;
  accessToken: string;
  refreshToken: string;
}

@injectable()
export class RegistrationService {
  async register(input: RegistrationInput): Promise<RegistrationResult> {
    const admin = createSupabaseAdmin();

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: input.companyName,
        slug: input.slug,
        status: "active",
      })
      .select("id")
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Failed to create tenant: ${tenantError?.message}`);
    }

    // 2. Create tenant config
    await admin.from("tenant_config").insert({
      tenant_id: tenant.id,
      settings: {},
      metadata: {},
    });

    // 3. Create user via Supabase Auth + our users table
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { tenant_id: tenant.id },
      });

    if (authError || !authUser) {
      // Rollback tenant
      await admin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Failed to create user: ${authError?.message}`);
    }

    // 4. Insert into our users table
    const { error: userError } = await admin.from("users").insert({
      id: authUser.user.id,
      tenant_id: tenant.id,
      email: input.email,
      name: input.name,
      is_active: true,
    });

    if (userError) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      await admin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create user profile: ${userError?.message}`);
    }

    // 5. Assign tenant_admin role
    const { data: adminRole } = await admin
      .from("roles")
      .select("id")
      .eq("slug", "tenant_admin")
      .single();

    if (adminRole) {
      await admin.from("user_roles").insert({
        user_id: authUser.user.id,
        role_id: adminRole.id,
        tenant_id: tenant.id,
      });
    }

    // 6. Create free trial subscription
    const { data: freePlan } = await admin
      .from("plans")
      .select("id")
      .eq("slug", "free_trial")
      .single();

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);

    if (freePlan) {
      await admin.from("subscriptions").insert({
        tenant_id: tenant.id,
        plan_id: freePlan.id,
        status: "trial",
        trial_start_at: now.toISOString(),
        trial_end_at: trialEnd.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
      });
    }

    // 7. Set initial usage quotas for trial
    await admin.from("usage_quotas").insert([
      {
        tenant_id: tenant.id,
        quota_key: "exports",
        used: 0,
        limit: TRIAL_MAX_EXPORTS,
        reset_at: trialEnd.toISOString(),
      },
      {
        tenant_id: tenant.id,
        quota_key: "dashboards",
        used: 0,
        limit: TRIAL_MAX_DASHBOARDS,
        reset_at: trialEnd.toISOString(),
      },
      {
        tenant_id: tenant.id,
        quota_key: "users",
        used: 1,
        limit: TRIAL_MAX_USERS,
        reset_at: trialEnd.toISOString(),
      },
    ]);

    // 8. Login to get tokens
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (loginError || !loginData.session) {
      throw new Error(`Login after registration failed: ${loginError?.message}`);
    }

    // Get permissions
    const { data: permissions } = await admin
      .from("user_permissions")
      .select("permission_id")
      .eq("user_id", authUser.user.id);

    // Create session
    const { SessionService } = await import("./SessionService");
    const sessions = new SessionService();
    const payload = JSON.parse(
      Buffer.from(loginData.session.access_token.split(".")[1] ?? "", "base64").toString(),
    );

    await sessions.create({
      userId: authUser.user.id,
      tenantId: tenant.id,
      email: input.email,
      roleIds: adminRole ? [adminRole.id] : [],
      permissions: (permissions ?? []).map((p) => p.permission_id),
      expiresAt: new Date((payload.exp ?? 0) * 1000),
      createdAt: new Date(),
    });

    const session: AuthSession = {
      userId: authUser.user.id,
      tenantId: tenant.id,
      email: input.email,
      roleIds: adminRole ? [adminRole.id] : [],
      permissions: (permissions ?? []).map((p) => p.permission_id),
      expiresAt: new Date((payload.exp ?? 0) * 1000),
    };

    return {
      tenantId: tenant.id,
      userId: authUser.user.id,
      session,
      accessToken: loginData.session.access_token,
      refreshToken: loginData.session.refresh_token,
    };
  }
}
