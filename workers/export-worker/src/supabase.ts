import type { ExportHistoryRow } from "./types";

function createClient(url: string, key: string) {
  const authHeader = `Bearer ${key}`;
  const apikeyHeader = key;

  return {
    from(table: string) {
      const execUpdate = async (data: Record<string, unknown>, column: string, value: string) => {
        const res = await fetch(`${url}/rest/v1/${table}?${column}=eq.${value}`, {
          method: "PATCH",
          headers: {
            Authorization: authHeader,
            apikey: apikeyHeader,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Supabase update failed: ${res.status} ${body}`);
        }
      };

      return {
        update(data: Record<string, unknown>) {
          return {
            eq: (column: string, value: string) => execUpdate(data, column, value),
          };
        },
        async insert(data: Record<string, unknown>) {
          const res = await fetch(`${url}/rest/v1/${table}`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              apikey: apikeyHeader,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const body = await res.text();
            throw new Error(`Supabase insert failed: ${res.status} ${body}`);
          }
          return res.json();
        },
      };
    },
  };
}

export function createSupabaseClient(url: string, key: string) {
  const client = createClient(url, key);

  return {
    async updateExportStatus(
      exportId: string,
      data: Partial<ExportHistoryRow>,
    ): Promise<void> {
      await client.from("export_history").update(data).eq("id", exportId);
    },

    async getExport(exportId: string): Promise<ExportHistoryRow | null> {
      const res = await fetch(
        `${url}/rest/v1/export_history?id=eq.${exportId}&select=*`,
        {
          headers: {
            Authorization: `Bearer ${key}`,
            apikey: key,
          },
        },
      );
      if (!res.ok) return null;
      const rows: ExportHistoryRow[] = await res.json();
      return rows[0] ?? null;
    },
  };
}
