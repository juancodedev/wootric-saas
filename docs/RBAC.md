# RBAC — Roles y Permisos

## Modelo

```
User ──> Role (many-to-many via user_roles)
Role ──> Permission (many-to-many via role_permissions)
Plan ──> Permission (many-to-many via plan_permissions)
Plan ──> Feature Flag (many-to-many via plan_features)
Account ──> Feature Flag Override (tenant-specific)
```

Las relaciones se mantienen en Supabase con Drizzle ORM.

## Roles por Defecto (Seed)

| Rol | Slug | Descripción | Permisos Clave |
|-----|------|-------------|-----------------|
| Admin | `admin` | Acceso completo | Todos los permisos |
| Manager | `manager` | Gestión operativa | dashboard.*, report.*, export.*, user.invite |
| Analyst | `analyst` | Consulta de datos | dashboard.read, report.*, export.read |
| Viewer | `viewer` | Solo lectura | dashboard.read, report.read |

## Permisos (Seed — 19 total)

### Dashboard
| Slug | Descripción |
|------|-------------|
| `dashboard.read` | Ver dashboards |
| `dashboard.write` | Crear/editar dashboards |
| `dashboard.delete` | Eliminar dashboards |

### Reports
| Slug | Descripción |
|------|-------------|
| `report.read` | Ver reportes |
| `report.write` | Crear/editar reportes |
| `report.delete` | Eliminar reportes |

### Exports
| Slug | Descripción |
|------|-------------|
| `export.read` | Ver exportaciones |
| `export.create` | Iniciar exportaciones |

### Settings
| Slug | Descripción |
|------|-------------|
| `settings.read` | Ver configuración del tenant |
| `settings.write` | Modificar configuración |

### Users
| Slug | Descripción |
|------|-------------|
| `user.read` | Ver miembros del tenant |
| `user.invite` | Invitar nuevos miembros |
| `user.manage` | Gestionar roles de usuarios |

### Billing
| Slug | Descripción |
|------|-------------|
| `billing.read` | Ver facturas y suscripción |
| `billing.manage` | Cambiar plan, gestionar pago |

### Admin
| Slug | Descripción |
|------|-------------|
| `admin.manage` | Gestionar tenants, planes (global) |

## Feature Flags (Seed — 12 total)

| Slug | Plan Mínimo | Descripción |
|------|-------------|-------------|
| `dashboards` | Free | Módulo de dashboards |
| `reports` | Free | Módulo de reportes |
| `exports_csv` | Starter | Exportar a CSV |
| `exports_excel` | Professional | Exportar a Excel (.xlsx) |
| `exports_pdf` | Professional | Exportar a PDF |
| `advanced_filters` | Professional | Filtros avanzados en reportes |
| `scheduling` | Enterprise | Programar exportaciones recurrentes |
| `api_access` | Enterprise | Acceso a API pública |
| `whitelabel` | Enterprise | Marca blanca (sin branding Wootric) |
| `audit_log` | Professional | Log de auditoría de cambios |
| `team_management` | Starter | Gestión de usuarios del equipo |
| `billing` | Free | Sección de facturación/plan |

## Caching

Los permisos/roles se cachean en KV (TTL 60s):

1. Request → check KV cache
2. Cache miss → query Supabase → populate KV
3. Cache hit → use cached value

## Evaluación de Flags

Orden de resolución (gana el primero que aplica):

1. **Tenant Override** — `feature_flag_overrides` (por flag + tenant)
2. **Plan Feature** — `plan_features` (del plan actual del tenant)
3. **Global Flag** — `feature_flags.enabled`
4. **Default** — `false`

## Route Guards

Definidos en `src/infrastructure/middleware/route-guards.ts`:

| Ruta | Permiso Requerido |
|------|-------------------|
| `/api/dashboards*` | `dashboard.*` |
| `/api/reports*` | `report.*` |
| `/api/exports*` | `export.*` |
| `/api/tenants/config*` | `settings.*` |
| `/api/auth/invite` | `user.invite` |
| `/api/admin/*` | `admin.manage` |
| `/api/billing/*` | `billing.manage` |
| `/api/rbac/assign` | `user.manage` |
