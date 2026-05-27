export enum PlanTier {
  FREE_TRIAL = "free_trial",
  STARTER = "starter",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
  TRIAL = "trial",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  EXPIRED = "expired",
}

export enum ExportFormat {
  EXCEL = "excel",
  PDF = "pdf",
  CSV = "csv",
}

export enum DashboardVisibility {
  PRIVATE = "private",
  INTERNAL = "internal",
  PUBLIC = "public",
  ROLE_RESTRICTED = "role_restricted",
}

export enum TenantStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CANCELLED = "cancelled",
  DELETED = "deleted",
}

export enum SubscriptionInterval {
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export enum ExportStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum AuditAction {
  LOGIN = "user.login",
  LOGOUT = "user.logout",
  USER_INVITED = "user.invited",
  USER_REMOVED = "user.removed",
  DASHBOARD_CREATED = "dashboard.created",
  DASHBOARD_UPDATED = "dashboard.updated",
  DASHBOARD_DELETED = "dashboard.deleted",
  DASHBOARD_SHARED = "dashboard.shared",
  EXPORT_COMPLETED = "export.completed",
  EXPORT_FAILED = "export.failed",
  EXPORT_DOWNLOADED = "export.downloaded",
  ROLE_ASSIGNED = "role.assigned",
  ROLE_REMOVED = "role.removed",
  SUBSCRIPTION_UPGRADED = "subscription.upgraded",
  SUBSCRIPTION_DOWNGRADED = "subscription.downgraded",
  SUBSCRIPTION_CANCELED = "subscription.canceled",
  SYNC_STARTED = "sync.started",
  SYNC_COMPLETED = "sync.completed",
  SYNC_FAILED = "sync.failed",
  TENANT_CREATED = "tenant.created",
  TENANT_SUSPENDED = "tenant.suspended",
}

export enum QuotaType {
  MAX_EXPORTS = "max_exports",
  MAX_DASHBOARDS = "max_dashboards",
  MAX_WIDGETS_PER_DASHBOARD = "max_widgets_per_dashboard",
  MAX_USERS = "max_users",
  MAX_RESPONSES_SYNCED = "max_responses_synced",
  DATA_RETENTION_DAYS = "data_retention_days",
}
