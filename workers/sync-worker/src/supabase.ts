export function createSupabaseClient(url: string, key: string) {
  const authHeader = `Bearer ${key}`;
  const apikeyHeader = key;

  return {
    async getActiveTenants(): Promise<Array<{ id: string; slug: string; domain: string | null }>> {
      const res = await fetch(`${url}/rest/v1/tenants?select=id,slug,domain&status=eq.active`, {
        headers: {
          Authorization: authHeader,
          apikey: apikeyHeader,
        },
      });
      if (!res.ok) throw new Error(`Failed to fetch tenants: ${res.status}`);
      return res.json();
    },

    async getTenantConfig(tenantId: string): Promise<Record<string, unknown>> {
      const res = await fetch(
        `${url}/rest/v1/tenant_config?select=config_key,config_value&tenant_id=eq.${tenantId}`,
        {
          headers: {
            Authorization: authHeader,
            apikey: apikeyHeader,
          },
        },
      );
      if (!res.ok) return {};
      const rows: Array<{ config_key: string; config_value: unknown }> = await res.json();
      const config: Record<string, unknown> = {};
      for (const row of rows) {
        config[row.config_key] = row.config_value;
      }
      return config;
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

    async getQuota(tenantId: string, quotaKey: string): Promise<{ used: number; limit: number } | null> {
      const res = await fetch(
        `${url}/rest/v1/usage_quotas?select=used,limit&tenant_id=eq.${tenantId}&quota_key=eq.${quotaKey}`,
        {
          headers: {
            Authorization: authHeader,
            apikey: apikeyHeader,
          },
        },
      );
      if (!res.ok) return null;
      const rows: Array<{ used: number; limit: number }> = await res.json();
      return rows[0] ?? null;
    },

    async updateQuotaUsed(tenantId: string, quotaKey: string, used: number): Promise<void> {
      const res = await fetch(
        `${url}/rest/v1/usage_quotas?tenant_id=eq.${tenantId}&quota_key=eq.${quotaKey}`,
        {
          method: "PATCH",
          headers: {
            Authorization: authHeader,
            apikey: apikeyHeader,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ used }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to update quota: ${res.status} ${body}`);
      }
    },

    async insertMany(table: string, rows: Record<string, unknown>[]): Promise<void> {
      if (rows.length === 0) return;
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          apikey: apikeyHeader,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(rows),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to insert into ${table}: ${res.status} ${body}`);
      }
    },
  };
}
