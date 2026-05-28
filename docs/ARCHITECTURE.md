# Arquitectura — Wootric SaaS

## Visión General

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                     │
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐  │
│  │   Main Worker       │    │   Export Worker          │  │
│  │   (Next.js + API)   │◄──►│   (Queue Consumer)       │  │
│  │   app.wootric.com   │    │   Excel/PDF → R2         │  │
│  └──────────┬──────────┘    └─────────────────────────┘  │
│             │                                               │
│  ┌──────────▼──────────┐    ┌─────────────────────────┐  │
│  │   Sync Worker        │    │   Billing Worker         │  │
│  │   (Queue Consumer)   │    │   (Queue Consumer)       │  │
│  │   Cron Jobs + Sync   │    │   Stripe Webhooks        │  │
│  └─────────────────────┘    └─────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Cloudflare Infrastructure               │  │
│  │  KV (Cache/Sessions)  R2 (Exports)  Queues (Async)   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                   │
│  RLS Policies  ·  Drizzle ORM  ·  Migraciones            │
└─────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### Request Flow
1. Usuario → `app.wootric.com` (via Cloudflare DNS proxied)
2. Middleware pipeline (11 pasos):
   - Secure Headers → Rate Limit → CSRF → JWT Auth
   - Tenant Resolution → Tenant Active → Subscription Check
   - Permission Enforcement → Feature Flag → Quota → Audit
3. API Route handler
4. Supabase query (service-role, bypass RLS)

### Async Jobs Flow
1. API Route → Queue message
2. Worker consumes queue → procesa → escribe resultado
3. Main Worker consulta resultado via Service Binding

## Decisiones Técnicas Clave

| Decisión | Opciones | Elegida | Razón |
|----------|----------|---------|-------|
| **Auth** | NextAuth · Clerk · Custom JWT | Custom JWT (jose) | Multi-tenancy complejo, sin overhead de SDK |
| **ORM** | Prisma · Kysely · Drizzle | Drizzle | Bundle size mínimo, soporte nativo Edge |
| **DI** | NestJS · tsyringe · manual | tsyringe | Ligero, decoradores, fácil testing |
| **Jobs** | BullMQ · Inngest · CF Queues | Cloudflare Queues | Bindings nativos, sin servidor extra |
| **Stripe** | Stripe SDK · REST API | REST API directa | Compatibilidad Workers (no Node.js) |
| **Testing** | Jest · Vitest | Vitest | Nativo ESM, compatible CF Workers |
| **Deploy** | Vercel · Cloudflare Pages | Cloudflare Workers | Bindings, compute en edge |

## Cron Jobs (Sync Worker)

| Expresión | Propósito |
|-----------|-----------|
| `*/30 * * * *` | Sincronización Wootric API |
| `0 0 * * *` | Trial expiration check |
| `0 1 * * *` | Quota reset diario |
| `0 3 * * 0` | Audit log cleanup semanal |
| Adicional | Grace period escalation (on-demand) |

## Stripe Integration

### Webhooks (Billing Worker)
- `checkout.session.completed` → Activar plan
- `invoice.payment_succeeded` → Extender período
- `invoice.payment_failed` → Iniciar grace period
- `customer.subscription.updated` → Cambios de plan
- `customer.subscription.deleted` → Downgrade a Free

### Grace Period
- **Día 0-2**: Operación normal, alertas internas
- **Día 3**: `access_level = read_only` en tenant_config
- **Día 7**: `status = suspended` en tenants

## Middleware Pipeline

Definido en `src/middleware.ts` con configuración por ruta en `route-guards.ts`:

```
Request → Secure Headers
       → Rate Limit (KV sliding window)
       → CSRF (Origin + SameSite)
       → JWT Auth (jose verify)
       → Tenant Resolution (subdomain → KV/Supabase)
       → Tenant Active (status check)
       → Subscription Check (grace period aware)
       → Permission Enforcement (RBAC)
       → Feature Flag Check
       → Quota Check
       → Audit Log (fire-and-forget)
       → API Route
```

## Estructura de Directorios

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   └── (pages)/           # Frontend pages
├── application/
│   ├── services/          # Servicios de aplicación
│   └── __tests__/         # Tests unitarios
├── di/                    # tsyringe DI container
├── domain/                # Entidades, Value Objects, Puertos
├── infrastructure/
│   ├── auth/              # Auth, JWT, Registration
│   ├── db/                # Drizzle schema, migrations
│   └── middleware/        # Route guards, pipeline steps
├── lib/                   # Utilidades (Stripe API, helpers)
└── middleware.ts           # Edge middleware pipeline
workers/
├── sync-worker/           # Sync + Cron worker
├── export-worker/         # Export processing worker
└── billing-worker/        # Stripe webhook worker
```
