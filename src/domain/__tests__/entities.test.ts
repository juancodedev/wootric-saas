import { describe, it, expect } from "vitest";
import {
  Tenant,
  Subscription,
  UsageQuota,
  Dashboard,
} from "../entities";
import {
  TenantStatus,
  SubscriptionStatus,
  DashboardVisibility,
  QuotaType,
} from "../enums";
import { TenantNotActiveError, SubscriptionExpiredError, QuotaExceededError } from "../errors";

const now = new Date();
const future = new Date(Date.now() + 86400000);

describe("Tenant", () => {
  it("creates an active tenant", () => {
    const t = new Tenant("t1", "Acme", "acme", "acme.wootric.com", TenantStatus.ACTIVE, undefined, now, now);
    expect(t.status).toBe(TenantStatus.ACTIVE);
  });

  it("can be suspended", () => {
    const t = new Tenant("t1", "Acme", "acme", undefined, TenantStatus.ACTIVE, undefined, now, now);
    t.suspend();
    expect(t.status).toBe(TenantStatus.SUSPENDED);
  });

  it("throws when ensuring active on suspended tenant", () => {
    const t = new Tenant("t1", "Acme", "acme", undefined, TenantStatus.SUSPENDED, undefined, now, now);
    expect(() => t.ensureActive()).toThrow(TenantNotActiveError);
  });
});

describe("Subscription", () => {
  it("detects trial expiration", () => {
    const expired = new Date(Date.now() - 86400000);
    const s = new Subscription(
      "s1", "t1", "p1", SubscriptionStatus.TRIAL,
      now, expired, undefined, undefined,
      undefined, undefined, undefined, now, now,
    );
    expect(s.isTrialExpired).toBe(true);
    expect(() => s.ensureActive()).toThrow(SubscriptionExpiredError);
  });

  it("active subscription passes validation", () => {
    const s = new Subscription(
      "s1", "t1", "p1", SubscriptionStatus.ACTIVE,
      undefined, undefined, now, future,
      undefined, undefined, undefined, now, now,
    );
    expect(() => s.ensureActive()).not.toThrow();
  });

  it("can be canceled", () => {
    const s = new Subscription(
      "s1", "t1", "p1", SubscriptionStatus.ACTIVE,
      undefined, undefined, now, future,
      undefined, undefined, undefined, now, now,
    );
    s.cancel();
    expect(s.status).toBe(SubscriptionStatus.CANCELED);
    expect(s.canceledAt).toBeDefined();
  });

  it("trial days remaining works", () => {
    const trialEnd = new Date(Date.now() + 3 * 86400000);
    const s = new Subscription(
      "s1", "t1", "p1", SubscriptionStatus.TRIAL,
      now, trialEnd, undefined, undefined,
      undefined, undefined, undefined, now, now,
    );
    expect(s.trialDaysRemaining).toBe(3);
  });
});

describe("UsageQuota", () => {
  it("tracks usage correctly", () => {
    const q = new UsageQuota("q1", "t1", QuotaType.MAX_EXPORTS, 0, 10, undefined, now, now);
    expect(q.available).toBe(10);
    expect(q.isExceeded).toBe(false);
  });

  it("increments usage", () => {
    const q = new UsageQuota("q1", "t1", QuotaType.MAX_EXPORTS, 0, 10, undefined, now, now);
    q.increment(3);
    expect(q.used).toBe(3);
  });

  it("throws when quota exceeded", () => {
    const q = new UsageQuota("q1", "t1", QuotaType.MAX_EXPORTS, 10, 10, undefined, now, now);
    expect(() => q.increment()).toThrow(QuotaExceededError);
  });

  it("unlimited quota never exceeds", () => {
    const q = new UsageQuota("q1", "t1", QuotaType.MAX_EXPORTS, 999, -1, undefined, now, now);
    expect(q.isExceeded).toBe(false);
    q.increment();
    expect(q.used).toBe(1000);
  });

  it("resets usage", () => {
    const q = new UsageQuota("q1", "t1", QuotaType.MAX_EXPORTS, 8, 10, undefined, now, now);
    q.reset();
    expect(q.used).toBe(0);
  });
});

describe("Dashboard", () => {
  it("creates a private dashboard", () => {
    const d = new Dashboard(
      "d1", "t1", "u1", "My Dashboard", undefined,
      DashboardVisibility.PRIVATE, undefined, false, now, now, undefined,
    );
    expect(d.visibility).toBe(DashboardVisibility.PRIVATE);
    expect(d.isDeleted).toBe(false);
  });

  it("supports soft delete", () => {
    const d = new Dashboard(
      "d1", "t1", "u1", "My Dashboard", undefined,
      DashboardVisibility.PRIVATE, undefined, false, now, now, undefined,
    );
    d.delete();
    expect(d.isDeleted).toBe(true);
    expect(d.deletedAt).toBeDefined();
  });

  it("can change visibility", () => {
    const d = new Dashboard(
      "d1", "t1", "u1", "My Dashboard", undefined,
      DashboardVisibility.PRIVATE, undefined, false, now, now, undefined,
    );
    d.changeVisibility(DashboardVisibility.PUBLIC);
    expect(d.visibility).toBe(DashboardVisibility.PUBLIC);
  });
});
