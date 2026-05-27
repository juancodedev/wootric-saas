import { Email, PermissionSlug } from "../valueObjects";
import {
  PlanTier,
  SubscriptionStatus,
  ExportFormat,
  DashboardVisibility,
  TenantStatus,
  ExportStatus,
  AuditAction,
  QuotaType,
} from "../enums";
import { TenantNotActiveError, SubscriptionExpiredError, QuotaExceededError } from "../errors";

export class Tenant {
  constructor(
    public readonly id: string,
    public name: string,
    public slug: string,
    public domain: string | undefined,
    public status: TenantStatus = TenantStatus.ACTIVE,
    public logoUrl: string | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  activate(): void {
    this.status = TenantStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  suspend(): void {
    this.status = TenantStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  ensureActive(): void {
    if (this.status !== TenantStatus.ACTIVE) {
      throw new TenantNotActiveError(this.id);
    }
  }
}

export class User {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public email: string,
    public name: string,
    public avatarUrl: string | undefined,
    public isActive: boolean = true,
    public lastLoginAt: Date | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.email = Email.create(email).value;
  }

  login(): void {
    this.lastLoginAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }
}

export class Plan {
  constructor(
    public readonly id: string,
    public name: string,
    public slug: string,
    public description: string | undefined,
    public readonly tier: PlanTier,
    public priceMonthly: number,
    public priceYearly: number,
    public currency: string,
    public isActive: boolean,
    public sortOrder: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  get priceMonthlyFormatted(): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: this.currency }).format(
      this.priceMonthly / 100,
    );
  }

  get priceYearlyFormatted(): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: this.currency }).format(
      this.priceYearly / 100,
    );
  }

  get isFree(): boolean {
    return this.priceMonthly === 0 && this.priceYearly === 0;
  }
}

export class Feature {
  constructor(
    public readonly id: string,
    public readonly key: string,
    public name: string,
    public description: string | undefined,
    public enabled: boolean = false,
    public isPublic: boolean = false,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}
}

export class Role {
  constructor(
    public readonly id: string,
    public name: string,
    public slug: string,
    public description: string | undefined,
    public isSystem: boolean = false,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}
}

export class Permission {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly slug: PermissionSlug,
    public description: string | undefined,
    public readonly group: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.slug = slug instanceof PermissionSlug ? slug : PermissionSlug.create(slug);
  }

  get resource(): string {
    return this.slug.resource;
  }

  get action(): string {
    return this.slug.action;
  }
}

export class UserRole {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly roleId: string,
    public readonly tenantId: string,
    public readonly createdAt: Date,
  ) {}
}

export class Subscription {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly planId: string,
    public status: SubscriptionStatus,
    public trialStartAt: Date | undefined,
    public trialEndAt: Date | undefined,
    public currentPeriodStart: Date | undefined,
    public currentPeriodEnd: Date | undefined,
    public canceledAt: Date | undefined,
    public stripeSubscriptionId: string | undefined,
    public stripeCustomerId: string | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  get isTrial(): boolean {
    return this.status === SubscriptionStatus.TRIAL;
  }

  get isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE || this.isTrial;
  }

  get isExpired(): boolean {
    return this.status === SubscriptionStatus.EXPIRED;
  }

  get trialDaysRemaining(): number {
    if (!this.trialEndAt) return 0;
    return Math.max(0, Math.floor((this.trialEndAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  get isTrialExpired(): boolean {
    if (!this.trialEndAt) return false;
    return Date.now() >= this.trialEndAt.getTime();
  }

  activate(): void {
    this.status = SubscriptionStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  cancel(): void {
    this.status = SubscriptionStatus.CANCELED;
    this.canceledAt = new Date();
    this.updatedAt = new Date();
  }

  expire(): void {
    this.status = SubscriptionStatus.EXPIRED;
    this.updatedAt = new Date();
  }

  ensureActive(): void {
    if (this.isTrialExpired) {
      this.expire();
      throw new SubscriptionExpiredError(this.tenantId);
    }
    if (!this.isActive) {
      throw new SubscriptionExpiredError(this.tenantId);
    }
  }
}

export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | undefined,
    public readonly action: AuditAction,
    public readonly entityType: string | undefined,
    public readonly entityId: string | undefined,
    public readonly metadata: Record<string, unknown> | undefined,
    public readonly ipAddress: string | undefined,
    public readonly userAgent: string | undefined,
    public readonly createdAt: Date,
  ) {}
}

export class ExportHistory {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | undefined,
    public readonly format: ExportFormat,
    public status: ExportStatus,
    public fileName: string | undefined,
    public fileSize: number | undefined,
    public recordCount: number | undefined,
    public durationMs: number | undefined,
    public r2Key: string | undefined,
    public errorMessage: string | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  complete(fileName: string, fileSize: number, recordCount: number, durationMs: number, r2Key: string): void {
    this.status = ExportStatus.COMPLETED;
    this.fileName = fileName;
    this.fileSize = fileSize;
    this.recordCount = recordCount;
    this.durationMs = durationMs;
    this.r2Key = r2Key;
    this.updatedAt = new Date();
  }

  fail(error: string): void {
    this.status = ExportStatus.FAILED;
    this.errorMessage = error;
    this.updatedAt = new Date();
  }
}

export class UsageQuota {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly quotaKey: QuotaType,
    public used: number,
    public readonly limit: number,
    public resetAt: Date | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  get available(): number {
    if (this.limit === -1) return Infinity;
    return Math.max(0, this.limit - this.used);
  }

  get isExceeded(): boolean {
    if (this.limit === -1) return false;
    return this.used >= this.limit;
  }

  increment(amount: number = 1): void {
    if (this.isExceeded && this.limit !== -1) {
      throw new QuotaExceededError(this.quotaKey, this.used, this.limit);
    }
    this.used += amount;
    this.updatedAt = new Date();
  }

  decrement(amount: number = 1): void {
    this.used = Math.max(0, this.used - amount);
    this.updatedAt = new Date();
  }

  reset(): void {
    this.used = 0;
    this.updatedAt = new Date();
  }
}

export class Dashboard {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | undefined,
    public name: string,
    public description: string | undefined,
    public visibility: DashboardVisibility = DashboardVisibility.PRIVATE,
    public layout: Record<string, unknown> | undefined,
    public isDefault: boolean = false,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | undefined,
  ) {}

  delete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  restore(): void {
    this.deletedAt = undefined;
    this.updatedAt = new Date();
  }

  get isDeleted(): boolean {
    return this.deletedAt !== undefined;
  }

  changeVisibility(visibility: DashboardVisibility): void {
    this.visibility = visibility;
    this.updatedAt = new Date();
  }
}

export class DashboardWidget {
  constructor(
    public readonly id: string,
    public readonly dashboardId: string,
    public widgetType: string,
    public title: string,
    public config: Record<string, unknown>,
    public position: { x: number; y: number; w: number; h: number } | undefined,
    public sortOrder: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}
}

export class Report {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | undefined,
    public name: string,
    public description: string | undefined,
    public reportType: string,
    public config: Record<string, unknown>,
    public isScheduled: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | undefined,
  ) {}

  delete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  get isDeleted(): boolean {
    return this.deletedAt !== undefined;
  }
}

export class ReportDownload {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | undefined,
    public readonly exportHistoryId: string | undefined,
    public readonly reportId: string | undefined,
    public readonly format: ExportFormat,
    public readonly ipAddress: string | undefined,
    public readonly createdAt: Date,
  ) {}
}
