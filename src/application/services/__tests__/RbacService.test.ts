import { describe, it, expect, vi, beforeEach } from "vitest";
import { RbacService } from "../RbacService";

type DataResult = { data: unknown; error: null };
let queryResult: DataResult = { data: null, error: null };
let queryIdx = 0;
const queryResults: DataResult[] = [];

function chain() {
  const c: any = {
    then: (resolve: (v: DataResult) => void) => {
      const r = queryResults[queryIdx] ?? queryResult;
      queryIdx++;
      resolve(r);
    },
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    limit: vi.fn(),
  };
  c.select.mockReturnValue(c);
  c.eq.mockReturnValue(c);
  c["in"] = vi.fn().mockReturnValue(c);
  c.order.mockReturnValue(c);
  c.limit.mockReturnValue(c);
  c.single.mockReturnValue(c);
  c.maybeSingle.mockReturnValue(c);
  return c;
}

let c: ReturnType<typeof chain>;

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdmin: () => ({ from: vi.fn(() => c) }),
}));
vi.mock("@/lib/cloudflare/bindings", () => ({
  getBindings: vi.fn(() => ({
    KV_CACHE: { get: vi.fn(async () => null), put: vi.fn(), delete: vi.fn() },
  })),
}));

function setup(...results: DataResult[]) {
  queryIdx = 0;
  queryResults.length = 0;
  queryResults.push(...results);
}

beforeEach(() => {
  c = chain();
  queryIdx = 0;
  queryResults.length = 0;
  queryResult = { data: null, error: null };
});

describe("RbacService", () => {
  describe("hasPermission", () => {
    it("returns true when permission is found in role", async () => {
      setup(
        { data: [{ role_id: "r1" }], error: null },
        { data: [{ permission_id: "p1" }], error: null },
        { data: [{ slug: "dashboard.read" }, { slug: "reports.view" }], error: null },
      );
      const svc = new RbacService();
      const result = await svc.hasPermission("user1", "tenant1", "dashboard.read");
      expect(result).toBe(true);
    });

    it("returns false when permission is not found", async () => {
      setup(
        { data: [{ role_id: "r1" }], error: null },
        { data: [{ permission_id: "p1" }], error: null },
        { data: [{ slug: "some.other.perm" }], error: null },
      );
      const svc = new RbacService();
      const result = await svc.hasPermission("user1", "tenant1", "dashboard.read");
      expect(result).toBe(false);
    });

    it("returns false when user has no roles", async () => {
      setup({ data: [], error: null });
      const svc = new RbacService();
      const result = await svc.hasPermission("user1", "tenant1", "dashboard.read");
      expect(result).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("returns true when all permissions are present", async () => {
      setup(
        { data: [{ role_id: "r1" }], error: null },
        { data: [{ permission_id: "p1" }, { permission_id: "p2" }], error: null },
        { data: [{ slug: "dashboard.read" }, { slug: "dashboard.create" }], error: null },
      );
      const svc = new RbacService();
      const r = await svc.hasAllPermissions("user1", "tenant1", ["dashboard.read", "dashboard.create"]);
      expect(r).toBe(true);
    });

    it("returns false when any permission is missing", async () => {
      setup(
        { data: [{ role_id: "r1" }], error: null },
        { data: [{ permission_id: "p1" }], error: null },
        { data: [{ slug: "dashboard.read" }], error: null },
      );
      const svc = new RbacService();
      const r = await svc.hasAllPermissions("user1", "tenant1", ["dashboard.read", "dashboard.delete"]);
      expect(r).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true when at least one permission is present", async () => {
      setup(
        { data: [{ role_id: "r1" }], error: null },
        { data: [{ permission_id: "p1" }], error: null },
        { data: [{ slug: "dashboard.read" }], error: null },
      );
      const svc = new RbacService();
      const r = await svc.hasAnyPermission("user1", "tenant1", ["dashboard.delete", "dashboard.read"]);
      expect(r).toBe(true);
    });

    it("returns false when no permissions match", async () => {
      setup(
        { data: [{ role_id: "r1" }], error: null },
        { data: [{ permission_id: "p1" }], error: null },
        { data: [{ slug: "reports.view" }], error: null },
      );
      const svc = new RbacService();
      const r = await svc.hasAnyPermission("user1", "tenant1", ["dashboard.delete", "dashboard.read"]);
      expect(r).toBe(false);
    });
  });
});
