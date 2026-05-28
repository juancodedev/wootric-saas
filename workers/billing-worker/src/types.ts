export interface BillingEventMessage {
  type: "subscription.updated" | "invoice.paid" | "invoice.failed";
  tenantId: string;
  stripeEventId: string;
  data: Record<string, unknown>;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  LOG_LEVEL?: string;
}

export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  billing_interval: string | null;
}

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_yearly: number;
}

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: string;
}

export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: Record<string, unknown>;
  };
}
