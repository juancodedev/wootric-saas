import { createSupabaseAdmin } from "@/lib/supabase/admin";

const CACHE_TTL = 60;

export class RbacService {
  async hasPermission(
    userId: string,
    tenantId: string,
    permissionSlug: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissions.includes(permissionSlug);
  }

  async hasAllPermissions(
    userId: string,
    tenantId: string,
    permissionSlugs: string[],
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissionSlugs.every((p) => permissions.includes(p));
  }

  async hasAnyPermission(
    userId: string,
    tenantId: string,
    permissionSlugs: string[],
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissionSlugs.some((p) => permissions.includes(p));
  }

  async getUserPermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    const cached = await this.getCachedPermissions(userId, tenantId);
    if (cached) return cached;

    const admin = createSupabaseAdmin();

    const { data: userRoles } = await admin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    if (!userRoles || userRoles.length === 0) return [];

    const roleIds = userRoles.map((r) => r.role_id);

    const { data: rolePerms } = await admin
      .from("role_permissions")
      .select("permission_id")
      .in("role_id", roleIds);

    if (!rolePerms || rolePerms.length === 0) return [];

    const permIds = [...new Set(rolePerms.map((p) => p.permission_id))];

    const { data: permSlugs } = await admin
      .from("permissions")
      .select("slug")
      .in("id", permIds);

    const result = (permSlugs ?? []).map((p) => p.slug);

    await this.cachePermissions(userId, tenantId, result);
    return result;
  }

  async getUserRoles(
    userId: string,
    tenantId: string,
  ): Promise<{ roleId: string; roleSlug: string; roleName: string }[]> {
    const admin = createSupabaseAdmin();

    const { data: roles } = await admin
      .from("user_roles")
      .select("role_id, roles!inner(slug, name)")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    return (roles ?? []).map((r: Record<string, unknown>) => ({
      roleId: r.role_id as string,
      roleSlug: (r.roles as Record<string, unknown>).slug as string,
      roleName: (r.roles as Record<string, unknown>).name as string,
    }));
  }

  async assignRole(
    userId: string,
    roleId: string,
    tenantId: string,
  ): Promise<void> {
    const admin = createSupabaseAdmin();

    const { error } = await admin.from("user_roles").insert({
      user_id: userId,
      role_id: roleId,
      tenant_id: tenantId,
    });

    if (error) {
      if (error.code === "23505") {
        throw new Error("User already has this role");
      }
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    await this.clearPermissionCache(userId, tenantId);
  }

  async removeRole(
    userId: string,
    roleId: string,
    tenantId: string,
  ): Promise<void> {
    const admin = createSupabaseAdmin();

    const { error } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", roleId)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to remove role: ${error.message}`);
    }

    await this.clearPermissionCache(userId, tenantId);
  }

  async clearPermissionCache(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const { KV_CACHE } = await getBindings();
    const key = `rbac:${tenantId}:${userId}`;
    await KV_CACHE.delete(key);
  }

  private async getCachedPermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[] | null> {
    try {
      const { KV_CACHE } = await getBindings();
      const key = `rbac:${tenantId}:${userId}`;
      const cached = await KV_CACHE.get(key, "json");
      return Array.isArray(cached) ? (cached as string[]) : null;
    } catch {
      return null;
    }
  }

  private async cachePermissions(
    userId: string,
    tenantId: string,
    permissions: string[],
  ): Promise<void> {
    try {
      const { KV_CACHE } = await getBindings();
      const key = `rbac:${tenantId}:${userId}`;
      await KV_CACHE.put(key, JSON.stringify(permissions), {
        expirationTtl: CACHE_TTL,
      });
    } catch {
      // Cache miss is non-fatal
    }
  }
}

import { getBindings } from "@/lib/cloudflare/bindings";
