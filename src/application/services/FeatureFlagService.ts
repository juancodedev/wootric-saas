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

    // 1. Fetch all flags in one query
    const { data: allFlags } = await admin
      .from("feature_flags")
      .select("id, key, enabled");

    if (!allFlags) return [];

    const flagIds = allFlags.map((f) => f.id);

    // 2. Batch-fetch all overrides for this tenant in one query
    const overridesMap: Record<string, boolean> = {};
    if (tenantId && flagIds.length > 0) {
      const { data: overrides } = await admin
        .from("feature_flag_overrides")
        .select("feature_flag_id, enabled")
        .eq("tenant_id", tenantId)
        .in("feature_flag_id", flagIds);

      if (overrides) {
        for (const o of overrides) {
          overridesMap[o.feature_flag_id] = o.enabled;
        }
      }
    }

    // 3. Fetch subscription + plan features once (if tenant provided)
    const planFeaturesMap: Record<string, boolean> = {};
    if (tenantId) {
      const subscription = await this.subs.getCurrentSubscription(tenantId);
      if (subscription) {
        const { data: planFeatures } = await admin
          .from("plan_features")
          .select("feature_key, enabled")
          .eq("plan_id", subscription.planId);

        if (planFeatures) {
          for (const pf of planFeatures) {
            planFeaturesMap[pf.feature_key] = pf.enabled;
          }
        }
      }
    }

    // 4. Resolve everything in-memory
    const results: string[] = [];

    for (const flag of allFlags) {
      // Priority 1: tenant override
      if (tenantId && flag.id in overridesMap) {
        if (overridesMap[flag.id]) results.push(flag.key);
        continue;
      }

      // Priority 2: plan feature
      if (tenantId && flag.key in planFeaturesMap) {
        if (planFeaturesMap[flag.key]) results.push(flag.key);
        continue;
      }

      // Priority 3: global flag
      if (flag.enabled) {
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
