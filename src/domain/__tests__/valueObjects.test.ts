import { describe, it, expect } from "vitest";
import { Email, DateRange, Quota, PermissionSlug } from "../valueObjects";
import { InvalidEmailError, InvalidDateRangeError, InvalidQuotaValueError, InvalidPermissionSlugError } from "../errors";

describe("Email", () => {
  it("creates a valid email", () => {
    const email = Email.create("Test@Example.com");
    expect(email.value).toBe("test@example.com");
  });

  it("throws on invalid email", () => {
    expect(() => Email.create("invalid")).toThrow(InvalidEmailError);
  });

  it("compares equality", () => {
    const a = Email.create("a@b.com");
    const b = Email.create("a@b.com");
    const c = Email.create("c@d.com");
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe("DateRange", () => {
  it("creates a valid date range", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-12-31");
    const range = DateRange.create(start, end);
    expect(range.daysBetween()).toBe(365);
  });

  it("throws when start >= end", () => {
    const start = new Date("2024-12-31");
    const end = new Date("2024-01-01");
    expect(() => DateRange.create(start, end)).toThrow(InvalidDateRangeError);
  });

  it("checks if a date is contained", () => {
    const range = DateRange.create(new Date("2024-01-01"), new Date("2024-12-31"));
    expect(range.contains(new Date("2024-06-15"))).toBe(true);
    expect(range.contains(new Date("2025-01-01"))).toBe(false);
  });
});

describe("Quota", () => {
  it("creates a limited quota", () => {
    const q = Quota.create("max_exports", 100);
    expect(q.value).toBe(100);
    expect(q.isUnlimited).toBe(false);
  });

  it("creates an unlimited quota", () => {
    const q = Quota.create("max_exports", -1);
    expect(q.isUnlimited).toBe(true);
  });

  it("checks availability", () => {
    const q = Quota.create("max_exports", 10);
    expect(q.hasAvailable(5)).toBe(true);
    expect(q.hasAvailable(10)).toBe(false);
    expect(q.remaining(5)).toBe(5);
    expect(q.remaining(15)).toBe(0);
  });

  it("unlimited always has availability", () => {
    const q = Quota.create("max_exports", -1);
    expect(q.hasAvailable(999999)).toBe(true);
    expect(q.remaining(999999)).toBe(Infinity);
  });

  it("throws on invalid values", () => {
    expect(() => Quota.create("x", 0)).toThrow(InvalidQuotaValueError);
  });
});

describe("PermissionSlug", () => {
  it("creates a valid slug", () => {
    const slug = PermissionSlug.create("dashboard.read");
    expect(slug.resource).toBe("dashboard");
    expect(slug.action).toBe("read");
  });

  it("creates a slug with sub-action", () => {
    const slug = PermissionSlug.create("dashboard.share.internal");
    expect(slug.value).toBe("dashboard.share.internal");
  });

  it("throws on invalid slug", () => {
    expect(() => PermissionSlug.create("InvalidSlug")).toThrow(InvalidPermissionSlugError);
    expect(() => PermissionSlug.create("no")).toThrow(InvalidPermissionSlugError);
  });
});
