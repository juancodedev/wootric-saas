const STRIPE_API = "https://api.stripe.com/v1";

function authHeader(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return `Bearer ${key}`;
}

async function stripeFetch(method: "GET" | "POST", path: string, body?: URLSearchParams): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
  };
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: body ?? null,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe API error ${res.status}: ${text}`);
  }
  return res.json();
}

export type StripeCustomer = {
  id: string;
  email: string;
  name: string;
};

export type StripePrice = {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
};

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
  subscription: string | null;
};

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
  items: { data: { price: StripePrice }[] };
};

export type StripeInvoice = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created: number;
  paid: boolean;
  hosted_invoice_url: string;
};

export type StripePortalSession = {
  id: string;
  url: string;
};

export async function createCustomer(email: string, name: string, metadata: Record<string, string>): Promise<StripeCustomer> {
  const body = new URLSearchParams({ email, name, ...metadata });
  return stripeFetch("POST", "/customers", body) as Promise<StripeCustomer>;
}

export async function getCustomer(customerId: string): Promise<StripeCustomer> {
  return stripeFetch("GET", `/customers/${customerId}`) as Promise<StripeCustomer>;
}

export async function listPrices(): Promise<StripePrice[]> {
  const result = await stripeFetch("GET", "/prices?active=true&expand[]=data.product&limit=100") as { data: StripePrice[] };
  return result.data;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  tenantId: string,
  successUrl: string,
  cancelUrl: string,
  _interval?: "monthly" | "yearly",
): Promise<StripeCheckoutSession> {
  const body = new URLSearchParams({
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    "subscription_data[metadata][tenant_id]": tenantId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return stripeFetch("POST", "/checkout/sessions", body) as Promise<StripeCheckoutSession>;
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<StripePortalSession> {
  const body = new URLSearchParams({
    customer: customerId,
    return_url: returnUrl,
  });
  return stripeFetch("POST", "/billing_portal/sessions", body) as Promise<StripePortalSession>;
}

export async function listInvoices(customerId: string, limit = 10): Promise<StripeInvoice[]> {
  const result = await stripeFetch("GET", `/invoices?customer=${customerId}&limit=${limit}`) as { data: StripeInvoice[] };
  return result.data;
}

export async function getSubscription(subscriptionId: string): Promise<StripeSubscription> {
  return stripeFetch("GET", `/subscriptions/${subscriptionId}`) as Promise<StripeSubscription>;
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await stripeFetch("POST", `/subscriptions/${subscriptionId}`, new URLSearchParams());
}
