# Plan: Migración de Basic Auth a OAuth 2.0 + Gráficos NPS

## Problema Detectado

Hoy la integración con Wootric usa **Basic Auth** (username:password en header `Authorization: Basic`).
La API real de Wootric funciona con **OAuth 2.0**:
1. `POST /oauth/token` con `grant_type=password` + email + password → devuelve `access_token` + `refresh_token`
2. Todas las requests subsiguientes usan `Authorization: Bearer <access_token>`
3. El `access_token` expira en 7200 segundos (2 horas)
4. Se puede refrescar con `grant_type=refresh_token`

Además:
- El filtro de fechas usa UNIX timestamps: `created[gt]=TIMESTAMP&created[lt]=TIMESTAMP`
- Paginación máxima: 50 per_page, 30 pages
- Rate limit: 100 req/min (con headers `X-Rate-Limit-*`)

---

## Flujo de Settings (Formulario de Integración)

### Estado Actual (a cambiar)
```
Campos: API URL | Username | Password
Test: GET /v1/responses?per_page=1 con Basic Auth
```

### Nuevo Estado
```
Campos: API URL | Email | Password
Test: POST /oauth/token con grant_type=password + email + password
      → Obtiene access_token + refresh_token
      → Opcional: GET /v1/responses?per_page=1 con Bearer token para validar
Save: Guarda api_url, email, password, access_token, refresh_token, expires_at
      en tenant_config.settings->wootric
```

---

## Cambios Necesarios

### 1. `WootricService.ts` — Migrar Auth + Arreglar Fechas

```typescript
// NUEVOS métodos de OAuth
async function getAccessToken(credentials): Promise<{ accessToken, refreshToken, expiresAt }>
  - POST /oauth/token con grant_type=password
  - Devuelve tokens

async function refreshAccessToken(refreshToken): Promise<{ accessToken, refreshToken, expiresAt }>
  - POST /oauth/token con grant_type=refresh_token
  - Devuelve nuevos tokens

async function ensureValidToken(): Promise<string>
  - Si token expirado, refresca
  - Si no, devuelve current
  - Cachea en memoria (no disco)

// CAMBIAR request() para usar Bearer token
- En vez de: Authorization: Basic <btoa(user:pass)>
- Usar: Authorization: Bearer <access_token>

// ARREGLAR fetchResponses() para usar UNIX timestamps
- En vez de: start_date / end_date (ISO strings)
- Usar: created[gt]=UNIX_TIMESTAMP&created[lt]=UNIX_TIMESTAMP
```

### 2. `POST /api/wootric/test` — Test con OAuth

```
Request Body: { apiUrl, email, password }
Acción:
  1. POST /oauth/token con grant_type=password + email + password
  2. Si ok → { ok: true, message: "Connected", expiresIn: 7200 }
  3. Si fail → { ok: false, message: "Invalid credentials" }
```

### 3. `GET /api/wootric` — Devolver estado de tokens

```
Response: { configured: boolean, config: { apiUrl, email, tokenExpiresAt } }
```

### 4. `POST /api/wootric/fetch` — Usar OAuth + UNIX timestamps

```
- Leer credentials + tokens de tenant_config
- Usar WootricService con OAuth
- Convertir fechas ISO a UNIX timestamps para created[gt]/created[lt]
- Paginación: max 50 per_page
```

### 5. Frontend: `settings/wootric/page.tsx`

```
- "Username" → "Email"
- Test Connection → llama a /oauth/token
- Save → guarda api_url + email + password + tokens
```

---

## Gráficos en Data Explorer (Fase C)

### Librería: Recharts
Agregar dependencia: `pnpm add recharts`

### Componentes a crear

| Archivo | Propósito |
|---|---|
| `src/components/wootric/nps-score-card.tsx` | Tarjeta con NPS Score grande + categorías |
| `src/components/wootric/score-distribution-chart.tsx` | Bar chart: scores 0-10 |
| `src/components/wootric/nps-donut-chart.tsx` | Donut: Promoters / Passives / Detractors |
| `src/components/wootric/trend-chart.tsx` | Line chart: promedio por día |
| `src/components/wootric/volume-chart.tsx` | Bar chart: respuestas por día |
| `src/components/wootric/dashboard-charts.tsx` | Contenedor que agrupa todos los charts |

### Datos a calcular

```typescript
function calculateNps(responses) {
  const promoters = responses.filter(r => r.score >= 9).length;
  const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  const total = responses.length;
  return {
    npsScore: total > 0 ? ((promoters / total) - (detractors / total)) * 100 : 0,
    promoters: { count: promoters, pct: (promoters / total) * 100 },
    passives:  { count: passives, pct: (passives / total) * 100 },
    detractors: { count: detractors, pct: (detractors / total) * 100 },
    total,
    averageScore: total > 0 ? responses.reduce((s, r) => s + r.score, 0) / total : 0,
  };
}
```

### Ubicación en Data Explorer

Dos modos de visualización (tabs):
- **📋 Data** — tabla actual con paginación
- **📊 Analytics** — gráficos + NPS Score

---

## Orden de Implementación

1. `WootricService.ts` — OAuth + UNIX timestamps
2. Test endpoint + Settings UI — test via `/oauth/token`, guardar tokens
3. Fetch + Export — verificar OAuth
4. Recharts + gráficos
