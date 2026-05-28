import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeatureFlagService } from "../FeatureFlagService";

const mockGetCurrentSubscription = vi.hoisted(() => vi.fn());

type DataResult = { data: unknown; error: null };
let queryResult: DataResult = { data: null, error: null };
let queryIdx = 0;
const queryResults: DataResult[] = [];

type MockChain = {
  then: (resolve: (v: DataResult) => void) => void;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function chain(): MockChain {
  const c = {
    then: (resolve: (v: DataResult) => void) => {
      const r = queryResults[queryIdx] ?? queryResult;
      queryIdx++;
      resolve(r);
    },
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  };
  c.select.mockReturnValue(c);
  c.eq.mockReturnValue(c);
  c.order.mockReturnValue(c);
  c.update.mockReturnValue(c);
  c.insert.mockReturnValue(c);
  c.single.mockImplementation(() => c);
  c.maybeSingle.mockImplementation(() => c);
  c.delete.mockReturnValue(c);
  return c;
}

let c: ReturnType<typeof chain>;

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdmin: () => ({ from: vi.fn(() => c) }),
}));

vi.mock("../SubscriptionService", () => ({
  SubscriptionService: class {
    getCurrentSubscription = mockGetCurrentSubscription;
  },
}));

beforeEach(() => {
  c = chain();
  queryIdx = 0;
  queryResults.length = 0;
  queryResult = { data: null, error: null };
});

describe("FeatureFlagService", () => {
  describe("isEnabled", () => {
    it("returns tenant override when set", async () => {
      queryResults.push(
        { data: { id: "flag1", enabled: true }, error: null },
        { data: { enabled: false }, error: null },
      );

      const ff = new FeatureFlagService();
      const result = await ff.isEnabled("pdf_exports", "tenant1");

      expect(result).toBe(false);
    });

    it("checks plan feature when no override", async () => {
      queryResults.push(
        { data: { id: "flag1", enabled: true }, error: null },
        { data: null, error: null },
        { data: { enabled: true }, error: null },
      );

      mockGetCurrentSubscription.mockResolvedValue({ planId: "plan1", planSlug: "pro", status: "active" });

      const ff = new FeatureFlagService();
      const result = await ff.isEnabled("pdf_exports", "tenant1");

      expect(result).toBe(true);
    });

    it("falls back to global flag", async () => {
      queryResult = { data: { enabled: true }, error: null };
      mockGetCurrentSubscription.mockResolvedValue(null);

      const ff = new FeatureFlagService();
      const result = await ff.isEnabled("pdf_exports", "tenant1");

      expect(result).toBe(true);
    });

    it("returns false when flag not found", async () => {
      queryResult = { data: null, error: null };

      const ff = new FeatureFlagService();
      const result = await ff.isEnabled("nonexistent");

      expect(result).toBe(false);
    });

    it("returns false when global flag is disabled", async () => {
      queryResult = { data: { enabled: false }, error: null };

      const ff = new FeatureFlagService();
      const result = await ff.isEnabled("flag_disabled");

      expect(result).toBe(false);
    });
  });

  describe("setOverride", () => {
    it("creates override when none exists", async () => {
      queryResults.push(
        { data: { id: "flag1" }, error: null },
        { data: null, error: null },
      );

      const ff = new FeatureFlagService();
      await ff.setOverride("pdf_exports", "tenant1", true);

      expect(c.insert).toHaveBeenCalled();
    });

    it("updates existing override", async () => {
      queryResults.push(
        { data: { id: "flag1" }, error: null },
        { data: { id: "override1" }, error: null },
      );

      const ff = new FeatureFlagService();
      await ff.setOverride("pdf_exports", "tenant1", true);

      expect(c.update).toHaveBeenCalled();
    });

    it("throws when flag not found", async () => {
      queryResult = { data: null, error: null };

      const ff = new FeatureFlagService();
      await expect(ff.setOverride("nonexistent", "tenant1", true)).rejects.toThrow("Feature flag not found");
    });
  });

  describe("removeOverride", () => {
    it("removes existing override", async () => {
      queryResult = { data: { id: "flag1" }, error: null };

      const ff = new FeatureFlagService();
      await ff.removeOverride("pdf_exports", "tenant1");

      expect(c.delete).toHaveBeenCalled();
    });

    it("throws when flag not found", async () => {
      queryResult = { data: null, error: null };

      const ff = new FeatureFlagService();
      await expect(ff.removeOverride("nonexistent", "tenant1")).rejects.toThrow("Feature flag not found");
    });
  });
});
