# Deploy — Wootric SaaS

## Requisitos

- Node.js >= 22 (`.nvmrc`)
- pnpm (`corepack enable pnpm`)
- Cloudflare API Token con permisos:
  - `workers:write`
  - `workers_routes:write`
  - `kv:write`
  - `r2:write`
  - `queues:write`

## Entornos

| Entorno | URL | Worker Name |
|---------|-----|-------------|
| Production | `https://app.wootric.com` | `wootric-saas` |
| Staging | `https://staging.app.wootric.com` | `wootric-saas-staging` |

## Pipeline de Deploy

### 1. Pre-deploy

```bash
# Tests
pnpm test                    # Unit tests
npx tsc --noEmit             # Type check

# Lint
pnpm lint

# Build
pnpm build:cf                # OpenNext Cloudflare build

# Dry run (validar bindings, routes, vars)
wrangler deploy --dry-run
```

### 2. Deploy Workers (orden específico)

```bash
# 1. Workers desacoplados primero (dependencias de Queue)
cd workers/billing-worker && wrangler deploy --env production
cd workers/export-worker && wrangler deploy --env production
cd workers/sync-worker && wrangler deploy --env production

# 2. Main Worker (último, referencia los workers via service bindings)
cd / && pnpm deploy
```

### 3. Post-deploy

```bash
# Verificar
wrangler tail --format=json | head -20
curl -s https://app.wootric.com/api/health | jq .

# Smoke tests
curl -s -o /dev/null -w "%{http_code}" https://app.wootric.com/api/plans
curl -s -o /dev/null -w "%{http_code}" https://app.wootric.com/api/auth/login -X POST -d '{"email":"test@test.com","password":"test"}'
```

## Configuración de Dominios

### Cloudflare Dashboard

1. Ir a **Workers & Pages** → **wootric-saas** → **Triggers**
2. Agregar ruta: `app.wootric.com/*` → Worker `wootric-saas`
3. **DNS**: Registrar `app.wootric.com` como CNAME a `wootric-saas.workers.dev`
4. Habilitar **Proxy (orange cloud)** para WAF, DDoS, SSL
5. **Wildcard**: `*.app.wootric.com` → Worker `wootric-saas`

### DNS Records

```
app.wootric.com  CNAME  wootric-saas.workers.dev  (proxied)
*.app.wootric.com  CNAME  wootric-saas.workers.dev  (proxied)
```

## Variables de Entorno por Entorno

### Production (wrangler.jsonc → env.production)

```json
{
  "vars": {
    "NEXT_PUBLIC_APP_URL": "https://app.wootric.com",
    "LOG_LEVEL": "info"
  }
}
```

### Staging (wrangler.jsonc → env.staging)

```json
{
  "name": "wootric-saas-staging",
  "vars": {
    "NEXT_PUBLIC_APP_URL": "https://staging.app.wootric.com",
    "LOG_LEVEL": "debug"
  }
}
```

## Secrets

Los secrets se configuran en Cloudflare Dashboard o via wrangler:

```bash
echo "supersecret" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY
echo "sk_test_xxx" | wrangler secret put STRIPE_SECRET_KEY
echo "whsec_xxx" | wrangler secret put STRIPE_WEBHOOK_SECRET
echo "user" | wrangler secret put WOOTRIC_USERNAME
echo "pass" | wrangler secret put WOOTRIC_PASSWORD
```

Para workers individuales:
```bash
cd workers/sync-worker && echo "supersecret" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Migraciones de Base de Datos

```bash
# Generar migración
pnpm db:generate

# Aplicar migración (requiere IP en allowlist de Supabase)
pnpm db:migrate

# Push directo (desarrollo)
pnpm db:push

# Seed (planes, permisos, roles, flags)
source .env.local && pnpm db:seed
```

## Rollback

```bash
# Wrangler versionado automáticamente
wrangler rollback            # Última versión
wrangler rollback --version 3  # Versión específica

# Migración DB: usar Supabase Dashboard → Database → Migrations
```

## Troubleshooting

### wrangler deploy falla por bindings
Verificar que todos los workers (sync, export, billing) estén desplegados primero.

### Queues no entregan mensajes
- Verificar Queue name en worker producer y consumer
- Verificar `max_retries` y `max_batch_timeout` en consumer config

### Stripe webhooks no llegan
- `STRIPE_WEBHOOK_SECRET` debe coincidir con el configurado en Stripe Dashboard
- Verificar que el Billing Worker esté desplegado y reciba tráfico

### Type errors con wrangler types
```bash
pnpm types  # Regenera worker-configuration.d.ts
```
