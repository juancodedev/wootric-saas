import type { PlanRow, SubscriptionRow, TenantRow } from "./types";

export function createSupabaseClient(url: string, key: string) {
  const authHeader = `Bearer ${key}`;
  const apikeyHeader = key;

  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    return fetch(`${url}/rest/v1${path}`, {
      method,
      headers: {
        Authorization: authHeader,
        apikey: apikeyHeader,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  return {
    async findTenantByStripeCustomerId(
      customerId: string,
    ): Promise<TenantRow | null> {
      const res = await fetch(
        `${url}/rest/v1/subscriptions?select=tenant_id&stripe_customer_id=eq.${customerId}&limit=1`,
        {
          headers: { Authorization: authHeader, apikey: apikeyHeader },
        },
      );
      if (!res.ok) return null;
      const rows: Array<{ tenant_id: string }> = await res.json();
      const tenantId = rows[0]?.tenant_id;
      if (!tenantId) return null;

      const tRes = await fetch(
        `${url}/rest/v1/tenants?id=eq.${tenantId}&select=*`,
        {
          headers: { Authorization: authHeader, apikey: apikeyHeader },
        },
      );
      if (!tRes.ok) return null;
      const tenants: TenantRow[] = await tRes.json();
      return tenants[0] ?? null;
    },

    async findTenantByClientRefId(
      clientRefId: string,
    ): Promise<TenantRow | null> {
      const res = await fetch(
        `${url}/rest/v1/tenants?id=eq.${clientRefId}&select=*`,
        {
          headers: { Authorization: authHeader, apikey: apikeyHeader },
        },
      );
      if (!res.ok) return null;
      const tenants: TenantRow[] = await res.json();
      return tenants[0] ?? null;
    },

    async findActiveSubscription(
      tenantId: string,
    ): Promise<SubscriptionRow | null> {
      const res = await fetch(
        `${url}/rest/v1/subscriptions?select=*&tenant_id=eq.${tenantId}&order=created_at.desc&limit=1`,
        {
          headers: { Authorization: authHeader, apikey: apikeyHeader },
        },
      );
      if (!res.ok) return null;
      const rows: SubscriptionRow[] = await res.json();
      return rows[0] ?? null;
    },

    async findPlanByStripePriceId(
      _priceId: string,
    ): Promise<PlanRow | null> {
      const res = await fetch(
        `${url}/rest/v1/plans?select=*&is_active=eq.true&order=sort_order.asc`,
        {
          headers: { Authorization: authHeader, apikey: apikeyHeader },
        },
      );
      if (!res.ok) return null;
      const plans: PlanRow[] = await res.json();
      return plans[0] ?? null;
    },

    async createSubscription(data: Record<string, unknown>): Promise<void> {
      const res = await request("POST", "/subscriptions", data);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to create subscription: ${res.status} ${body}`);
      }
    },

    async updateSubscription(
      subscriptionId: string,
      data: Record<string, unknown>,
    ): Promise<void> {
      const res = await fetch(
        `${url}/rest/v1/subscriptions?id=eq.${subscriptionId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: authHeader,
            apikey: apikeyHeader,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to update subscription: ${res.status} ${body}`);
      }
    },

    async upsertConfig(tenantId: string, key: string, value: unknown): Promise<void> {
      const res = await fetch(`${url}/rest/v1/tenant_config`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          apikey: apikeyHeader,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          config_key: key,
          config_value: value,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to upsert config: ${res.status} ${body}`);
      }
    },
  };
}
