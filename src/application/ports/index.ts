import type {
  Tenant,
  User,
  Plan,
  Feature,
  Role,
  Permission,
  UserRole,
  Subscription,
  AuditLog,
  ExportHistory,
  UsageQuota,
  Dashboard,
  DashboardWidget,
  Report,
  ReportDownload,
} from "@/domain/entities";
import type { ExportFormat, QuotaType } from "@/domain/enums";

// ─── Repository Types ───────────────────────────────────────────────────────

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DateRangeFilter {
  start?: Date;
  end?: Date;
}

// ─── Tenant Repository ──────────────────────────────────────────────────────

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findByDomain(domain: string): Promise<Tenant | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResult<Tenant>>;
  save(tenant: Tenant): Promise<void>;
  update(tenant: Tenant): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── User Repository ────────────────────────────────────────────────────────

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  findByTenant(tenantId: string, params?: PaginationParams): Promise<PaginatedResult<User>>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Plan Repository ────────────────────────────────────────────────────────

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findBySlug(slug: string): Promise<Plan | null>;
  findAllActive(): Promise<Plan[]>;
  findAll(params?: PaginationParams): Promise<PaginatedResult<Plan>>;
  save(plan: Plan): Promise<void>;
  update(plan: Plan): Promise<void>;
}

// ─── Feature Repository ─────────────────────────────────────────────────────

export interface IFeatureRepository {
  findById(id: string): Promise<Feature | null>;
  findByKey(key: string): Promise<Feature | null>;
  findAll(): Promise<Feature[]>;
  findByPlan(planId: string): Promise<Feature[]>;
  save(feature: Feature): Promise<void>;
  update(feature: Feature): Promise<void>;
}

// ─── Role Repository ────────────────────────────────────────────────────────

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findBySlug(slug: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  save(role: Role): Promise<void>;
  update(role: Role): Promise<void>;
  delete(id: string): Promise<void>;
  findPermissionsByRoleId(roleId: string): Promise<Permission[]>;
  assignPermission(roleId: string, permissionId: string): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
}

// ─── Permission Repository ──────────────────────────────────────────────────

export interface IPermissionRepository {
  findById(id: string): Promise<Permission | null>;
  findBySlug(slug: string): Promise<Permission | null>;
  findAll(): Promise<Permission[]>;
  findByGroup(group: string): Promise<Permission[]>;
  findByRole(roleId: string): Promise<Permission[]>;
  findByPlan(planId: string): Promise<Permission[]>;
  findByUser(userId: string, tenantId: string): Promise<Permission[]>;
  save(permission: Permission): Promise<void>;
  update(permission: Permission): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Subscription Repository ────────────────────────────────────────────────

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByTenant(tenantId: string): Promise<Subscription | null>;
  findByStripeSubscriptionId(stripeId: string): Promise<Subscription | null>;
  findAllActive(): Promise<Subscription[]>;
  findAllExpiredTrials(): Promise<Subscription[]>;
  save(subscription: Subscription): Promise<void>;
  update(subscription: Subscription): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Audit Log Repository ───────────────────────────────────────────────────

export interface IAuditLogRepository {
  findById(id: string): Promise<AuditLog | null>;
  findByTenant(
    tenantId: string,
    params?: { action?: string; dateRange?: DateRangeFilter } & PaginationParams,
  ): Promise<PaginatedResult<AuditLog>>;
  save(log: AuditLog): Promise<void>;
  deleteOlderThan(date: Date): Promise<number>;
}

// ─── Export History Repository ──────────────────────────────────────────────

export interface IExportRepository {
  findById(id: string): Promise<ExportHistory | null>;
  findByTenant(
    tenantId: string,
    params?: { status?: string; format?: ExportFormat } & PaginationParams,
  ): Promise<PaginatedResult<ExportHistory>>;
  findByUser(userId: string, params?: PaginationParams): Promise<PaginatedResult<ExportHistory>>;
  countByTenant(tenantId: string, dateRange?: DateRangeFilter): Promise<number>;
  save(exportHistory: ExportHistory): Promise<void>;
  update(exportHistory: ExportHistory): Promise<void>;
}

// ─── Quota Repository ───────────────────────────────────────────────────────

export interface IQuotaRepository {
  findById(id: string): Promise<UsageQuota | null>;
  findByTenantAndKey(tenantId: string, quotaKey: QuotaType): Promise<UsageQuota | null>;
  findByTenant(tenantId: string): Promise<UsageQuota[]>;
  save(quota: UsageQuota): Promise<void>;
  update(quota: UsageQuota): Promise<void>;
  saveHistory(entry: {
    tenantId: string;
    quotaKey: string;
    delta: number;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

// ─── Dashboard Repository ───────────────────────────────────────────────────

export interface IDashboardRepository {
  findById(id: string): Promise<Dashboard | null>;
  findByTenant(
    tenantId: string,
    params?: { visibility?: string; includeDeleted?: boolean } & PaginationParams,
  ): Promise<PaginatedResult<Dashboard>>;
  findSharedWithUser(userId: string, tenantId: string): Promise<Dashboard[]>;
  countByTenant(tenantId: string): Promise<number>;
  save(dashboard: Dashboard): Promise<void>;
  update(dashboard: Dashboard): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Dashboard Widget Repository ────────────────────────────────────────────

export interface IDashboardWidgetRepository {
  findById(id: string): Promise<DashboardWidget | null>;
  findByDashboard(dashboardId: string): Promise<DashboardWidget[]>;
  save(widget: DashboardWidget): Promise<void>;
  update(widget: DashboardWidget): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(dashboardId: string, widgetIds: string[]): Promise<void>;
}

// ─── Report Repository ──────────────────────────────────────────────────────

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findByTenant(
    tenantId: string,
    params?: { includeDeleted?: boolean } & PaginationParams,
  ): Promise<PaginatedResult<Report>>;
  countByTenant(tenantId: string): Promise<number>;
  save(report: Report): Promise<void>;
  update(report: Report): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Report Download Repository ─────────────────────────────────────────────

export interface IReportDownloadRepository {
  findById(id: string): Promise<ReportDownload | null>;
  findByTenant(tenantId: string, params?: PaginationParams): Promise<PaginatedResult<ReportDownload>>;
  save(download: ReportDownload): Promise<void>;
}

// ─── User Role Repository ───────────────────────────────────────────────────

export interface IUserRoleRepository {
  findByUser(userId: string, tenantId: string): Promise<UserRole[]>;
  findByRole(roleId: string): Promise<UserRole[]>;
  assign(userId: string, roleId: string, tenantId: string): Promise<void>;
  remove(userId: string, roleId: string, tenantId: string): Promise<void>;
  removeAllByUser(userId: string, tenantId: string): Promise<void>;
}
