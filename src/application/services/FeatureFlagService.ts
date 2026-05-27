import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { IFeatureFlagService } from "@/application/ports/services";
import { SubscriptionService } from "./SubscriptionService";

export class FeatureFlagService implements IFeatureFlagService {
  private readonly subs: SubscriptionService;

  constructor() {
    this.subs = new SubscriptionService();
  }

  async isEnabled(flagKey: string, tenantId?: string): Promise<boolean> {
    const admin = createSupabaseAdmin();

    // 1. Check tenant-level override (highest priority)
    if (tenantId) {
      const { data: flag } = await admin
        .from("feature_flags")
        .select("id, enabled")
        .eq("key", flagKey)
        .single();

      if (flag) {
        const { data: override } = await admin
          .from("feature_flag_overrides")
          .select("enabled")
          .eq("feature_flag_id", flag.id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (override) return override.enabled;
      }

      // 2. Check plan-level feature
      const subscription = await this.subs.getCurrentSubscription(tenantId);
      if (subscription) {
        const { data: planFeature } = await admin
          .from("plan_features")
          .select("enabled")
          .eq("plan_id", subscription.planId)
          .eq("feature_key", flagKey)
          .maybeSingle();

        if (planFeature) return planFeature.enabled;
      }
    }

    // 3. Fall back to global flag value
    const { data: globalFlag } = await admin
      .from("feature_flags")
      .select("enabled")
      .eq("key", flagKey)
      .single();

    return globalFlag?.enabled ?? false;
  }

  async getEnabledFlags(tenantId?: string): Promise<string[]> {
    const admin = createSupabaseAdmin();

    const { data: allFlags } = await admin
      .from("feature_flags")
      .select("key, enabled");

    if (!allFlags) return [];

    const results: string[] = [];

    for (const flag of allFlags) {
      if (await this.isEnabled(flag.key, tenantId)) {
        results.push(flag.key);
      }
    }

    return results;
  }

  async setOverride(
    flagKey: string,
    tenantId: string,
    enabled: boolean,
  ): Promise<void> {
    const admin = createSupabaseAdmin();

    const { data: flag } = await admin
      .from("feature_flags")
      .select("id")
      .eq("key", flagKey)
      .single();

    if (!flag) throw new Error(`Feature flag not found: ${flagKey}`);

    const existing = await admin
      .from("feature_flag_overrides")
      .select("id")
      .eq("feature_flag_id", flag.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (existing.data) {
      await admin
        .from("feature_flag_overrides")
        .update({ enabled })
        .eq("id", existing.data.id);
    } else {
      await admin.from("feature_flag_overrides").insert({
        feature_flag_id: flag.id,
        tenant_id: tenantId,
        enabled,
      });
    }
  }

  async removeOverride(flagKey: string, tenantId: string): Promise<void> {
    const admin = createSupabaseAdmin();

    const { data: flag } = await admin
      .from("feature_flags")
      .select("id")
      .eq("key", flagKey)
      .single();

    if (!flag) throw new Error(`Feature flag not found: ${flagKey}`);

    await admin
      .from("feature_flag_overrides")
      .delete()
      .eq("feature_flag_id", flag.id)
      .eq("tenant_id", tenantId);
  }
}
