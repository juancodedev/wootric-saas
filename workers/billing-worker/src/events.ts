import type { StripeEvent } from "./types";
import { createSupabaseClient } from "./supabase";

function log(level: string, message: string, ...args: unknown[]): void {
  console.log(JSON.stringify({ level, message, args, timestamp: new Date().toISOString() }));
}

export async function handleCheckoutSessionCompleted(
  event: StripeEvent,
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<void> {
  const session = event.data.object;
  const customerId = session.customer as string | undefined;
  const subscriptionId = session.subscription as string | undefined;
  const clientRefId = session.client_reference_id as string | undefined;
  const mode = session.mode as string | undefined;

  if (mode !== "subscription") {
    log("info", "Ignoring non-subscription checkout session");
    return;
  }

  if (!customerId || !subscriptionId) {
    log("warn", "Checkout session missing customer or subscription ID");
    return;
  }

  let tenantId: string | null = null;

  if (clientRefId) {
    log("info", `Looking up tenant by client_ref_id: ${clientRefId}`);
  }

  if (!tenantId) {
    const tenant = await supabase.findTenantByStripeCustomerId(customerId);
    if (tenant) {
      tenantId = tenant.id;
    }
  }

  if (!tenantId) {
    log("warn", `No tenant found for customer ${customerId}, skipping`);
    return;
  }

  const plan = await supabase.findPlanByStripePriceId("starter");
  if (!plan) {
    log("error", "No active plans found in database");
    return;
  }

  const existingSub = await supabase.findActiveSubscription(tenantId);
  if (existingSub) {
    log("info", `Updating existing subscription for tenant ${tenantId}`);
    await supabase.updateSubscription(existingSub.id, {
      status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_start: new Date().toISOString(),
    });
  } else {
    log("info", `Creating new subscription for tenant ${tenantId}`);
    await supabase.createSubscription({
      tenant_id: tenantId,
      plan_id: plan.id,
      status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_start: new Date().toISOString(),
      billing_interval: "monthly",
    });
  }
}

export async function handleCustomerSubscriptionUpdated(
  event: StripeEvent,
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<void> {
  const sub = event.data.object;
  const customerId = sub.customer as string;
  const stripeSubId = sub.id as string;
  const status = sub.status as string;
  const currentPeriodEnd = sub.current_period_end as number | undefined;

  if (!customerId) return;

  const tenant = await supabase.findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    log("warn", `No tenant found for customer ${customerId}`);
    return;
  }

  const existingSub = await supabase.findActiveSubscription(tenant.id);
  if (!existingSub) {
    log("warn", `No subscription found for tenant ${tenant.id}`);
    return;
  }

  const update: Record<string, unknown> = {
    stripe_subscription_id: stripeSubId,
  };

  switch (status) {
    case "active":
      update.status = "active";
      break;
    case "past_due":
      update.status = "past_due";
      break;
    case "canceled":
      update.status = "canceled";
      update.canceled_at = new Date().toISOString();
      break;
    case "incomplete":
    case "incomplete_expired":
      update.status = "canceled";
      break;
    case "trialing":
      update.status = "trial";
      break;
    case "paused":
      update.status = "past_due";
      break;
  }

  if (currentPeriodEnd) {
    update.current_period_end = new Date(currentPeriodEnd * 1000).toISOString();
  }

  await supabase.updateSubscription(existingSub.id, update);
  log("info", `Updated subscription ${existingSub.id} to status=${status}`);
}

export async function handleCustomerSubscriptionDeleted(
  event: StripeEvent,
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<void> {
  const sub = event.data.object;
  const customerId = sub.customer as string;

  if (!customerId) return;

  const tenant = await supabase.findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    log("warn", `No tenant found for customer ${customerId}`);
    return;
  }

  const existingSub = await supabase.findActiveSubscription(tenant.id);
  if (!existingSub) {
    log("warn", `No subscription found for tenant ${tenant.id}`);
    return;
  }

  await supabase.updateSubscription(existingSub.id, {
    status: "canceled",
    canceled_at: new Date().toISOString(),
  });

  log("info", `Canceled subscription ${existingSub.id} for tenant ${tenant.id}`);
}

export async function handleInvoicePaid(
  event: StripeEvent,
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<void> {
  const invoice = event.data.object;
  const customerId = invoice.customer as string;
  const periodEnd = invoice.period_end as number | undefined;
  const subscriptionId = invoice.subscription as string | undefined;

  if (!customerId) return;

  const tenant = await supabase.findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    log("warn", `No tenant found for customer ${customerId}`);
    return;
  }

  const existingSub = await supabase.findActiveSubscription(tenant.id);
  if (!existingSub) {
    log("warn", `No subscription found for tenant ${tenant.id}`);
    return;
  }

  const update: Record<string, unknown> = {
    status: "active",
  };

  if (periodEnd) {
    update.current_period_end = new Date(periodEnd * 1000).toISOString();
  }

  if (subscriptionId) {
    update.stripe_subscription_id = subscriptionId;
  }

  await supabase.updateSubscription(existingSub.id, update);
  log("info", `Invoice paid for tenant ${tenant.id}, period end: ${periodEnd}`);
}

export async function handleInvoicePaymentFailed(
  event: StripeEvent,
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<void> {
  const invoice = event.data.object;
  const customerId = invoice.customer as string;
  const attemptCount = invoice.attempt_count as number | undefined;

  if (!customerId) return;

  const tenant = await supabase.findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    log("warn", `No tenant found for customer ${customerId}`);
    return;
  }

  const existingSub = await supabase.findActiveSubscription(tenant.id);
  if (!existingSub) {
    log("warn", `No subscription found for tenant ${tenant.id}`);
    return;
  }

  await supabase.updateSubscription(existingSub.id, {
    status: "past_due",
  });

  await supabase.upsertConfig(
    tenant.id,
    "payment_failure_attempts",
    attemptCount ?? 1,
  );

  log("warn", `Payment failed for tenant ${tenant.id}, attempt ${attemptCount ?? 1}`);
}
