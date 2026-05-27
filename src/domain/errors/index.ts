export class DomainError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super("INVALID_EMAIL", `Invalid email address: ${email}`);
  }
}

export class InvalidDateRangeError extends DomainError {
  constructor(start: Date, end: Date) {
    super("INVALID_DATE_RANGE", `Start date (${start}) must be before end date (${end})`);
  }
}

export class InvalidQuotaValueError extends DomainError {
  constructor(value: number, quotaType: string) {
    super("INVALID_QUOTA_VALUE", `Invalid quota value ${value} for ${quotaType}`);
  }
}

export class InvalidPermissionSlugError extends DomainError {
  constructor(slug: string) {
    super("INVALID_PERMISSION_SLUG", `Invalid permission slug: ${slug}`);
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super("ENTITY_NOT_FOUND", `${entity} with id ${id} not found`);
  }
}

export class TenantNotActiveError extends DomainError {
  constructor(tenantId: string) {
    super("TENANT_NOT_ACTIVE", `Tenant ${tenantId} is not active`);
  }
}

export class SubscriptionExpiredError extends DomainError {
  constructor(tenantId: string) {
    super("SUBSCRIPTION_EXPIRED", `Subscription expired for tenant ${tenantId}`);
  }
}

export class QuotaExceededError extends DomainError {
  constructor(quotaType: string, current: number, limit: number) {
    super("QUOTA_EXCEEDED", `Quota exceeded for ${quotaType}: ${current}/${limit}`);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(permission: string) {
    super("FORBIDDEN", `Missing required permission: ${permission}`);
  }
}
