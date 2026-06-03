import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSubscription, listInvoices, cancelSubscription } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: sub } = await admin
      .from("subscriptions")
      .select("*, plans(name, slug, tier, price_monthly, price_yearly)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) {
      return NextResponse.json({ subscription: null });
    }

    let stripeDetails = null;
    const stripeSubId = sub.stripe_subscription_id as string | undefined;
    const stripeCustomerId = sub.stripe_customer_id as string | undefined;

    if (stripeSubId) {
      try {
        stripeDetails = await getSubscription(stripeSubId);
      } catch {
        // Stripe subscription may not exist in dev
      }
    }

    let invoices = null;
    if (stripeCustomerId) {
      try {
        invoices = await listInvoices(stripeCustomerId);
      } catch {
        // Stripe invoices may not exist in dev
      }
    }

    return NextResponse.json({
      subscription: {
        id: sub.id,
        plan: sub.plans,
        status: sub.status,
        trialStartAt: sub.trial_start_at,
        trialEndAt: sub.trial_end_at,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        canceledAt: sub.canceled_at,
        billingInterval: sub.billing_interval,
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId,
        stripeStatus: stripeDetails?.status ?? null,
        currentPeriodEndEpoch: stripeDetails?.current_period_end ?? null,
      },
      invoices,
    });
  } catch (err) {
    console.error("Billing subscription error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const tenantId = _request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const stripeSubId = sub.stripe_subscription_id as string | undefined;
    if (stripeSubId) {
      await cancelSubscription(stripeSubId);
    }

    await admin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", (sub as Record<string, unknown>).id as string);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Billing cancel error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
