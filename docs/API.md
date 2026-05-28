# API Reference — Wootric SaaS

Base URL: `https://app.wootric.com`

## Autenticación

Todas las rutas (excepto auth) requieren header `Authorization: Bearer <jwt>`.

El JWT se obtiene via `POST /api/auth/login` o `POST /api/auth/register`.

---

## Auth

### `POST /api/auth/register`

Crear tenant + usuario admin + Stripe customer.

```json
// Request
{ "email": "user@example.com", "password": "secure123", "tenant_name": "Mi Empresa" }

// Response 201
{ "token": "eyJ...", "user": { "id": "uuid", "email": "user@example.com" }, "tenant": { "id": "uuid", "name": "Mi Empresa" } }
```

### `POST /api/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "secure123" }

// Response 200
{ "token": "eyJ...", "user": { "id": "uuid", "email": "user@example.com", "role": "admin" } }
```

### `POST /api/auth/refresh`

```json
// Request
{ "refresh_token": "..." }

// Response 200
{ "token": "eyJ..." }
```

### `POST /api/auth/invite`

Requiere permiso: `user.invite`

```json
// Request
{ "email": "colleague@example.com", "role_id": "uuid" }

// Response 201
{ "invite": { "id": "uuid", "email": "colleague@example.com", "status": "pending" } }
```

---

## Tenants

Requiere autenticación. Opera sobre el tenant del token JWT.

### `GET /api/tenants`

```json
// Response 200
{ "id": "uuid", "name": "Mi Empresa", "slug": "mi-empresa", "status": "active", "created_at": "..." }
```

### `PATCH /api/tenants`

```json
// Request
{ "name": "Nuevo Nombre" }

// Response 200
{ "id": "uuid", "name": "Nuevo Nombre", ... }
```

### `GET /api/tenants/config`

```json
// Response 200
{ "branding": { "logo_url": "...", "primary_color": "#6366f1" }, "settings": { "timezone": "UTC", "locale": "en" }, "metadata": {}, "access_level": "full" }
```

### `PATCH /api/tenants/config`

```json
// Request
{ "branding": { "primary_color": "#ff0000" } }

// Response 200
{ "branding": { "logo_url": "...", "primary_color": "#ff0000" }, ... }
```

---

## Billing

Requiere permiso: `billing.manage`

### `POST /api/billing/checkout`

Crear Stripe Checkout Session para cambio de plan.

```json
// Request
{ "price_id": "price_xxx", "plan_slug": "pro", "billing_interval": "monthly" }

// Response 200
{ "url": "https://checkout.stripe.com/c/pay_xxx" }
```

### `POST /api/billing/portal`

Obtener link al Customer Portal de Stripe.

```json
// Request (opcional)
{ "return_url": "https://app.wootric.com/settings/billing" }

// Response 200
{ "url": "https://billing.stripe.com/p/session_xxx" }
```

### `GET /api/billing/subscription`

```json
// Response 200
{ "id": "sub_1", "plan_slug": "pro", "status": "active", "current_period_end": "2026-06-01T00:00:00Z", "billing_interval": "monthly", "invoices": [{ "id": "in_1", "amount": 9900, "status": "paid", "created": "..." }] }
```

### `DELETE /api/billing/subscription`

Cancelar suscripción. Requiere confirmación.

```json
// Response 200
{ "message": "Subscription cancelled. Service will continue until end of billing period." }
```

---

## Admin

Requiere permiso: `admin.manage`

### `GET /api/admin/tenants`

Listar tenants con paginación.

Query params: `?page=1&limit=20&search=mi-empresa&status=active`

```json
// Response 200
{ "tenants": [{ "id": "uuid", "name": "Mi Empresa", "slug": "mi-empresa", "status": "active", "created_at": "...", "plan_slug": "pro" }], "total": 42, "page": 1, "limit": 20 }
```

### `PATCH /api/admin/tenants`

Actualizar cualquier tenant.

```json
// Request
{ "tenant_id": "uuid", "status": "suspended" }

// Response 200
{ "id": "uuid", "status": "suspended", ... }
```

### `GET /api/admin/plans`

```json
// Response 200
[{ "id": "uuid", "slug": "free", "name": "Free", "tier": "free", "price_monthly": 0, "price_yearly": 0, "is_active": true, "sort_order": 0 }]
```

### `POST /api/admin/plans`

```json
// Request
{ "slug": "enterprise", "name": "Enterprise", "tier": "enterprise", "price_monthly": 29900, "price_yearly": 299000, "description": "For large organizations", "sort_order": 10 }

// Response 201
{ "id": "uuid", ... }
```

### `PATCH /api/admin/plans`

```json
// Request
{ "plan_id": "uuid", "price_monthly": 39900 }

// Response 200
{ "id": "uuid", "price_monthly": 39900, ... }
```

---

## Feature Flags

### `GET /api/feature-flags`

```json
// Response 200
[{ "slug": "dashboards", "enabled": true }, { "slug": "reports", "enabled": true }]
```

### `POST /api/feature-flags`

Crear override de feature flag para el tenant.

```json
// Request
{ "slug": "exports_pdf", "enabled": true }

// Response 201
{ "slug": "exports_pdf", "enabled": true, "override": true }
```

### `DELETE /api/feature-flags`

Query param: `?slug=exports_pdf`

```json
// Response 200
{ "message": "Override removed" }
```

---

## Subscriptions & Quotas

### `GET /api/subscriptions`

```json
// Response 200
{ "plan": { "slug": "pro", "name": "Professional", "tier": "pro" }, "status": "active", "trial_end": null, "current_period_end": "2026-06-01T00:00:00Z" }
```

### `GET /api/quotas`

```json
// Response 200
[{ "key": "dashboards", "label": "Dashboards", "limit": 10, "used": 3, "remaining": 7 }, { "key": "reports", "label": "Reports", "limit": 50, "used": 12, "remaining": 38 }]
```

---

## Dashboards & Widgets

### `GET /api/dashboards`

```json
// Response 200
[{ "id": "uuid", "name": "Ventas", "description": "Dashboard de ventas", "widget_count": 4, "created_at": "...", "updated_at": "..." }]
```

### `POST /api/dashboards`

```json
// Request
{ "name": "Ventas", "description": "Dashboard de ventas" }

// Response 201
{ "id": "uuid", "name": "Ventas", ... }
```

### `GET /api/dashboards/[id]`

```json
// Response 200
{ "id": "uuid", "name": "Ventas", "widgets": [{ "id": "uuid", "type": "line_chart", "title": "Revenue", "x": 0, "y": 0, "w": 6, "h": 4 }] }
```

### `PATCH /api/dashboards/[id]`

```json
// Request
{ "name": "Nuevo nombre" }

// Response 200
{ "id": "uuid", "name": "Nuevo nombre", ... }
```

### `DELETE /api/dashboards/[id]`

Soft delete.

```json
// Response 200
{ "message": "Dashboard deleted" }
```

### `POST /api/dashboards/[id]/restore`

```json
// Response 200
{ "message": "Dashboard restored" }
```

### Widgets sub-routes

- `GET /api/dashboards/[id]/widgets` — Listar widgets del dashboard
- `POST /api/dashboards/[id]/widgets` — Crear widget
- `PATCH /api/dashboards/[id]/widgets/[widgetId]` — Actualizar widget
- `DELETE /api/dashboards/[id]/widgets/[widgetId]` — Eliminar widget
- `POST /api/dashboards/[id]/widgets/reorder` — Reordenar widgets

Widget types: `line_chart`, `bar_chart`, `pie_chart`, `table`, `metric`, `text`

---

## Reports & Exports

### `GET /api/reports`

```json
// Response 200
[{ "id": "uuid", "name": "Monthly Report", "type": "responses", "schedule": "monthly", "created_at": "..." }]
```

### `POST /api/reports`

```json
// Request
{ "name": "Monthly Report", "type": "responses", "config": { "date_range": "last_30_days", "format": "xlsx" }, "schedule": null }

// Response 201
{ "id": "uuid", ... }
```

### `POST /api/reports/[id]/export`

Iniciar exportación asíncrona via Queue.

```json
// Response 202
{ "export_id": "uuid", "status": "pending" }
```

### `GET /api/exports/[id]`

```json
// Response 200
{ "id": "uuid", "status": "completed", "url": "https://r2.cloudflare.com/exports/uuid/file.xlsx", "expires_at": "..." }
```

---

## RBAC

### `GET /api/rbac/permissions`

```json
// Response 200
[{ "id": "uuid", "slug": "dashboard.read", "name": "Read Dashboards", "group": "dashboard" }]
```

### `GET /api/rbac/roles`

```json
// Response 200
[{ "id": "uuid", "name": "Manager", "slug": "manager", "permissions": ["dashboard.read", "dashboard.write", "reports.view"] }]
```

### `POST /api/rbac/assign`

```json
// Request
{ "user_id": "uuid", "role_id": "uuid" }

// Response 200
{ "message": "Role assigned" }
```

---

## Errors

```json
// 400 Bad Request
{ "error": "Validation Error", "details": [{ "path": "email", "message": "Invalid email" }] }

// 401 Unauthorized
{ "error": "Invalid or expired token" }

// 402 Payment Required
{ "error": "No active subscription" }

// 403 Forbidden
{ "error": "Insufficient permissions", "required": ["billing.manage"] }

// 429 Too Many Requests
{ "error": "Rate limit exceeded" }

// 500 Internal Error
{ "error": "Internal server error" }
```
