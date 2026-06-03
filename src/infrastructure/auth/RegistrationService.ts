import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createCustomer } from "@/lib/stripe";
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

    // 6. Create Stripe customer (skip in dev if no key)
    let stripeCustomerId: string | null = null;
    try {
      if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_...") {
        const customer = await createCustomer(input.email, input.name, {
          tenant_id: tenant.id,
        });
        stripeCustomerId = customer.id;
      }
    } catch {
      // Non-blocking: proceed without Stripe customer in dev
    }

    // 7. Create free trial subscription
    const { data: freePlan } = await admin
      .from("plans")
      .select("id")
      .eq("slug", "free_trial")
      .single();

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);

    if (freePlan) {
      const subData: Record<string, unknown> = {
        tenant_id: tenant.id,
        plan_id: freePlan.id,
        status: "trial",
        trial_start_at: now.toISOString(),
        trial_end_at: trialEnd.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
      };
      if (stripeCustomerId) {
        subData.stripe_customer_id = stripeCustomerId;
      }
      await admin.from("subscriptions").insert(subData);
    }

    // 7. Set initial usage quotas for trial
    await admin.from("usage_quotas").insert([
      {
        tenant_id: tenant.id,
        quota_key: "max_exports",
        used: 0,
        limit: TRIAL_MAX_EXPORTS,
        reset_at: trialEnd.toISOString(),
      },
      {
        tenant_id: tenant.id,
        quota_key: "max_dashboards",
        used: 0,
        limit: TRIAL_MAX_DASHBOARDS,
        reset_at: trialEnd.toISOString(),
      },
      {
        tenant_id: tenant.id,
        quota_key: "max_users",
        used: 1,
        limit: TRIAL_MAX_USERS,
        reset_at: trialEnd.toISOString(),
      },
    ]);

    // 8. Generate JWT tokens directly (no anon key needed)
    const [{ SessionService }, { SignJWT }] = await Promise.all([
      import("./SessionService"),
      import("jose"),
    ]);

    const sessions = new SessionService();
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    const secretKey = new TextEncoder().encode(jwtSecret);

    const accessToken = await new SignJWT({
      sub: authUser.user.id,
      tenant_id: tenant.id,
      email: input.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    const refreshToken = await new SignJWT({
      sub: authUser.user.id,
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretKey);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Resolve permissions from assigned role
    let permissionSlugs: string[] = [];

    if (adminRole) {
      const { data: rolePerms } = await admin
        .from("role_permissions")
        .select("permissions!inner(slug)")
        .eq("role_id", adminRole.id);

      if (rolePerms) {
        permissionSlugs = (rolePerms as unknown as { permissions: { slug: string } }[]).map(
          (rp) => rp.permissions.slug,
        );
      }
    }

    const { data: directPerms } = await admin
      .from("user_permissions")
      .select("permissions!inner(slug)")
      .eq("user_id", authUser.user.id);

    if (directPerms) {
      const directSlugs = (directPerms as unknown as { permissions: { slug: string } }[]).map(
        (up) => up.permissions.slug,
      );
      permissionSlugs = [...new Set([...permissionSlugs, ...directSlugs])];
    }

    // Create session
    await sessions.create({
      userId: authUser.user.id,
      tenantId: tenant.id,
      email: input.email,
      roleIds: adminRole ? [adminRole.id] : [],
      permissions: permissionSlugs,
      expiresAt,
      createdAt: new Date(),
    });

    const session: AuthSession = {
      userId: authUser.user.id,
      tenantId: tenant.id,
      email: input.email,
      roleIds: adminRole ? [adminRole.id] : [],
      permissions: permissionSlugs,
      expiresAt,
    };

    return {
      tenantId: tenant.id,
      userId: authUser.user.id,
      session,
      accessToken,
      refreshToken,
    };
  }
}
