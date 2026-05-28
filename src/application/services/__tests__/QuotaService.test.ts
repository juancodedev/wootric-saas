import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuotaService, QuotaExceededError } from "../QuotaService";

function makeMockChain() {
  const select = vi.fn();
  const eq = vi.fn();
  const single = vi.fn();
  const order = vi.fn();
  const update = vi.fn();
  const insert = vi.fn();

  select.mockReturnValue({ eq, order, single });
  eq.mockReturnValue({ eq, order, single, update, insert, select });
  order.mockReturnValue({ eq, single });
  single.mockResolvedValue({ data: null, error: null });

  return {
    from: vi.fn((_table: string) => ({ select, eq, order, single, update, insert })),
    select,
    eq,
    single,
    order,
    update,
    insert,
  };
}

let mockChain: ReturnType<typeof makeMockChain>;

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => mockChain.from(table),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockChain = makeMockChain();
});

describe("QuotaService", () => {
  describe("getQuotas", () => {
    it("returns quotas for a tenant", async () => {
      mockChain.select.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { quota_key: "max_exports", used: 2, limit: 10, reset_at: null },
            { quota_key: "max_users", used: 5, limit: 5, reset_at: "2026-06-01T00:00:00Z" },
          ],
          error: null,
        }),
        order: vi.fn(),
        single: vi.fn(),
      });

      const svc = new QuotaService();
      const quotas = await svc.getQuotas("tenant1");

      expect(quotas).toHaveLength(2);
      expect(quotas[0]!.quotaKey).toBe("max_exports");
      expect(quotas[0]!.remaining).toBe(8);
      expect(quotas[1]!.remaining).toBe(0);
    });

    it("returns empty array when no quotas exist", async () => {
      mockChain.select.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn(),
        single: vi.fn(),
      });

      const svc = new QuotaService();
      const quotas = await svc.getQuotas("tenant1");

      expect(quotas).toEqual([]);
    });
  });

  describe("checkQuota", () => {
    it("allows when under limit", async () => {
      mockChain.single.mockResolvedValue({
        data: { used: 3, limit: 10 },
        error: null,
      });

      const svc = new QuotaService();
      const result = await svc.checkQuota("tenant1", "max_exports");

      expect(result.allowed).toBe(true);
    });

    it("blocks when at limit", async () => {
      mockChain.single.mockResolvedValue({
        data: { used: 10, limit: 10 },
        error: null,
      });

      const svc = new QuotaService();
      const result = await svc.checkQuota("tenant1", "max_exports");

      expect(result.allowed).toBe(false);
    });

    it("allows unlimited quota", async () => {
      mockChain.single.mockResolvedValue({
        data: { used: 100, limit: -1 },
        error: null,
      });

      const svc = new QuotaService();
      const result = await svc.checkQuota("tenant1", "max_exports");

      expect(result.allowed).toBe(true);
    });

    it("allows when no quota record exists", async () => {
      mockChain.single.mockResolvedValue({ data: null, error: null });

      const svc = new QuotaService();
      const result = await svc.checkQuota("tenant1", "unknown_key");

      expect(result.allowed).toBe(true);
    });
  });

  describe("requireQuota", () => {
    it("throws QuotaExceededError when quota exceeded", async () => {
      mockChain.single.mockResolvedValue({
        data: { used: 10, limit: 5 },
        error: null,
      });

      const svc = new QuotaService();
      await expect(svc.requireQuota("tenant1", "max_exports")).rejects.toThrow(QuotaExceededError);
    });

    it("does not throw when quota available", async () => {
      mockChain.single.mockResolvedValue({
        data: { used: 3, limit: 10 },
        error: null,
      });

      const svc = new QuotaService();
      await expect(svc.requireQuota("tenant1", "max_exports")).resolves.toBeUndefined();
    });
  });

  describe("QuotaExceededError", () => {
    it("creates error with correct message", () => {
      const err = new QuotaExceededError("max_exports", 10);
      expect(err.message).toContain("max_exports");
      expect(err.message).toContain("10");
      expect(err.name).toBe("QuotaExceededError");
      expect(err.quotaKey).toBe("max_exports");
      expect(err.limit).toBe(10);
    });
  });
});
