import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface InvitationInput {
  email: string;
  tenantId: string;
  roleSlug: string;
}

export class InvitationService {
  async invite(input: InvitationInput): Promise<void> {
    const admin = createSupabaseAdmin();

    // Check if user already exists in this tenant
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("email", input.email)
      .single();

    if (existingUser) {
      throw new Error("User already exists in this tenant");
    }

    // Get role to assign
    const { data: role } = await admin
      .from("roles")
      .select("id")
      .eq("slug", input.roleSlug)
      .single();

    if (!role) {
      throw new Error(`Role not found: ${input.roleSlug}`);
    }

    // Send Supabase invite
    const { error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: { tenant_id: input.tenantId, role_id: role.id },
    });

    if (error) {
      throw new Error(`Failed to invite user: ${error.message}`);
    }
  }

  async acceptInvitation(
    userId: string,
    email: string,
    tenantId: string,
    name: string,
    roleId: string,
  ): Promise<void> {
    const admin = createSupabaseAdmin();

    // Create user record in our database
    const { error: userError } = await admin.from("users").insert({
      id: userId,
      tenant_id: tenantId,
      email,
      name,
      is_active: true,
    });

    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`);
    }

    // Assign role
    await admin.from("user_roles").insert({
      user_id: userId,
      role_id: roleId,
      tenant_id: tenantId,
    });

    // Increment user quota (read-then-write with Supabase RPC for atomicity)
    const { data: quota } = await admin
      .from("usage_quotas")
      .select("id, used")
      .eq("tenant_id", tenantId)
      .eq("quota_key", "max_users")
      .maybeSingle();

    if (quota) {
      await admin
        .from("usage_quotas")
        .update({ used: quota.used + 1, updated_at: new Date().toISOString() })
        .eq("id", quota.id);
    } else {
      await admin.from("usage_quotas").insert({
        tenant_id: tenantId,
        quota_key: "max_users",
        used: 1,
        limit: 1,
      });
    }
  }
}
