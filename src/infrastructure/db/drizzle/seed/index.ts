import {
  roles,
  permissions,
  plans,
  featureFlags,
} from "../schema/index";

// ═════════════════════════════════════════════════════════════════════════════
// PERMISSIONS
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_PERMISSIONS: (typeof permissions.$inferInsert)[] = [
  // Dashboard
  { name: "Ver dashboards", slug: "dashboard.read", group: "dashboard", description: "Visualizar dashboards" },
  { name: "Crear dashboards", slug: "dashboard.create", group: "dashboard", description: "Crear nuevos dashboards" },
  { name: "Editar dashboards", slug: "dashboard.update", group: "dashboard", description: "Modificar dashboards existentes" },
  { name: "Eliminar dashboards", slug: "dashboard.delete", group: "dashboard", description: "Eliminar dashboards" },

  // Dashboard sharing
  { name: "Compartir internamente", slug: "dashboard.share.internal", group: "dashboard", description: "Compartir dashboards con usuarios del tenant" },
  { name: "Compartir públicamente", slug: "dashboard.share.public", group: "dashboard", description: "Compartir dashboards con enlace público" },

  // Widgets
  { name: "Crear widgets", slug: "widgets.create", group: "widgets", description: "Agregar widgets a dashboards" },
  { name: "Editar widgets", slug: "widgets.update", group: "widgets", description: "Modificar widgets existentes" },
  { name: "Eliminar widgets", slug: "widgets.delete", group: "widgets", description: "Eliminar widgets" },

  // Reports
  { name: "Crear reportes", slug: "reports.create", group: "reports", description: "Crear reportes personalizados" },
  { name: "Programar reportes", slug: "reports.schedule", group: "reports", description: "Programar exportaciones recurrentes" },
  { name: "Descargar reportes", slug: "reports.download", group: "reports", description: "Descargar reportes generados" },

  // Exports
  { name: "Exportar Excel", slug: "export.excel", group: "export", description: "Exportar datos a Excel" },
  { name: "Exportar PDF", slug: "export.pdf", group: "export", description: "Exportar reportes a PDF" },
  { name: "Exportar CSV", slug: "export.csv", group: "export", description: "Exportar datos a CSV" },

  // Analytics
  { name: "Ver analytics", slug: "analytics.view", group: "analytics", description: "Visualizar analytics básicos" },
  { name: "Analytics avanzados", slug: "analytics.advanced", group: "analytics", description: "Acceder a analytics avanzados" },

  // Users
  { name: "Gestionar usuarios", slug: "users.manage", group: "users", description: "Administrar usuarios del tenant" },
  { name: "Invitar usuarios", slug: "users.invite", group: "users", description: "Invitar nuevos usuarios" },
  { name: "Eliminar usuarios", slug: "users.remove", group: "users", description: "Remover usuarios del tenant" },

  // Billing
  { name: "Ver billing", slug: "billing.view", group: "billing", description: "Visualizar información de facturación" },
  { name: "Gestionar billing", slug: "billing.manage", group: "billing", description: "Administrar suscripción y facturación" },

  // Admin
  { name: "Admin plataforma", slug: "admin.manage", group: "admin", description: "Acceso completo a la administración de la plataforma" },
  { name: "Admin tenants", slug: "admin.tenants", group: "admin", description: "Gestionar tenants de la plataforma" },
  { name: "Admin features", slug: "admin.features", group: "admin", description: "Gestionar feature flags globales" },
];

// ═════════════════════════════════════════════════════════════════════════════
// ROLES
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_ROLES: (typeof roles.$inferInsert)[] = [
  {
    name: "Super Admin",
    slug: "super_admin",
    description: "Administrador global de la plataforma. Acceso completo a todos los tenants.",
    isSystem: true,
  },
  {
    name: "Tenant Admin",
    slug: "tenant_admin",
    description: "Administrador del tenant. Gestiona usuarios, dashboards y configuración.",
    isSystem: true,
  },
  {
    name: "Analyst",
    slug: "analyst",
    description: "Analista. Puede crear dashboards, widgets y exportar reportes.",
    isSystem: true,
  },
  {
    name: "Viewer",
    slug: "viewer",
    description: "Visor. Solo puede visualizar dashboards compartidos.",
    isSystem: true,
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// ROLE-PERMISSION MAPPINGS
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_ROLE_PERMISSIONS: { role_slug: string; permission_slugs: string[] }[] = [
  {
    role_slug: "super_admin",
    permission_slugs: [
      "dashboard.read", "dashboard.create", "dashboard.update", "dashboard.delete",
      "dashboard.share.internal", "dashboard.share.public",
      "widgets.create", "widgets.update", "widgets.delete",
      "reports.create", "reports.schedule", "reports.download",
      "export.excel", "export.pdf", "export.csv",
      "analytics.view", "analytics.advanced",
      "users.manage", "users.invite", "users.remove",
      "billing.view", "billing.manage",
      "admin.manage", "admin.tenants", "admin.features",
    ],
  },
  {
    role_slug: "tenant_admin",
    permission_slugs: [
      "dashboard.read", "dashboard.create", "dashboard.update", "dashboard.delete",
      "dashboard.share.internal", "dashboard.share.public",
      "widgets.create", "widgets.update", "widgets.delete",
      "reports.create", "reports.schedule", "reports.download",
      "export.excel", "export.pdf", "export.csv",
      "analytics.view", "analytics.advanced",
      "users.manage", "users.invite", "users.remove",
      "billing.view", "billing.manage",
    ],
  },
  {
    role_slug: "analyst",
    permission_slugs: [
      "dashboard.read", "dashboard.create", "dashboard.update",
      "widgets.create", "widgets.update",
      "reports.create", "reports.download",
      "export.excel",
      "analytics.view", "analytics.advanced",
    ],
  },
  {
    role_slug: "viewer",
    permission_slugs: [
      "dashboard.read",
      "analytics.view",
    ],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// PLANS
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_PLANS: (typeof plans.$inferInsert)[] = [
  {
    name: "Free Trial",
    slug: "free_trial",
    description: "Prueba gratuita de 14 días. Límites básicos para evaluar la plataforma.",
    tier: "free_trial",
    priceMonthly: 0,
    priceYearly: 0,
    sortOrder: 0,
  },
  {
    name: "Starter",
    slug: "starter",
    description: "Para equipos pequeños que inician con analytics.",
    tier: "starter",
    priceMonthly: 2900,
    priceYearly: 29000,
    sortOrder: 1,
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Para equipos en crecimiento que necesitan analytics avanzados.",
    tier: "pro",
    priceMonthly: 9900,
    priceYearly: 99000,
    sortOrder: 2,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "Para organizaciones que requieren soluciones personalizadas y white-label.",
    tier: "enterprise",
    priceMonthly: 0,
    priceYearly: 0,
    sortOrder: 3,
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// PLAN FEATURES
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_PLAN_FEATURES: { plan_slug: string; features: { key: string; enabled: boolean }[] }[] = [
  {
    plan_slug: "free_trial",
    features: [
      { key: "pdf_exports", enabled: false },
      { key: "ai_insights", enabled: false },
      { key: "dashboard_builder", enabled: true },
      { key: "public_links", enabled: false },
      { key: "embeds", enabled: false },
      { key: "advanced_analytics", enabled: false },
      { key: "custom_branding", enabled: false },
      { key: "api_access", enabled: false },
      { key: "sso", enabled: false },
      { key: "scheduled_reports", enabled: false },
      { key: "real_time_sync", enabled: false },
      { key: "multi_region", enabled: false },
    ],
  },
  {
    plan_slug: "starter",
    features: [
      { key: "pdf_exports", enabled: false },
      { key: "ai_insights", enabled: false },
      { key: "dashboard_builder", enabled: true },
      { key: "public_links", enabled: false },
      { key: "embeds", enabled: false },
      { key: "advanced_analytics", enabled: false },
      { key: "custom_branding", enabled: false },
      { key: "api_access", enabled: false },
      { key: "sso", enabled: false },
      { key: "scheduled_reports", enabled: false },
      { key: "real_time_sync", enabled: true },
      { key: "multi_region", enabled: false },
    ],
  },
  {
    plan_slug: "pro",
    features: [
      { key: "pdf_exports", enabled: true },
      { key: "ai_insights", enabled: false },
      { key: "dashboard_builder", enabled: true },
      { key: "public_links", enabled: true },
      { key: "embeds", enabled: false },
      { key: "advanced_analytics", enabled: true },
      { key: "custom_branding", enabled: false },
      { key: "api_access", enabled: true },
      { key: "sso", enabled: false },
      { key: "scheduled_reports", enabled: true },
      { key: "real_time_sync", enabled: true },
      { key: "multi_region", enabled: false },
    ],
  },
  {
    plan_slug: "enterprise",
    features: [
      { key: "pdf_exports", enabled: true },
      { key: "ai_insights", enabled: true },
      { key: "dashboard_builder", enabled: true },
      { key: "public_links", enabled: true },
      { key: "embeds", enabled: true },
      { key: "advanced_analytics", enabled: true },
      { key: "custom_branding", enabled: true },
      { key: "api_access", enabled: true },
      { key: "sso", enabled: true },
      { key: "scheduled_reports", enabled: true },
      { key: "real_time_sync", enabled: true },
      { key: "multi_region", enabled: true },
    ],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// PLAN QUOTAS
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_PLAN_QUOTAS: { plan_slug: string; quotas: { key: string; value: number }[] }[] = [
  {
    plan_slug: "free_trial",
    quotas: [
      { key: "max_exports", value: 1 },
      { key: "max_dashboards", value: 1 },
      { key: "max_widgets_per_dashboard", value: 5 },
      { key: "max_users", value: 1 },
      { key: "max_responses_synced", value: 5000 },
      { key: "data_retention_days", value: 30 },
    ],
  },
  {
    plan_slug: "starter",
    quotas: [
      { key: "max_exports", value: 100 },
      { key: "max_dashboards", value: 3 },
      { key: "max_widgets_per_dashboard", value: 10 },
      { key: "max_users", value: 3 },
      { key: "max_responses_synced", value: 50000 },
      { key: "data_retention_days", value: 90 },
    ],
  },
  {
    plan_slug: "pro",
    quotas: [
      { key: "max_exports", value: 1000 },
      { key: "max_dashboards", value: 15 },
      { key: "max_widgets_per_dashboard", value: 20 },
      { key: "max_users", value: 15 },
      { key: "max_responses_synced", value: 500000 },
      { key: "data_retention_days", value: 365 },
    ],
  },
  {
    plan_slug: "enterprise",
    quotas: [
      { key: "max_exports", value: -1 },
      { key: "max_dashboards", value: -1 },
      { key: "max_widgets_per_dashboard", value: -1 },
      { key: "max_users", value: -1 },
      { key: "max_responses_synced", value: -1 },
      { key: "data_retention_days", value: -1 },
    ],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// PLAN PERMISSIONS
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_PLAN_PERMISSIONS: { plan_slug: string; permission_slugs: string[] }[] = [
  {
    plan_slug: "free_trial",
    permission_slugs: [
      "dashboard.read", "dashboard.create",
      "analytics.view",
      "export.excel",
    ],
  },
  {
    plan_slug: "starter",
    permission_slugs: [
      "dashboard.read", "dashboard.create", "dashboard.update",
      "widgets.create", "widgets.update",
      "reports.download",
      "export.excel",
      "analytics.view",
    ],
  },
  {
    plan_slug: "pro",
    permission_slugs: [
      "dashboard.read", "dashboard.create", "dashboard.update",
      "dashboard.share.internal",
      "widgets.create", "widgets.update",
      "reports.create", "reports.schedule", "reports.download",
      "export.excel", "export.pdf",
      "analytics.view", "analytics.advanced",
    ],
  },
  {
    plan_slug: "enterprise",
    permission_slugs: [
      "dashboard.read", "dashboard.create", "dashboard.update", "dashboard.delete",
      "dashboard.share.internal", "dashboard.share.public",
      "widgets.create", "widgets.update", "widgets.delete",
      "reports.create", "reports.schedule", "reports.download",
      "export.excel", "export.pdf", "export.csv",
      "analytics.view", "analytics.advanced",
      "users.manage", "users.invite", "users.remove",
      "billing.view", "billing.manage",
    ],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═════════════════════════════════════════════════════════════════════════════

export const SEED_FEATURE_FLAGS: (typeof featureFlags.$inferInsert)[] = [
  { key: "pdf_exports", name: "Exportaciones PDF", description: "Permite exportar reportes en formato PDF", enabled: false, isPublic: true },
  { key: "ai_insights", name: "AI Insights", description: "Insights generados por inteligencia artificial", enabled: false, isPublic: false },
  { key: "dashboard_builder", name: "Dashboard Builder", description: "Constructor de dashboards drag-and-drop", enabled: true, isPublic: true },
  { key: "public_links", name: "Enlaces Públicos", description: "Compartir dashboards mediante enlaces públicos", enabled: false, isPublic: true },
  { key: "embeds", name: "Embeds", description: "Incrustar dashboards en sitios externos", enabled: false, isPublic: false },
  { key: "advanced_analytics", name: "Analytics Avanzados", description: "Métricas avanzadas y análisis multidimensional", enabled: false, isPublic: true },
  { key: "custom_branding", name: "White Label", description: "Personalización de marca (logo, colores, dominio)", enabled: false, isPublic: false },
  { key: "api_access", name: "API Access", description: "Acceso a la API REST para integraciones", enabled: false, isPublic: true },
  { key: "sso", name: "SSO", description: "Inicio de sesión único (SAML/OIDC)", enabled: false, isPublic: false },
  { key: "scheduled_reports", name: "Reportes Programados", description: "Programar exportaciones automáticas recurrentes", enabled: false, isPublic: true },
  { key: "real_time_sync", name: "Sincronización en Tiempo Real", description: "Sincronización automática de datos en tiempo real", enabled: false, isPublic: true },
  { key: "multi_region", name: "Multi-Región", description: "Almacenamiento de datos en múltiples regiones", enabled: false, isPublic: false },
];
