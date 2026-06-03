import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Helpers ────────────────────────────────────────────────────────────────

const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

const baseColumnsWithDeleted = {
  ...baseColumns,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

const tenantRef = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" });

const userRef = () =>
  uuid("user_id")
    .references(() => users.id, { onDelete: "set null" });

// ═════════════════════════════════════════════════════════════════════════════
// CORE
// ═════════════════════════════════════════════════════════════════════════════

export const tenants = pgTable(
  "tenants",
  {
    ...baseColumns,
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    domain: varchar("domain", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    logoUrl: text("logo_url"),
  },
  (t) => [uniqueIndex("tenants_slug_idx").on(t.slug)],
);

export const users = pgTable(
  "users",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [
    index("users_tenant_id_idx").on(t.tenantId),
    uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
  ],
);

export const tenantConfig = pgTable(
  "tenant_config",
  {
    ...baseColumns,
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" })
      .unique(),
    branding: jsonb("branding").$type<{
      primaryColor?: string;
      logo?: string;
      favicon?: string;
    }>(),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (t) => [uniqueIndex("tenant_config_tenant_id_idx").on(t.tenantId)],
);

// ═════════════════════════════════════════════════════════════════════════════
// RBAC
// ═════════════════════════════════════════════════════════════════════════════

export const roles = pgTable(
  "roles",
  {
    ...baseColumns,
    name: varchar("name", { length: 100 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
  },
  (t) => [uniqueIndex("roles_slug_idx").on(t.slug)],
);

export const permissions = pgTable(
  "permissions",
  {
    ...baseColumns,
    name: varchar("name", { length: 150}).notNull().unique(),
    slug: varchar("slug", { length: 150 }).notNull().unique(),
    description: text("description"),
    group: varchar("group", { length: 100 }).notNull(),
  },
  (t) => [
    uniqueIndex("permissions_slug_idx").on(t.slug),
    index("permissions_group_idx").on(t.group),
  ],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    ...baseColumns,
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("role_permissions_uniq_idx").on(t.roleId, t.permissionId)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    ...baseColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    tenantId: tenantRef(),
  },
  (t) => [
    uniqueIndex("user_roles_uniq_idx").on(t.userId, t.roleId, t.tenantId),
    index("user_roles_tenant_idx").on(t.tenantId),
  ],
);

export const userPermissions = pgTable(
  "user_permissions",
  {
    ...baseColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    tenantId: tenantRef(),
    effect: varchar("effect", { length: 10 }).notNull().default("allow"),
  },
  (t) => [
    uniqueIndex("user_permissions_uniq_idx").on(t.userId, t.permissionId, t.tenantId),
    index("user_permissions_tenant_idx").on(t.tenantId),
  ],
);

// ═════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS & PLANS
// ═════════════════════════════════════════════════════════════════════════════

export const plans = pgTable(
  "plans",
  {
    ...baseColumns,
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    tier: varchar("tier", { length: 50 }).notNull(), // free_trial, starter, pro, enterprise
    priceMonthly: integer("price_monthly").notNull().default(0),
    priceYearly: integer("price_yearly").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 255 }),
    stripePriceIdYearly: varchar("stripe_price_id_yearly", { length: 255 }),
  },
  (t) => [uniqueIndex("plans_slug_idx").on(t.slug)],
);

export const planFeatures = pgTable(
  "plan_features",
  {
    ...baseColumns,
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    featureKey: varchar("feature_key", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [
    uniqueIndex("plan_features_uniq_idx").on(t.planId, t.featureKey),
    index("plan_features_plan_idx").on(t.planId),
  ],
);

export const planPermissions = pgTable(
  "plan_permissions",
  {
    ...baseColumns,
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("plan_permissions_uniq_idx").on(t.planId, t.permissionId),
    index("plan_permissions_plan_idx").on(t.planId),
  ],
);

export const planQuotas = pgTable(
  "plan_quotas",
  {
    ...baseColumns,
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    quotaKey: varchar("quota_key", { length: 100 }).notNull(),
    value: integer("value").notNull(),
  },
  (t) => [
    uniqueIndex("plan_quotas_uniq_idx").on(t.planId, t.quotaKey),
    index("plan_quotas_plan_idx").on(t.planId),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 50 }).notNull().default("trial"),
    trialStartAt: timestamp("trial_start_at", { withTimezone: true }),
    trialEndAt: timestamp("trial_end_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    billingInterval: varchar("billing_interval", { length: 10 }), // monthly, yearly
  },
  (t) => [
    index("subscriptions_tenant_idx").on(t.tenantId),
    index("subscriptions_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("subscriptions_status_idx").on(t.status),
    uniqueIndex("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
  ],
);

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    ...baseColumns,
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    tenantId: tenantRef(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    previousPlanId: uuid("previous_plan_id"),
    newPlanId: uuid("new_plan_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("subscription_events_sub_idx").on(t.subscriptionId),
    index("subscription_events_tenant_idx").on(t.tenantId),
  ],
);

export const usageQuotas = pgTable(
  "usage_quotas",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    quotaKey: varchar("quota_key", { length: 100 }).notNull(),
    used: integer("used").notNull().default(0),
    limit: integer("limit").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("usage_quotas_tenant_key_idx").on(t.tenantId, t.quotaKey),
    index("usage_quotas_reset_idx").on(t.resetAt),
  ],
);

export const quotaUsageHistory = pgTable(
  "quota_usage_history",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    quotaKey: varchar("quota_key", { length: 100 }).notNull(),
    delta: integer("delta").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("quota_history_tenant_idx").on(t.tenantId),
    index("quota_history_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═════════════════════════════════════════════════════════════════════════════

export const featureFlags = pgTable(
  "feature_flags",
  {
    ...baseColumns,
    key: varchar("key", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(false),
  },
  (t) => [uniqueIndex("feature_flags_key_idx").on(t.key)],
);

export const featureFlagOverrides = pgTable(
  "feature_flag_overrides",
  {
    ...baseColumns,
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    tenantId: tenantRef(),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
  },
  (t) => [
    uniqueIndex("ff_overrides_tenant_flag_idx").on(t.featureFlagId, t.tenantId),
    index("ff_overrides_plan_idx").on(t.planId),
  ],
);

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARDS & REPORTS
// ═════════════════════════════════════════════════════════════════════════════

export const dashboards = pgTable(
  "dashboards",
  {
    ...baseColumnsWithDeleted,
    tenantId: tenantRef(),
    userId: userRef(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    visibility: varchar("visibility", { length: 30 }).notNull().default("private"),
    layout: jsonb("layout").$type<Record<string, unknown>>(),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (t) => [
    index("dashboards_tenant_idx").on(t.tenantId),
    index("dashboards_user_idx").on(t.userId),
    index("dashboards_visibility_idx").on(t.visibility),
    index("dashboards_deleted_idx").on(t.deletedAt),
  ],
);

export const dashboardWidgets = pgTable(
  "dashboard_widgets",
  {
    ...baseColumns,
    dashboardId: uuid("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    widgetType: varchar("widget_type", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    position: jsonb("position").$type<{ x: number; y: number; w: number; h: number }>(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("dashboard_widgets_dashboard_idx").on(t.dashboardId),
  ],
);

export const dashboardShares = pgTable(
  "dashboard_shares",
  {
    ...baseColumns,
    dashboardId: uuid("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    tenantId: tenantRef(),
    sharedWithUserId: userRef(),
    sharedWithRoleId: uuid("shared_with_role_id").references(() => roles.id, {
      onDelete: "cascade",
    }),
    shareType: varchar("share_type", { length: 30 }).notNull(),
    token: varchar("token", { length: 255 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("dashboard_shares_dashboard_idx").on(t.dashboardId),
    index("dashboard_shares_token_idx").on(t.token),
  ],
);

export const reports = pgTable(
  "reports",
  {
    ...baseColumnsWithDeleted,
    tenantId: tenantRef(),
    userId: userRef(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    reportType: varchar("report_type", { length: 100 }).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    isScheduled: boolean("is_scheduled").notNull().default(false),
  },
  (t) => [
    index("reports_tenant_idx").on(t.tenantId),
    index("reports_user_idx").on(t.userId),
    index("reports_deleted_idx").on(t.deletedAt),
  ],
);

export const reportSchedules = pgTable(
  "report_schedules",
  {
    ...baseColumns,
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    tenantId: tenantRef(),
    cronExpression: varchar("cron_expression", { length: 100 }).notNull(),
    format: varchar("format", { length: 20 }).notNull().default("pdf"),
    recipients: jsonb("recipients").$type<string[]>(),
    isActive: boolean("is_active").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  },
  (t) => [
    index("report_schedules_report_idx").on(t.reportId),
    index("report_schedules_next_run_idx").on(t.nextRunAt),
  ],
);

// ═════════════════════════════════════════════════════════════════════════════
// WOOTRIC
// ═════════════════════════════════════════════════════════════════════════════

export const wootricResponses = pgTable(
  "wootric_responses",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    wootricId: bigint("wootric_id", { mode: "number" }).notNull(),
    surveyId: bigint("survey_id", { mode: "number" }).notNull(),
    endUserId: bigint("end_user_id", { mode: "number" }),
    email: varchar("email", { length: 255 }),
    score: integer("score"),
    text: text("text"),
    originUrl: text("origin_url"),
    ipAddress: varchar("ip_address", { length: 45 }),
    wootricCreatedAt: timestamp("wootric_created_at", { withTimezone: true }).notNull(),
    wootricUpdatedAt: timestamp("wootric_updated_at", { withTimezone: true }),
    tags: jsonb("tags").$type<string[]>().default([]),
    endUserProperties: jsonb("end_user_properties").$type<Record<string, string>>(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("wootric_responses_tenant_wootric_idx").on(t.tenantId, t.wootricId),
    index("wootric_responses_tenant_idx").on(t.tenantId),
    index("wootric_responses_created_idx").on(t.wootricCreatedAt),
    index("wootric_responses_survey_idx").on(t.surveyId),
  ],
);

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT & EXPORT TRACKING
// ═════════════════════════════════════════════════════════════════════════════

export const auditLogs = pgTable(
  "audit_logs",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    userId: userRef(),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("audit_logs_tenant_idx").on(t.tenantId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const exportHistory = pgTable(
  "export_history",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    userId: userRef(),
    format: varchar("format", { length: 20 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    fileName: varchar("file_name", { length: 255 }),
    fileSize: integer("file_size"),
    recordCount: integer("record_count"),
    durationMs: integer("duration_ms"),
    r2Key: varchar("r2_key", { length: 500 }),
    errorMessage: text("error_message"),
    filters: jsonb("filters").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("export_history_tenant_idx").on(t.tenantId),
    index("export_history_user_idx").on(t.userId),
    index("export_history_status_idx").on(t.status),
    index("export_history_created_idx").on(t.createdAt),
  ],
);

export const reportDownloads = pgTable(
  "report_downloads",
  {
    ...baseColumns,
    tenantId: tenantRef(),
    userId: userRef(),
    exportHistoryId: uuid("export_history_id").references(() => exportHistory.id, {
      onDelete: "set null",
    }),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    format: varchar("format", { length: 20 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
  },
  (t) => [
    index("report_downloads_tenant_idx").on(t.tenantId),
    index("report_downloads_report_idx").on(t.reportId),
  ],
);
