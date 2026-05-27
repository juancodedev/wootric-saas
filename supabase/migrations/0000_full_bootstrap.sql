CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "dashboard_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"shared_with_role_id" uuid,
	"share_type" varchar(30) NOT NULL,
	"token" varchar(255),
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"widget_type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"position" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"visibility" varchar(30) DEFAULT 'private' NOT NULL,
	"layout" jsonb,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"format" varchar(20) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"file_name" varchar(255),
	"file_size" integer,
	"record_count" integer,
	"duration_ms" integer,
	"r2_key" varchar(500),
	"error_message" text,
	"filters" jsonb
);
--> statement-breakpoint
CREATE TABLE "feature_flag_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"feature_flag_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid,
	"enabled" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"description" text,
	"group" varchar(100) NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name"),
	CONSTRAINT "permissions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "plan_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"plan_id" uuid NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"plan_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"plan_id" uuid NOT NULL,
	"quota_key" varchar(100) NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"tier" varchar(50) NOT NULL,
	"price_monthly" integer DEFAULT 0 NOT NULL,
	"price_yearly" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"stripe_price_id_monthly" varchar(255),
	"stripe_price_id_yearly" varchar(255),
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quota_usage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quota_key" varchar(100) NOT NULL,
	"delta" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "report_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"export_history_id" uuid,
	"report_id" uuid,
	"format" varchar(20) NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"report_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cron_expression" varchar(100) NOT NULL,
	"format" varchar(20) DEFAULT 'pdf' NOT NULL,
	"recipients" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"report_type" varchar(100) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_scheduled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name"),
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"previous_plan_id" uuid,
	"new_plan_id" uuid,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'trial' NOT NULL,
	"trial_start_at" timestamp with time zone,
	"trial_end_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"stripe_subscription_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"billing_interval" varchar(10)
);
--> statement-breakpoint
CREATE TABLE "tenant_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branding" jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "tenant_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"domain" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"logo_url" text,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "usage_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quota_key" varchar(100) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"limit" integer NOT NULL,
	"reset_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"effect" varchar(10) DEFAULT 'allow' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_shared_with_role_id_roles_id_fk" FOREIGN KEY ("shared_with_role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_history" ADD CONSTRAINT "export_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_history" ADD CONSTRAINT "export_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_feature_flag_id_feature_flags_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_permissions" ADD CONSTRAINT "plan_permissions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_permissions" ADD CONSTRAINT "plan_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_quotas" ADD CONSTRAINT "plan_quotas_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_usage_history" ADD CONSTRAINT "quota_usage_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_downloads" ADD CONSTRAINT "report_downloads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_downloads" ADD CONSTRAINT "report_downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_downloads" ADD CONSTRAINT "report_downloads_export_history_id_export_history_id_fk" FOREIGN KEY ("export_history_id") REFERENCES "public"."export_history"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_downloads" ADD CONSTRAINT "report_downloads_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_config" ADD CONSTRAINT "tenant_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_quotas" ADD CONSTRAINT "usage_quotas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "dashboard_shares_dashboard_idx" ON "dashboard_shares" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "dashboard_shares_token_idx" ON "dashboard_shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX "dashboard_widgets_dashboard_idx" ON "dashboard_widgets" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "dashboards_tenant_idx" ON "dashboards" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dashboards_user_idx" ON "dashboards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboards_visibility_idx" ON "dashboards" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "dashboards_deleted_idx" ON "dashboards" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "export_history_tenant_idx" ON "export_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "export_history_user_idx" ON "export_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "export_history_status_idx" ON "export_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "export_history_created_idx" ON "export_history" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ff_overrides_tenant_flag_idx" ON "feature_flag_overrides" USING btree ("feature_flag_id","tenant_id");--> statement-breakpoint
CREATE INDEX "ff_overrides_plan_idx" ON "feature_flag_overrides" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key_idx" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_slug_idx" ON "permissions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "permissions_group_idx" ON "permissions" USING btree ("group");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_features_uniq_idx" ON "plan_features" USING btree ("plan_id","feature_key");--> statement-breakpoint
CREATE INDEX "plan_features_plan_idx" ON "plan_features" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_permissions_uniq_idx" ON "plan_permissions" USING btree ("plan_id","permission_id");--> statement-breakpoint
CREATE INDEX "plan_permissions_plan_idx" ON "plan_permissions" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_quotas_uniq_idx" ON "plan_quotas" USING btree ("plan_id","quota_key");--> statement-breakpoint
CREATE INDEX "plan_quotas_plan_idx" ON "plan_quotas" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_slug_idx" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "quota_history_tenant_idx" ON "quota_usage_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "report_downloads_tenant_idx" ON "report_downloads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "report_downloads_report_idx" ON "report_downloads" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_schedules_report_idx" ON "report_schedules" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_schedules_next_run_idx" ON "report_schedules" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "reports_tenant_idx" ON "reports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reports_user_idx" ON "reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_deleted_idx" ON "reports" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_uniq_idx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_slug_idx" ON "roles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subscription_events_sub_idx" ON "subscription_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_events_tenant_idx" ON "subscription_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_idx" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_stripe_sub_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_config_tenant_id_idx" ON "tenant_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_quotas_tenant_key_idx" ON "usage_quotas" USING btree ("tenant_id","quota_key");--> statement-breakpoint
CREATE INDEX "usage_quotas_reset_idx" ON "usage_quotas" USING btree ("reset_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_permissions_uniq_idx" ON "user_permissions" USING btree ("user_id","permission_id","tenant_id");--> statement-breakpoint
CREATE INDEX "user_permissions_tenant_idx" ON "user_permissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_uniq_idx" ON "user_roles" USING btree ("user_id","role_id","tenant_id");--> statement-breakpoint
CREATE INDEX "user_roles_tenant_idx" ON "user_roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");-- RLS Policies for Wootric Multi-Tenant SaaS
-- Safe to run at any time: checks table existence before applying policies.
-- Run this after the initial Drizzle schema migration.

-- ═════════════════════════════════════════════════════════════════════════════
-- HELPER: Get current tenant_id from app-level JWT claim
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
    ''
  )::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Helper: enable RLS on a table if it exists
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._enable_rls_if_exists(tbl text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = split_part(tbl, '.', 2)
      AND schemaname = split_part(tbl, '.', 1)
  ) THEN
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tbl);
  END IF;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Policy helper: create a policy if the table exists and policy doesn't exist
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._create_policy_if_not_exists(
  policy_name text,
  table_name text,
  policy_type text,       -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  using_expr text,        -- USING expression (for SELECT/UPDATE/DELETE)
  check_expr text DEFAULT NULL  -- WITH CHECK expression (for INSERT/UPDATE)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = split_part(table_name, '.', 2)
      AND schemaname = split_part(table_name, '.', 1)
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = policy_name
      AND tablename = split_part(table_name, '.', 2)
      AND schemaname = split_part(table_name, '.', 1)
  ) THEN
    IF policy_type IN ('SELECT', 'UPDATE', 'DELETE') THEN
      EXECUTE format(
        'CREATE POLICY %I ON %s FOR %s USING (%s);',
        policy_name, table_name, policy_type, using_expr
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %s FOR %s WITH CHECK (%s);',
        policy_name, table_name, policy_type,
        COALESCE(check_expr, using_expr)
      );
    END IF;
  END IF;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- APPLY POLICIES
-- ═════════════════════════════════════════════════════════════════════════════

-- TENANTS
SELECT public._enable_rls_if_exists('public.tenants');
SELECT public._create_policy_if_not_exists('tenants_select_own', 'public.tenants', 'SELECT', 'id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('tenants_no_insert', 'public.tenants', 'INSERT', 'false');
SELECT public._create_policy_if_not_exists('tenants_no_update', 'public.tenants', 'UPDATE', 'false');
SELECT public._create_policy_if_not_exists('tenants_no_delete', 'public.tenants', 'DELETE', 'false');

-- USERS
SELECT public._enable_rls_if_exists('public.users');
SELECT public._create_policy_if_not_exists('users_select_tenant', 'public.users', 'SELECT', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('users_update_own', 'public.users', 'UPDATE', 'id = auth.uid()', 'id = auth.uid()');
SELECT public._create_policy_if_not_exists('users_no_insert', 'public.users', 'INSERT', 'false');
SELECT public._create_policy_if_not_exists('users_no_delete', 'public.users', 'DELETE', 'false');

-- TENANT-SCOPED TABLES (subscriptions, usage_quotas, etc.)
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'subscriptions', 'usage_quotas', 'quota_usage_history',
    'dashboards', 'dashboard_shares', 'reports', 'report_downloads',
    'export_history', 'audit_logs', 'invitations', 'user_roles'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    PERFORM public._enable_rls_if_exists('public.' || t);
    PERFORM public._create_policy_if_not_exists(t || '_select_tenant', 'public.' || t, 'SELECT', 'tenant_id = get_current_tenant_id()');
    PERFORM public._create_policy_if_not_exists(t || '_insert_tenant', 'public.' || t, 'INSERT', 'tenant_id = get_current_tenant_id()');
    PERFORM public._create_policy_if_not_exists(t || '_update_tenant', 'public.' || t, 'UPDATE', 'tenant_id = get_current_tenant_id()', 'tenant_id = get_current_tenant_id()');
    PERFORM public._create_policy_if_not_exists(t || '_delete_tenant', 'public.' || t, 'DELETE', 'tenant_id = get_current_tenant_id()');
  END LOOP;
END;
$$;

-- DASHBOARD WIDGETS (scoped via dashboard → tenant)
SELECT public._enable_rls_if_exists('public.dashboard_widgets');
SELECT public._create_policy_if_not_exists('dashboard_widgets_select_tenant', 'public.dashboard_widgets', 'SELECT',
  'EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_widgets.dashboard_id AND dashboards.tenant_id = get_current_tenant_id())');
SELECT public._create_policy_if_not_exists('dashboard_widgets_insert_tenant', 'public.dashboard_widgets', 'INSERT',
  'EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_widgets.dashboard_id AND dashboards.tenant_id = get_current_tenant_id())');
SELECT public._create_policy_if_not_exists('dashboard_widgets_update_tenant', 'public.dashboard_widgets', 'UPDATE',
  'EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_widgets.dashboard_id AND dashboards.tenant_id = get_current_tenant_id())');
SELECT public._create_policy_if_not_exists('dashboard_widgets_delete_tenant', 'public.dashboard_widgets', 'DELETE',
  'EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_widgets.dashboard_id AND dashboards.tenant_id = get_current_tenant_id())');

-- FEATURE FLAG OVERRIDES
SELECT public._enable_rls_if_exists('public.feature_flag_overrides');
SELECT public._create_policy_if_not_exists('ff_overrides_select_tenant', 'public.feature_flag_overrides', 'SELECT', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('ff_overrides_insert_tenant', 'public.feature_flag_overrides', 'INSERT', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('ff_overrides_update_tenant', 'public.feature_flag_overrides', 'UPDATE', 'tenant_id = get_current_tenant_id()', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('ff_overrides_delete_tenant', 'public.feature_flag_overrides', 'DELETE', 'tenant_id = get_current_tenant_id()');

-- GLOBAL TABLES (SELECT for all, no writes from client)
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'plans', 'feature_flags', 'plan_features', 'plan_permissions', 'plan_quotas',
    'roles', 'permissions', 'role_permissions', 'tenant_config'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    PERFORM public._enable_rls_if_exists('public.' || t);
    PERFORM public._create_policy_if_not_exists(t || '_select_all', 'public.' || t, 'SELECT', 'true');
    PERFORM public._create_policy_if_not_exists(t || '_no_insert', 'public.' || t, 'INSERT', 'false');
    PERFORM public._create_policy_if_not_exists(t || '_no_update', 'public.' || t, 'UPDATE', 'false');
    PERFORM public._create_policy_if_not_exists(t || '_no_delete', 'public.' || t, 'DELETE', 'false');
  END LOOP;
END;
$$;

-- SUBSCRIPTION EVENTS
SELECT public._enable_rls_if_exists('public.subscription_events');
SELECT public._create_policy_if_not_exists('subscription_events_select_tenant', 'public.subscription_events', 'SELECT', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('subscription_events_no_insert', 'public.subscription_events', 'INSERT', 'false');

-- REPORT SCHEDULES
SELECT public._enable_rls_if_exists('public.report_schedules');
SELECT public._create_policy_if_not_exists('report_schedules_select_tenant', 'public.report_schedules', 'SELECT', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('report_schedules_insert_tenant', 'public.report_schedules', 'INSERT', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('report_schedules_update_tenant', 'public.report_schedules', 'UPDATE', 'tenant_id = get_current_tenant_id()', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('report_schedules_delete_tenant', 'public.report_schedules', 'DELETE', 'tenant_id = get_current_tenant_id()');

-- SUBSCRIPTIONS — allow insert from service role only (no client inserts)
SELECT public._create_policy_if_not_exists('subscriptions_no_insert', 'public.subscriptions', 'INSERT', 'false');
SELECT public._create_policy_if_not_exists('subscriptions_no_delete', 'public.subscriptions', 'DELETE', 'false');

-- DASHBOARDS — creator can update/delete
SELECT public._create_policy_if_not_exists('dashboards_update_owner', 'public.dashboards', 'UPDATE',
  'tenant_id = get_current_tenant_id()', 'tenant_id = get_current_tenant_id()');
SELECT public._create_policy_if_not_exists('dashboards_delete_owner', 'public.dashboards', 'DELETE',
  'tenant_id = get_current_tenant_id()');

-- USER PERMISSIONS (read-only from client, managed server-side)
SELECT public._enable_rls_if_exists('public.user_permissions');
SELECT public._create_policy_if_not_exists('user_permissions_select_own', 'public.user_permissions', 'SELECT', 'user_id = auth.uid()');
SELECT public._create_policy_if_not_exists('user_permissions_no_write', 'public.user_permissions', 'INSERT', 'false');

-- Cleanup helper functions (no longer needed after policies are created)
DROP FUNCTION IF EXISTS public._enable_rls_if_exists(text);
DROP FUNCTION IF EXISTS public._create_policy_if_not_exists(text, text, text, text, text);
