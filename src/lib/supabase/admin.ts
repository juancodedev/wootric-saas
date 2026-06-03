import { createClient } from "@supabase/supabase-js";

let cachedAdmin: ReturnType<typeof createClient> | null = null;

/**
 * Create or return a cached Supabase admin client.
 *
 * Cloudflare Workers are single-threaded per request, so a module-level
 * variable safely caches the client across multiple calls within the same
 * request (e.g., middleware calling resolveTenantId, checkSubscription, etc.)
 * without leaking state between requests.
 */
export function createSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL and service role key are required");
  }

  cachedAdmin = createClient(url, key);
  return cachedAdmin;
}
