import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── Plans ──
  const plans = [
    { name: "Free Trial", slug: "free_trial", description: "14-day free trial", tier: "free", price_monthly: 0, price_yearly: 0, sort_order: 1, is_active: true },
    { name: "Starter", slug: "starter", description: "For small teams", tier: "starter", price_monthly: 2900, price_yearly: 29000, sort_order: 2, is_active: true },
    { name: "Pro", slug: "pro", description: "For growing businesses", tier: "pro", price_monthly: 9900, price_yearly: 99000, sort_order: 3, is_active: true },
    { name: "Enterprise", slug: "enterprise", description: "For large organizations", tier: "enterprise", price_monthly: 0, price_yearly: 0, sort_order: 4, is_active: true },
  ];

  for (const plan of plans) {
    const { data: existing } = await admin.from("plans").select("id").eq("slug", plan.slug).maybeSingle();
    if (!existing) {
      const { error } = await admin.from("plans").insert(plan).select().single();
      if (error) console.error(`  ✗ Plan ${plan.slug}:`, error.message);
      else console.log(`  ✓ Plan: ${plan.slug}`);
    } else {
      console.log(`  ~ Plan ${plan.slug} already exists`);
    }
  }

  // ── Permissions ──
  const perms = [
    { name: "Ver dashboards", slug: "dashboard.read", group: "dashboard" },
    { name: "Crear dashboards", slug: "dashboard.create", group: "dashboard" },
    { name: "Editar dashboards", slug: "dashboard.update", group: "dashboard" },
    { name: "Eliminar dashboards", slug: "dashboard.delete", group: "dashboard" },
    { name: "Compartir internamente", slug: "dashboard.share.internal", group: "dashboard" },
    { name: "Compartir públicamente", slug: "dashboard.share.public", group: "dashboard" },
    { name: "Crear widgets", slug: "widgets.create", group: "widgets" },
    { name: "Editar widgets", slug: "widgets.update", group: "widgets" },
    { name: "Eliminar widgets", slug: "widgets.delete", group: "widgets" },
    { name: "Crear reportes", slug: "reports.create", group: "reports" },
    { name: "Programar reportes", slug: "reports.schedule", group: "reports" },
    { name: "Exportar Excel", slug: "exports.create", group: "exports" },
    { name: "Exportar PDF", slug: "exports.pdf", group: "exports" },
    { name: "Ver analytics", slug: "analytics.view", group: "analytics" },
    { name: "Gestionar billing", slug: "billing.manage", group: "billing" },
    { name: "Gestionar usuarios", slug: "users.manage", group: "users" },
    { name: "Gestionar tenants", slug: "admin.tenants", group: "admin" },
    { name: "Gestionar admins", slug: "admin.manage", group: "admin" },
    { name: "Gestionar feature flags", slug: "admin.features", group: "admin" },
  ];

  const permMap = new Map<string, string>();
  for (const p of perms) {
    const { data: existing } = await admin.from("permissions").select("id").eq("slug", p.slug).maybeSingle();
    if (!existing) {
      const { data, error } = await admin.from("permissions").insert(p).select("id, slug").single();
      if (error) console.error(`  ✗ Permission ${p.slug}:`, error.message);
      else { permMap.set(data.slug, data.id); console.log(`  ✓ Permission: ${p.slug}`); }
    } else {
      permMap.set(p.slug, existing.id);
      console.log(`  ~ Permission ${p.slug} already exists`);
    }
  }

  // ── Roles ──
  const roleData = [
    { name: "Super Admin", slug: "super_admin", description: "Full system access", is_system: true },
    { name: "Tenant Admin", slug: "tenant_admin", description: "Tenant-wide administration", is_system: true },
    { name: "Analyst", slug: "analyst", description: "Can create and edit dashboards", is_system: true },
    { name: "Viewer", slug: "viewer", description: "Read-only access", is_system: true },
  ];

  const roleMap = new Map<string, string>();
  for (const r of roleData) {
    const { data: existing } = await admin.from("roles").select("id").eq("slug", r.slug).maybeSingle();
    if (!existing) {
      const { data, error } = await admin.from("roles").insert(r).select("id, slug").single();
      if (error) console.error(`  ✗ Role ${r.slug}:`, error.message);
      else { roleMap.set(data.slug, data.id); console.log(`  ✓ Role: ${r.slug}`); }
    } else {
      roleMap.set(r.slug, existing.id);
      console.log(`  ~ Role ${r.slug} already exists`);
    }
  }

  // ── Role ↔ Permission mappings ──
  const rolePerms: Record<string, string[]> = {
    super_admin: perms.map((p) => p.slug),
    tenant_admin: ["dashboard.read", "dashboard.create", "dashboard.update", "dashboard.delete", "dashboard.share.internal", "dashboard.share.public", "widgets.create", "widgets.update", "widgets.delete", "reports.create", "reports.schedule", "exports.create", "exports.pdf", "analytics.view", "billing.manage", "users.manage"],
    analyst: ["dashboard.read", "dashboard.create", "dashboard.update", "widgets.create", "widgets.update", "reports.create", "exports.create", "analytics.view"],
    viewer: ["dashboard.read", "analytics.view"],
  };

  for (const [roleSlug, permSlugs] of Object.entries(rolePerms)) {
    const roleId = roleMap.get(roleSlug);
    if (!roleId) continue;
    for (const permSlug of permSlugs) {
      const permId = permMap.get(permSlug);
      if (!permId) continue;
      const { data: existing } = await admin.from("role_permissions").select("id").eq("role_id", roleId).eq("permission_id", permId).maybeSingle();
      if (!existing) {
        await admin.from("role_permissions").insert({ role_id: roleId, permission_id: permId }).select().single();
      }
    }
    console.log(`  ✓ Role-permissions: ${roleSlug}`);
  }

  // ── Feature Flags ──
  const flags = [
    { key: "pdf_exports", name: "Exportaciones PDF", description: "Permite exportar reportes en PDF", enabled: false, is_public: true },
    { key: "ai_insights", name: "AI Insights", enabled: false, is_public: false },
    { key: "dashboard_builder", name: "Dashboard Builder", enabled: true, is_public: true },
    { key: "public_links", name: "Enlaces Públicos", enabled: false, is_public: true },
    { key: "embeds", name: "Embeds", enabled: false, is_public: false },
    { key: "advanced_analytics", name: "Analytics Avanzados", enabled: false, is_public: true },
    { key: "custom_branding", name: "White Label", enabled: false, is_public: false },
    { key: "api_access", name: "API Access", enabled: false, is_public: true },
    { key: "sso", name: "SSO", enabled: false, is_public: false },
    { key: "scheduled_reports", name: "Reportes Programados", enabled: false, is_public: true },
    { key: "real_time_sync", name: "Sincronización Tiempo Real", enabled: false, is_public: true },
    { key: "multi_region", name: "Multi-Región", enabled: false, is_public: false },
  ];

  for (const f of flags) {
    const { data: existing } = await admin.from("feature_flags").select("id").eq("key", f.key).maybeSingle();
    if (!existing) {
      const { error } = await admin.from("feature_flags").insert(f);
      if (error) console.error(`  ✗ Flag ${f.key}:`, error.message);
      else console.log(`  ✓ Feature flag: ${f.key}`);
    } else {
      console.log(`  ~ Feature flag ${f.key} already exists`);
    }
  }

  // ── Plan Features ──
  const planFeatures: Record<string, Record<string, boolean>> = {
    free_trial: { pdf_exports: false, ai_insights: false, dashboard_builder: true, public_links: false, embeds: false, advanced_analytics: false, custom_branding: false, api_access: false, sso: false, scheduled_reports: false, real_time_sync: false, multi_region: false },
    starter: { pdf_exports: false, ai_insights: false, dashboard_builder: true, public_links: false, embeds: false, advanced_analytics: false, custom_branding: false, api_access: false, sso: false, scheduled_reports: false, real_time_sync: true, multi_region: false },
    pro: { pdf_exports: true, ai_insights: false, dashboard_builder: true, public_links: true, embeds: false, advanced_analytics: true, custom_branding: false, api_access: true, sso: false, scheduled_reports: true, real_time_sync: true, multi_region: false },
    enterprise: { pdf_exports: true, ai_insights: true, dashboard_builder: true, public_links: true, embeds: true, advanced_analytics: true, custom_branding: true, api_access: true, sso: true, scheduled_reports: true, real_time_sync: true, multi_region: true },
  };

  for (const [planSlug, features] of Object.entries(planFeatures)) {
    const { data: plan } = await admin.from("plans").select("id").eq("slug", planSlug).maybeSingle();
    if (!plan) continue;
    for (const [featureKey, enabled] of Object.entries(features)) {
      const { data: existing } = await admin.from("plan_features").select("id").eq("plan_id", plan.id).eq("feature_key", featureKey).maybeSingle();
      if (!existing) {
        await admin.from("plan_features").insert({ plan_id: plan.id, feature_key: featureKey, enabled });
      }
    }
    console.log(`  ✓ Plan features: ${planSlug}`);
  }

  // ── Plan Quotas ──
  const planQuotas: Record<string, Record<string, number>> = {
    free_trial: { max_exports: 1, max_dashboards: 1, max_widgets_per_dashboard: 5, max_users: 1, max_responses_synced: 5000, data_retention_days: 30 },
    starter: { max_exports: 100, max_dashboards: 3, max_widgets_per_dashboard: 10, max_users: 3, max_responses_synced: 50000, data_retention_days: 90 },
    pro: { max_exports: 1000, max_dashboards: 15, max_widgets_per_dashboard: 20, max_users: 15, max_responses_synced: 500000, data_retention_days: 365 },
    enterprise: { max_exports: -1, max_dashboards: -1, max_widgets_per_dashboard: -1, max_users: -1, max_responses_synced: -1, data_retention_days: -1 },
  };

  for (const [planSlug, quotas] of Object.entries(planQuotas)) {
    const { data: plan } = await admin.from("plans").select("id").eq("slug", planSlug).maybeSingle();
    if (!plan) continue;
    for (const [quotaKey, value] of Object.entries(quotas)) {
      const { data: existing } = await admin.from("plan_quotas").select("id").eq("plan_id", plan.id).eq("quota_key", quotaKey).maybeSingle();
      if (!existing) {
        await admin.from("plan_quotas").insert({ plan_id: plan.id, quota_key: quotaKey, value });
      }
    }
    console.log(`  ✓ Plan quotas: ${planSlug}`);
  }

  // ── Plan Permissions ──
  const planPerms: Record<string, string[]> = {
    free_trial: ["dashboard.read", "dashboard.create"],
    starter: ["dashboard.read", "dashboard.create", "dashboard.update", "widgets.create", "widgets.update"],
    pro: ["dashboard.read", "dashboard.create", "dashboard.update", "dashboard.share.internal", "widgets.create", "widgets.update"],
    enterprise: ["dashboard.read", "dashboard.create", "dashboard.update", "dashboard.delete", "dashboard.share.internal", "dashboard.share.public", "widgets.create", "widgets.update", "widgets.delete"],
  };

  for (const [planSlug, permSlugs] of Object.entries(planPerms)) {
    const { data: plan } = await admin.from("plans").select("id").eq("slug", planSlug).maybeSingle();
    if (!plan) continue;
    for (const permSlug of permSlugs) {
      const permId = permMap.get(permSlug);
      if (!permId) continue;
      const { data: existing } = await admin.from("plan_permissions").select("id").eq("plan_id", plan.id).eq("permission_id", permId).maybeSingle();
      if (!existing) {
        await admin.from("plan_permissions").insert({ plan_id: plan.id, permission_id: permId });
      }
    }
    console.log(`  ✓ Plan permissions: ${planSlug}`);
  }

  console.log("\n✅ Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
