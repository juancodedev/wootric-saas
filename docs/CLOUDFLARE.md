# Cloudflare Configuración — Wootric SaaS

## Workers

| Worker | Ruta | Propósito |
|--------|------|-----------|
| `wootric-saas` | `app.wootric.com/*` | Main App (Next.js + API routes) |
| `wootric-saas-export-worker` | — | Export processing (Queue consumer) |
| `wootric-saas-sync-worker` | — | Sync + Cron jobs (Queue consumer) |
| `wootric-saas-billing-worker` | — | Stripe webhooks (Queue consumer) |

## Bindings

### KV Namespaces

| Binding | Propósito |
|---------|-----------|
| `KV_CACHE` | Cache de roles, permisos, tenant config (TTL 60s) |
| `KV_RATE_LIMIT` | Rate limiting sliding-window |
| `KV_SESSIONS` | Sesiones de usuario (refresh tokens) |

### R2 Buckets

| Binding | Bucket | Propósito |
|---------|--------|-----------|
| `R2_EXPORTS` | `wootric-saas-exports` | Archivos exportados (Excel, PDF) — signed URLs 1h |

### Queues

| Binding | Queue | Producer | Consumer |
|---------|-------|----------|----------|
| `QUEUE_EXPORTS` | `wootric-exports` | Main Worker | Export Worker |
| `QUEUE_SYNC` | `wootric-sync` | Main Worker | Sync Worker |
| `QUEUE_BILLING` | `wootric-billing` | Main Worker | Billing Worker |

### Service Bindings

| Binding | Target Worker |
|---------|---------------|
| `EXPORT_WORKER` | `wootric-saas-export-worker` |
| `SYNC_WORKER` | `wootric-saas-sync-worker` |

## Wrangler Commands

### Desarrollo Local

```bash
# Main App (Next.js + OpenNext)
pnpm dev            # Next.js dev server
pnpm dev:cf         # Wrangler local (con bindings simulados)

# Workers individuales
pnpm --filter sync-worker dev
pnpm --filter export-worker dev
pnpm --filter billing-worker dev

# Workers con wrangler directo
cd workers/sync-worker && wrangler dev
cd workers/export-worker && wrangler dev
cd workers/billing-worker && wrangler dev
```

### Build

```bash
pnpm build          # Next.js build
pnpm build:cf       # OpenNext Cloudflare build
```

### Deploy

```bash
pnpm deploy                  # Producción (main worker)
pnpm deploy:staging          # Staging

# Workers individuales
cd workers/sync-worker && wrangler deploy
cd workers/export-worker && wrangler deploy
cd workers/billing-worker && wrangler deploy
```

### Gestión

```bash
pnpm types          # Generar worker-configuration.d.ts (bindings types)
wrangler tail       # Logs en tiempo real (main worker)
wrangler tail --env staging
wrangler kv key list --binding KV_CACHE
wrangler r2 bucket list
wrangler queue list
```

## Observabilidad

Configurado en todos los workers (`wrangler.jsonc`):

```json
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 0.5
  }
}
```

- **Dashboard**: Cloudflare Dashboard → Workers & Pages → Observability
- **Logs**: `wrangler tail` para debugging en tiempo real
- **Métricas**: Request count, CPU time, Subrequests, KV/R2 operations

## Environments

### Production
- **Route**: `app.wootric.com/*`
- **Name**: `wootric-saas`
- **Workers**: `wootric-saas`, `*-sync-worker`, `*-export-worker`, `*-billing-worker`

### Staging
- **Route**: `staging.app.wootric.com/*`
- **Name**: `wootric-saas-staging`
- **Workers**: `wootric-saas-staging`, `*-sync-worker-staging`, etc.

## Variables de Entorno

### Main Worker (`wrangler.jsonc`)
| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_APP_URL` | App URL para redirects |
| `LOG_LEVEL` | Pino log level (debug/info/warn/error) |
| `RATE_LIMIT_WINDOW_SECONDS` | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window |
| `STORAGE_BUCKET` | R2 bucket name |

### Sync Worker (`workers/sync-worker/wrangler.jsonc`)
| Variable | Descripción |
|----------|-------------|
| `LOG_LEVEL` | Log level |
| `SYNC_BATCH_SIZE` | Batch size for sync (default: 100) |
| `SYNC_RATE_LIMIT_RPM` | Wootric API rate limit (default: 60) |
| `WOOTRIC_API_URL` | Wootric API endpoint |

### Billing Worker (`workers/billing-worker/wrangler.jsonc`)
| Variable | Descripción |
|----------|-------------|
| `LOG_LEVEL` | Log level |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Secrets (`.dev.vars` / Cloudflare Dashboard)

Variables sensibles configuradas como secrets en producción:

| Secret | Workers |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Todos |
| `STRIPE_SECRET_KEY` | Main + Billing |
| `STRIPE_WEBHOOK_SECRET` | Billing |
| `WOOTRIC_USERNAME` | Main + Sync |
| `WOOTRIC_PASSWORD` | Main + Sync |
| `JWT_SECRET` | Main |
