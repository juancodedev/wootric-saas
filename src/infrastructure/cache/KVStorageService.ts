import { getBindings } from "@/lib/cloudflare/bindings";
import type { ICacheProvider } from "@/application/ports/services";

export class KVStorageService implements ICacheProvider {
  async get<T>(key: string): Promise<T | null> {
    const { KV_CACHE } = await getBindings();
    const value = await KV_CACHE.get(key, "json");
    return value as T | null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const { KV_CACHE } = await getBindings();
    if (ttlSeconds !== undefined) {
      await KV_CACHE.put(key, JSON.stringify(value), {
        expirationTtl: ttlSeconds,
      });
    } else {
      await KV_CACHE.put(key, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    const { KV_CACHE } = await getBindings();
    await KV_CACHE.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const { KV_CACHE } = await getBindings();
    const value = await KV_CACHE.get(key);
    return value !== null;
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const { KV_CACHE } = await getBindings();
    const current = await KV_CACHE.get(key, "json");
    const value = (typeof current === "number" ? current : 0) + amount;
    await KV_CACHE.put(key, JSON.stringify(value));
    return value;
  }
}
