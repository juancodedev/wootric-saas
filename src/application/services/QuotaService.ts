import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface QuotaInfo {
  quotaKey: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string | null;
}

export class QuotaService {
  async getQuotas(tenantId: string): Promise<QuotaInfo[]> {
    const admin = createSupabaseAdmin();

    const { data } = await admin
      .from("usage_quotas")
      .select("*")
      .eq("tenant_id", tenantId);

    return (data ?? []).map((q) => ({
      quotaKey: q.quota_key,
      used: q.used,
      limit: q.limit,
      remaining: q.limit === -1 ? Infinity : Math.max(0, q.limit - q.used),
      resetAt: q.reset_at,
    }));
  }

  async checkQuota(
    tenantId: string,
    quotaKey: string,
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const admin = createSupabaseAdmin();

    const { data } = await admin
      .from("usage_quotas")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("quota_key", quotaKey)
      .single();

    if (!data) {
      return { allowed: true, current: 0, limit: Infinity };
    }

    if (data.limit === -1) {
      return { allowed: true, current: data.used, limit: Infinity };
    }

    return {
      allowed: data.used < data.limit,
      current: data.used,
      limit: data.limit,
    };
  }

  async incrementQuota(
    tenantId: string,
    quotaKey: string,
    delta: number = 1,
    action?: string,
  ): Promise<void> {
    const admin = createSupabaseAdmin();

    const { data: quota } = await admin
      .from("usage_quotas")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("quota_key", quotaKey)
      .single();

    if (quota) {
      await admin
        .from("usage_quotas")
        .update({ used: quota.used + delta })
        .eq("id", quota.id);
    } else {
      await admin.from("usage_quotas").insert({
        tenant_id: tenantId,
        quota_key: quotaKey,
        used: delta,
        limit: 0,
      });
    }

    if (action) {
      await admin.from("quota_usage_history").insert({
        tenant_id: tenantId,
        quota_key: quotaKey,
        delta,
        action,
      });
    }
  }

  async requireQuota(
    tenantId: string,
    quotaKey: string,
  ): Promise<void> {
    const check = await this.checkQuota(tenantId, quotaKey);
    if (!check.allowed) {
      throw new QuotaExceededError(quotaKey, check.limit);
    }
  }
}

export class QuotaExceededError extends Error {
  constructor(
    public readonly quotaKey: string,
    public readonly limit: number,
  ) {
    super(`Quota exceeded for ${quotaKey}: limit is ${limit}`);
    this.name = "QuotaExceededError";
  }
}
