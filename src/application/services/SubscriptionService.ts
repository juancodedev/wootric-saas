import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface SubscriptionInfo {
  id: string;
  tenantId: string;
  planId: string;
  planSlug: string;
  planName: string;
  tier: string;
  status: string;
  trialEndAt: string | null;
  currentPeriodEnd: string | null;
  billingInterval: string | null;
}

export interface PlanInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  sortOrder: number;
}

export class SubscriptionService {
  async getCurrentSubscription(
    tenantId: string,
  ): Promise<SubscriptionInfo | null> {
    const admin = createSupabaseAdmin();

    const { data } = await admin
      .from("subscriptions")
      .select("*, plans!inner(id, slug, name, tier)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    const plan = data.plans as unknown as {
      id: string;
      slug: string;
      name: string;
      tier: string;
    };

    return {
      id: data.id,
      tenantId: data.tenant_id,
      planId: data.plan_id,
      planSlug: plan.slug,
      planName: plan.name,
      tier: plan.tier,
      status: data.status,
      trialEndAt: data.trial_end_at,
      currentPeriodEnd: data.current_period_end,
      billingInterval: data.billing_interval,
    };
  }

  async listAvailablePlans(): Promise<PlanInfo[]> {
    const admin = createSupabaseAdmin();

    const { data } = await admin
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      tier: p.tier,
      priceMonthly: p.price_monthly,
      priceYearly: p.price_yearly,
      sortOrder: p.sort_order,
    }));
  }

  async getPlanBySlug(slug: string): Promise<PlanInfo | null> {
    const plans = await this.listAvailablePlans();
    return plans.find((p) => p.slug === slug) ?? null;
  }

  async changePlan(
    tenantId: string,
    newPlanSlug: string,
  ): Promise<void> {
    const admin = createSupabaseAdmin();

    const { data: plan } = await admin
      .from("plans")
      .select("id")
      .eq("slug", newPlanSlug)
      .eq("is_active", true)
      .single();

    if (!plan) {
      throw new Error(`Plan not found: ${newPlanSlug}`);
    }

    const now = new Date();

    await admin.from("subscriptions").update({
      status: "canceled",
      canceled_at: now.toISOString(),
    }).eq("tenant_id", tenantId).eq("status", "active");

    await admin.from("subscriptions").insert({
      tenant_id: tenantId,
      plan_id: plan.id,
      status: "active",
      current_period_start: now.toISOString(),
      billing_interval: "monthly",
    });
  }
}
