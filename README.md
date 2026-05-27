# Wootric SaaS

Plataforma SaaS multi-tenancy para integración con Wootric. Construida con **Next.js 16**, **Cloudflare Workers**, **Supabase** y **Drizzle ORM**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (React 19), Tailwind CSS v4 |
| Backend | Next.js API Routes (Edge), Cloudflare Workers |
| Database | Supabase (PostgreSQL) + Drizzle ORM |
| Auth | Custom JWT (jose) + bcrypt, service-role bypass RLS |
| Cache / Storage | Cloudflare KV (planes, permisos, sesiones), R2 (exports) |
| Async Jobs | Cloudflare Queues (EXPORTS, SYNC, BILLING) |
| DI | tsyringe + reflect-metadata |
| Validation | Zod v4 |
| Logging | Pino |

## Estado del proyecto — E12 completo

| Etapa | Descripción | Estado |
|-------|------------|--------|
| E1 | Proyecto base (Next.js + Tailwind + Cloudflare) | ✅ |
| E2 | DB schema + Drizzle + Supabase client | ✅ |
| E3 | Auth (JWT custom, registro, login, refresh) | ✅ |
| E4 | Tenant management | ✅ |
| E5 | Planes (CRUD, seed con 4 planes) | ✅ |
| E6 | RBAC (permisos, roles, KV cache 60s TTL) | ✅ |
| E7 | Subscriptions + Quotas | ✅ |
| E8 | Feature Flags (tenant override > plan > global) | ✅ |
| E9 | Middleware global auth (11-step pipeline) | ✅ |
| E10 | RLS policies (26 tablas, idempotente) | ✅ |
| E11 | Dashboards & Widgets CRUD + UI | ✅ |
| **E12** | **Reportes & Exportaciones (Excel + PDF)** | **✅** |
| E13 | Workers desacoplados (Export, Sync, Billing) | ⏳ Pendiente |

## Rutas de API

### Auth
- `POST /api/auth/register` — Crear tenant + admin user
- `POST /api/auth/login` — Login (email+password → JWT)
- `POST /api/auth/refresh` — Refresh token
- `POST /api/auth/logout` — Invalidar token
- `POST /api/auth/invite` — Invitar usuario a tenant

### RBAC
- `GET /api/rbac/permissions` — Listar permisos del tenant
- `GET /api/rbac/roles` — Listar roles con permisos
- `POST /api/rbac/assign` — Asignar rol a usuario

### Planes & Subscripciones
- `GET /api/subscriptions` — Subscripción activa del tenant
- `GET /api/quotas` — Estado de cuotas del tenant

### Feature Flags
- `GET /api/feature-flags` — Flags activos para el tenant
- `POST /api/feature-flags` — Crear override de flag
- `DELETE /api/feature-flags?id=...` — Eliminar override

### Dashboards & Widgets
- `GET /api/dashboards` — Listar dashboards
- `POST /api/dashboards` — Crear dashboard
- `GET /api/dashboards/[id]` — Obtener dashboard con widgets
- `PATCH /api/dashboards/[id]` — Actualizar dashboard
- `DELETE /api/dashboards/[id]` — Eliminar (soft)
- `POST /api/dashboards/[id]/restore` — Restaurar eliminado
- `GET /api/dashboards/[id]/widgets` — Listar widgets
- `POST /api/dashboards/[id]/widgets` — Crear widget
- `PATCH /api/dashboards/[id]/widgets/[widgetId]` — Actualizar widget
- `DELETE /api/dashboards/[id]/widgets/[widgetId]` — Eliminar widget
- `POST /api/dashboards/[id]/widgets/reorder` — Reordenar widgets

### Reportes & Exportaciones
- `GET /api/reports` — Listar reportes
- `POST /api/reports` — Crear reporte
- `GET /api/reports/[id]` — Obtener reporte
- `PATCH /api/reports/[id]` — Actualizar reporte
- `DELETE /api/reports/[id]` — Eliminar reporte
- `POST /api/reports/[id]/export` — Iniciar exportación asíncrona
- `GET /api/exports/[id]` — Estado de exportación

### Frontend
- `/login` — Login page
- `/register` — Registro de nuevo tenant
- `/` — Dashboard principal (protegido)

## Arquitectura del Middleware

Pipeline de 11 pasos en `src/middleware.ts`:

1. **Secure Headers** — CSP, HSTS, X-Frame-Options
2. **Rate Limiting** — Sliding-window via KV
3. **CSRF** — SameSite=Strict + Origin check
4. **JWT Auth** — Verificar token, extraer session
5. **Tenant Resolution** — Subdomain → KV/Supabase cache
6. **Tenant Active** — 403 si está desactivado
7. **Subscription Check** — 402 si no hay plan activo
8. **Permission Enforcement** — Ruta → permiso requerido
9. **Feature Flag Check** — 403 si flag deshabilitado
10. **Quota Check** — 429 si excede cuota en mutations
11. **Audit Log** — Fire-and-forget a Supabase

Configuración de guards por ruta en `src/infrastructure/middleware/route-guards.ts`.

## Comandos

```bash
pnpm dev              # Desarrollo local (Next.js)
pnpm build            # Build Next.js
pnpm build:cf         # Build para Cloudflare Workers
pnpm dev:cf           # Dev con wrangler (Cloudflare)
pnpm deploy           # Deploy a producción (wrangler)
pnpm deploy:staging   # Deploy a staging

pnpm db:generate      # Generar migración Drizzle
pnpm db:migrate       # Aplicar migraciones (requiere IP en Supabase allowlist)
pnpm db:push          # Push schema directo
pnpm db:studio        # Drizzle Studio
pnpm db:seed          # Seed: planes, permisos, roles, flags

pnpm test             # Tests
pnpm lint             # ESLint
pnpm types            # Generar tipos de Cloudflare
```

## Seed

El script `scripts/seed.ts` ejecuta:

- **4 planes**: Free, Starter, Professional, Enterprise
- **19 permisos**: dashboard.*, report.*, export.*, settings.*, user.*, billing.*
- **4 roles**: admin, manager, analyst, viewer con sus permisos
- **12 feature flags**: dashboards, reports, exports_csv/excel/pdf, advanced_filters, scheduling, api_access, whitelabel, audit_log, team_management, billing
- **Plan-features, plan-quotas, plan-permissions** según el plan

```bash
source .env.local && pnpm db:seed
```

## Base de datos

- **ORM**: Drizzle (schema en `src/infrastructure/db/drizzle/schema/`)
- **Migraciones**: `src/infrastructure/db/drizzle/migrations/`
- **RLS**: `supabase/migrations/001_rls_policies.sql` (26 políticas idempotentes)
- **Seed SQL**: `supabase/migrations/0000_full_bootstrap.sql` (DDL + RLS combinado)

La conexión directa a la DB (via `SUPABASE_DATABASE_URL`) requiere que la IP esté en la allowlist de Supabase. Para desarrollo usar el **SQL Editor** de Supabase.

## Variables de entorno

Ver `.env.example` para referencia. Las variables críticas:

| Variable | Descripción |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) |
| `SUPABASE_DATABASE_URL` | Cadena de conexión directa a Postgres |

## Próximos pasos (E13)

Workers desacoplados vía Cloudflare Queues:

- **Export Worker** — Procesar cola `EXPORTS`, generar Excel/PDF, subir a R2
- **Sync Worker** — Sincronizar datos desde Wootric API
- **Billing Worker** — Facturación recurrente vía Stripe
