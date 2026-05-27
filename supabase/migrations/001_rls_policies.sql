-- RLS Policies for Wootric Multi-Tenant SaaS
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
