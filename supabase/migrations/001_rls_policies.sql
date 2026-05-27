-- RLS Policies for Wootric Multi-Tenant SaaS
-- Run this after the initial schema migration has been applied.
-- These policies assume tenant_id is present on all tenant-scoped tables.

-- ═════════════════════════════════════════════════════════════════════════════
-- HELPER: Get current tenant_id from app-level JWT claim
-- ═════════════════════════════════════════════════════════════════════════════

-- Create a function to extract the tenant_id from the JWT
-- This is set by Supabase Auth or can be passed via the custom access token hook
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
-- TENANTS table
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Users can view their own tenant only
CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT
  USING (id = get_current_tenant_id());

-- Only super_admin via service role can manage tenants (no public RLS for writes)
CREATE POLICY "tenants_no_insert" ON tenants
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "tenants_no_update" ON tenants
  FOR UPDATE
  USING (false);

CREATE POLICY "tenants_no_delete" ON tenants
  FOR DELETE
  USING (false);

-- ═════════════════════════════════════════════════════════════════════════════
-- USERS table
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can see other users in the same tenant
CREATE POLICY "users_select_tenant" ON users
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- Users can update their own record
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ═════════════════════════════════════════════════════════════════════════════
-- ALL TENANT-SCOPED TABLES
-- ═════════════════════════════════════════════════════════════════════════════

-- Helper macro: enable RLS + add tenant isolation policy for SELECT/INSERT/UPDATE/DELETE
-- Uses format for each table that has a tenant_id column.

DO $$
DECLARE
  tables_with_tenant TEXT[] := ARRAY[
    'subscriptions',
    'usage_quotas',
    'quota_usage_history',
    'dashboards',
    'dashboard_shares',
    'reports',
    'report_downloads',
    'export_history',
    'audit_logs',
    'invitations',
    'user_roles'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_with_tenant
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

    -- SELECT: same tenant only (non-deleted for soft-delete tables)
    BEGIN
      EXECUTE format($fmt$
        CREATE POLICY %I ON %I
          FOR SELECT
          USING (tenant_id = get_current_tenant_id());
      $fmt$, t || '_select_tenant', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- INSERT: only into own tenant
    BEGIN
      EXECUTE format($fmt$
        CREATE POLICY %I ON %I
          FOR INSERT
          WITH CHECK (tenant_id = get_current_tenant_id());
      $fmt$, t || '_insert_tenant', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- UPDATE: only own tenant rows
    BEGIN
      EXECUTE format($fmt$
        CREATE POLICY %I ON %I
          FOR UPDATE
          USING (tenant_id = get_current_tenant_id())
          WITH CHECK (tenant_id = get_current_tenant_id());
      $fmt$, t || '_update_tenant', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- DELETE: only own tenant rows
    BEGIN
      EXECUTE format($fmt$
        CREATE POLICY %I ON %I
          FOR DELETE
          USING (tenant_id = get_current_tenant_id());
      $fmt$, t || '_delete_tenant', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- DASHBOARD WIDGETS (scoped via dashboard → tenant)
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_widgets_select_tenant" ON dashboard_widgets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dashboards
      WHERE dashboards.id = dashboard_widgets.dashboard_id
        AND dashboards.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "dashboard_widgets_insert_tenant" ON dashboard_widgets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboards
      WHERE dashboards.id = dashboard_widgets.dashboard_id
        AND dashboards.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "dashboard_widgets_update_tenant" ON dashboard_widgets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dashboards
      WHERE dashboards.id = dashboard_widgets.dashboard_id
        AND dashboards.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "dashboard_widgets_delete_tenant" ON dashboard_widgets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM dashboards
      WHERE dashboards.id = dashboard_widgets.dashboard_id
        AND dashboards.tenant_id = get_current_tenant_id()
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- PLANS (global, no tenant_id — all users can read)
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_all" ON plans
  FOR SELECT
  USING (true);

CREATE POLICY "plans_no_write" ON plans
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "plans_no_update" ON plans
  FOR UPDATE
  USING (false);

-- ═════════════════════════════════════════════════════════════════════════════
-- FEATURE FLAGS (global, no tenant_id — all authenticated users can read)
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_all" ON feature_flags
  FOR SELECT
  USING (true);

CREATE POLICY "feature_flags_no_write" ON feature_flags
  FOR INSERT
  WITH CHECK (false);

-- ═════════════════════════════════════════════════════════════════════════════
-- FEATURE FLAG OVERRIDES (scoped by tenant_id)
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ff_overrides_select_tenant" ON feature_flag_overrides
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "ff_overrides_insert_tenant" ON feature_flag_overrides
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "ff_overrides_update_tenant" ON feature_flag_overrides
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "ff_overrides_delete_tenant" ON feature_flag_overrides
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- ═════════════════════════════════════════════════════════════════════════════
-- PLAN FEATURES / PLAN PERMISSIONS / PLAN QUOTAS (global, no tenant_id)
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features_select" ON plan_features FOR SELECT USING (true);
CREATE POLICY "plan_features_no_write" ON plan_features FOR INSERT WITH CHECK (false);

ALTER TABLE plan_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_permissions_select" ON plan_permissions FOR SELECT USING (true);
CREATE POLICY "plan_permissions_no_write" ON plan_permissions FOR INSERT WITH CHECK (false);

ALTER TABLE plan_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_quotas_select" ON plan_quotas FOR SELECT USING (true);
CREATE POLICY "plan_quotas_no_write" ON plan_quotas FOR INSERT WITH CHECK (false);

-- ═════════════════════════════════════════════════════════════════════════════
-- ROLES & PERMISSIONS (global, no tenant_id)
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select" ON roles FOR SELECT USING (true);
CREATE POLICY "roles_no_write" ON roles FOR INSERT WITH CHECK (false);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_select" ON permissions FOR SELECT USING (true);
CREATE POLICY "permissions_no_write" ON permissions FOR INSERT WITH CHECK (false);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "role_permissions_no_write" ON role_permissions FOR INSERT WITH CHECK (false);
