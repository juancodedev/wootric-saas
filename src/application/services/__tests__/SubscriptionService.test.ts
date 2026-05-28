import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionService } from "../SubscriptionService";

type DataResult = { data: unknown; error: null };
let queryResult: DataResult = { data: null, error: null };
let queryIdx = 0;
const queryResults: DataResult[] = [];

type MockChain = {
  then: (resolve: (v: DataResult) => void) => void;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function c(): MockChain {
  const result: MockChain = {
    then: (resolve: (v: DataResult) => void) => {
      const r = queryResults[queryIdx] ?? queryResult;
      queryIdx++;
      resolve(r);
    },
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  };
  result.select.mockReturnValue(result);
  result.eq.mockReturnValue(result);
  result.order.mockReturnValue(result);
  result.limit.mockReturnValue(result);
  result.single.mockReturnValue(result);
  result.update.mockReturnValue(result);
  result.insert.mockReturnValue(result);
  return result;
}

let chain: MockChain;

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdmin: () => ({ from: vi.fn(() => chain) }),
}));

beforeEach(() => {
  chain = c();
  queryIdx = 0;
  queryResults.length = 0;
  queryResult = { data: null, error: null };
});

describe("SubscriptionService", () => {
  describe("getCurrentSubscription", () => {
    it("returns subscription info when found", async () => {
      const plan = { id: "plan1", slug: "pro", name: "Pro", tier: "pro" };
      queryResult = {
        data: { id: "sub1", tenant_id: "tenant1", plan_id: "plan1", plans: plan,
                status: "active", trial_end_at: null, current_period_end: "2026-06-01T00:00:00Z",
                billing_interval: "monthly" },
        error: null,
      };

      const svc = new SubscriptionService();
      const result = await svc.getCurrentSubscription("tenant1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("sub1");
      expect(result!.planSlug).toBe("pro");
      expect(result!.status).toBe("active");
    });

    it("returns null when no subscription exists", async () => {
      queryResult = { data: null, error: null };

      const svc = new SubscriptionService();
      const result = await svc.getCurrentSubscription("tenant1");

      expect(result).toBeNull();
    });
  });

  describe("listAvailablePlans", () => {
    it("returns available plans", async () => {
      queryResult = {
        data: [
          { id: "plan1", name: "Starter", slug: "starter",
            description: "For small teams", tier: "starter",
            price_monthly: 2900, price_yearly: 29000, sort_order: 1 },
          { id: "plan2", name: "Pro", slug: "pro",
            description: "For growing teams", tier: "pro",
            price_monthly: 9900, price_yearly: 99000, sort_order: 2 },
        ],
        error: null,
      };

      const svc = new SubscriptionService();
      const plans = await svc.listAvailablePlans();

      expect(plans).toHaveLength(2);
      expect(plans[0]!.slug).toBe("starter");
      expect(plans[1]!.slug).toBe("pro");
    });

    it("returns empty array when no plans", async () => {
      queryResult = { data: [], error: null };

      const svc = new SubscriptionService();
      const plans = await svc.listAvailablePlans();

      expect(plans).toEqual([]);
    });
  });

  describe("getPlanBySlug", () => {
    it("returns plan by slug", async () => {
      queryResult = {
        data: [{ id: "plan1", name: "Pro", slug: "pro", description: null, tier: "pro",
                 price_monthly: 9900, price_yearly: 99000, sort_order: 2 }],
        error: null,
      };

      const svc = new SubscriptionService();
      const plan = await svc.getPlanBySlug("pro");

      expect(plan).not.toBeNull();
      expect(plan!.name).toBe("Pro");
    });

    it("returns null for unknown slug", async () => {
      queryResult = { data: [], error: null };

      const svc = new SubscriptionService();
      const plan = await svc.getPlanBySlug("unknown");

      expect(plan).toBeNull();
    });
  });

  describe("changePlan", () => {
    it("changes plan successfully", async () => {
      queryResults.push({ data: { id: "plan2" }, error: null });

      const svc = new SubscriptionService();
      await expect(svc.changePlan("tenant1", "pro")).resolves.toBeUndefined();

      expect(chain.update).toHaveBeenCalled();
      expect(chain.insert).toHaveBeenCalled();
    });

    it("throws when plan not found", async () => {
      queryResults.push({ data: null, error: null });

      const svc = new SubscriptionService();
      await expect(svc.changePlan("tenant1", "nonexistent")).rejects.toThrow("Plan not found");
    });
  });
});
