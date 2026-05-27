import { InvalidEmailError, InvalidDateRangeError, InvalidQuotaValueError, InvalidPermissionSlugError } from "../errors";

export class Email {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new InvalidEmailError(value);
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

export class DateRange {
  private constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {
    Object.freeze(this);
  }

  static create(start: Date, end: Date): DateRange {
    if (start >= end) {
      throw new InvalidDateRangeError(start, end);
    }
    return new DateRange(start, end);
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  daysBetween(): number {
    return Math.floor((this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export class Quota {
  private constructor(
    public readonly key: string,
    public readonly value: number,
  ) {
    Object.freeze(this);
  }

  static create(key: string, value: number): Quota {
    if (value < -1 || value === 0) {
      throw new InvalidQuotaValueError(value, key);
    }
    return new Quota(key, value);
  }

  get isUnlimited(): boolean {
    return this.value === -1;
  }

  hasAvailable(used: number): boolean {
    if (this.isUnlimited) return true;
    return used < this.value;
  }

  remaining(used: number): number {
    if (this.isUnlimited) return Infinity;
    return Math.max(0, this.value - used);
  }
}

export class PermissionSlug {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): PermissionSlug {
    const slugRegex = /^[a-z]+\.[a-z]+(\.[a-z]+)?$/;
    if (!slugRegex.test(value)) {
      throw new InvalidPermissionSlugError(value);
    }
    return new PermissionSlug(value);
  }

  get resource(): string {
    return this.value.split(".")[0] ?? "";
  }

  get action(): string {
    return this.value.split(".")[1] ?? "";
  }

  equals(other: PermissionSlug): boolean {
    return this.value === other.value;
  }
}
