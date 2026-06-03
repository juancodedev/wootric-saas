import { getBindings } from "@/lib/cloudflare/bindings";
import type { IRateLimiter, RateLimitResult } from "@/application/ports/services";

export class KVRateLimiter implements IRateLimiter {
  async check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const { KV_RATE_LIMIT } = await getBindings();
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / windowSeconds)}`;

    const current = await KV_RATE_LIMIT.get(windowKey, "json");
    const count = typeof current === "number" ? current : 0;

    if (count >= limit) {
      const resetAt = new Date(
        (Math.floor(now / windowSeconds) + 1) * windowSeconds * 1000,
      );
      return { allowed: false, remaining: 0, resetAt, limit };
    }

    const newCount = count + 1;
    await KV_RATE_LIMIT.put(windowKey, JSON.stringify(newCount), {
      expirationTtl: windowSeconds,
    });

    const remaining = limit - newCount;
    const resetAt = new Date(
      (Math.floor(now / windowSeconds) + 1) * windowSeconds * 1000,
    );
    return { allowed: true, remaining, resetAt, limit };
  }

  async reset(key: string): Promise<void> {
    const { KV_RATE_LIMIT } = await getBindings();
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / 60)}`;
    await KV_RATE_LIMIT.delete(windowKey);
  }
}
