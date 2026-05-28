# Plan de Mejoras — Wootric Settings & Data Management

## Estado Actual

- Una sola pagina (`/`): lista de dashboards + feature flags read-only (badges ON/OFF sin toggle)
- Sin layout navegable: no hay sidebar, no hay `/dashboard`, no hay `/settings`
- Feature flags: backend tiene toggle (POST/DELETE) pero frontend no lo usa
- Sync worker existente (`workers/sync-worker/`) ya sabe traer datos de Wootric (API credentials desde `tenant_config`)
- Export worker existente (`workers/export-worker/`) ya sabe generar Excel/PDF/
- Sin UI de configuracion: no hay formulario para poner API URL, username, password
- `tenant_config`: tabla con campos JSONB `settings` y `metadata` — ideal para guardar credenciales
- Auth client (`src/lib/auth-client.ts`) usa localStorage: `wootric_access_token`, `wootric_refresh_token`

---

## Fase 1 — Fundacion: Layout, Sidebar y Routing

### Objetivo
Crear una estructura de navegacion con sidebar y routing que soporte todas las fases siguientes.

### Archivos a crear
| Archivo | Proposito |
|---|---|
| `src/app/dashboard/layout.tsx` | Layout con sidebar para todas las paginas del dashboard |
| `src/app/dashboard/page.tsx` | Pagina actual de dashboard (migrar desde `/`) |
| `src/app/dashboard/loading.tsx` | Skeleton loader |
| `src/app/dashboard/settings/wootric/page.tsx` | Placeholder para Fase 2 |
| `src/app/dashboard/data/page.tsx` | Placeholder para Fase 3 |
| `src/app/dashboard/exports/page.tsx` | Placeholder para Fase 4 |

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/app/page.tsx` | Redirigir a `/dashboard` o dejar como landing/public |

### Componentes
| Archivo | Proposito |
|---|---|
| `src/components/dashboard/sidebar.tsx` | Sidebar con links e iconos |
| `src/components/dashboard/sidebar-item.tsx` | Item individual con active state |

### UX
- Sidebar a la izquierda, fondo oscuro o semi-oscuro
- Iconos + texto para cada seccion
- Active state highlight
- Breadcrumb opcional en header
- Responsive: sidebar colapsable en mobile

### Checklist tecnico
- [ ] Layout con sidebar fijo (sticky)
- [ ] Active route detection (`usePathname`)
- [ ] Nested layout con `children`
- [ ] Migrar `page.tsx` actual a `/dashboard/page.tsx`
- [ ] El middleware debe seguir funcionando para `/dashboard/*`
- [ ] Links: Dashboard, Feature Flags (en /dashboard), Integraciones, Data Explorer, Exportaciones

---

## Fase 2 — Configuracion de Wootric (Settings)

### Objetivo
Formulario para configurar credenciales de la API de Wootric y testear conexion.

### Archivos a crear
| Archivo | Proposito |
|---|---|
| `src/app/api/wootric/test/route.ts` | POST: test connection (fetch 1 response) |
| `src/components/wootric/credentials-form.tsx` | Formulario de credenciales |
| `src/components/wootric/connection-test.tsx` | Boton + feedback de test |

### Backend
- `POST /api/wootric/test`: recibe `{ apiUrl, username, password }`, intenta `GET /v1/responses?per_page=1`, devuelve `{ ok, message }`
- `PATCH /api/tenants/config`: ya existe, guarda en `settings->wootric`

### Flujo UX
1. Usuario navega a Integraciones > Wootric
2. Ve formulario con campos: API URL, Username, Password
3. Llena campos, hace clic en "Test Connection"
4. Feedback: ✅ Connected o ❌ Error (con mensaje)
5. Si OK, hace clic en "Save"
6. Credenciales guardadas en `tenant_config.settings->wootric`

### Consideraciones
- Password enmascarado (input type="password")
- El GET de prueba no requiere auth — Wootric usa Basic Auth
- Timeout de 10s para el test

---

## Fase 3 — Data Explorer (Fetch & Preview)

### Objetivo
Interfaz para consultar responses de Wootric con filtros y previsualizar en tabla.

### Archivos a crear
| Archivo | Proposito |
|---|---|
| `src/app/api/wootric/fetch/route.ts` | POST: fetch responses from Wootric API |
| `src/application/services/WootricService.ts` | Servicio para llamar API de Wootric desde el server |
| `src/components/wootric/data-table.tsx` | Tabla paginada con preview de responses |
| `src/components/wootric/date-range-picker.tsx` | Selector de rango de fechas |
| `src/components/wootric/fetch-controls.tsx` | Controles: fechas, filtros, boton fetch |

### Backend
- `POST /api/wootric/fetch`: 
  - Request: `{ startDate, endDate, page, perPage }`
  - Response: `{ data: Response[], total, page, totalPages }`
  - Usa `WootricService` que implementa la misma logica que `WootricApiClient` del sync worker
  - Lee credenciales de `tenant_config.settings->wootric`

### UX
1. Usuario va a Data Explorer en sidebar
2. Ve controles: date range picker, boton "Fetch Data"
3. Hace clic y ve skeleton loader
4. Tabla con columnas: submitted_at, score, comment, email, etc.
5. Paginacion (10, 25, 50 rows)
6. Columna sort opcional

### Consideraciones
- Solo responses endpoint (`/v1/responses`)
- Paginacion cursor-based (Wootric usa `links.next`)
- Cache de 5 min para evitar golpear API repetidamente
- El servicio debe reutilizar logica del sync worker (rate limiter, retry)

---

## Fase 4 — Exportacion de Datos (CSV/Excel)

### Objetivo
Descargar los datos consultados en CSV o Excel.

### Archivos a crear
| Archivo | Proposito |
|---|---|
| `src/app/api/wootric/export/route.ts` | POST: inicia exportacion |
| `src/components/wootric/export-modal.tsx` | Modal con selector de formato |
| `src/components/wootric/export-progress.tsx` | Indicador de progreso |

### Backend
- `POST /api/wootric/export`:
  - Request: `{ startDate, endDate, format: "csv" | "excel" }`
  - Opcion A (sync): generar CSV/Excel server-side y devolver directo
  - Opcion B (async): encolar en `QUEUE_EXPORTS` y devolver export_id
  - Para CSV: streaming directo con `Content-Type: text/csv`
  - Para Excel: usar `exceljs` (ya disponible en el proyecto)

### UX
1. Boton "Export" en la tabla de Data Explorer
2. Modal: selector de formato (CSV/Excel), filename
3. Click "Download" → descarga directa (sync) o progreso (async)
4. Historial de exportaciones en `/dashboard/exports`

### Consideraciones
- CSV es mas simple y rapido — ideal para sync response
- Excel permite mas formato — usar worker async
- Si el dataset es grande (>10k rows), forzar async con cola
- Usar `QuotaService` para limitar exports (ya existe `max_exports`)

---

## Fase 5 — Feature Flags Interactivos

### Objetivo
Convertir los badges ON/OFF en toggle switches funcionales.

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/app/dashboard/page.tsx` | Reemplazar badges con toggle switches |

### Backend (ya existe)
- `POST /api/feature-flags` → setOverride
- `DELETE /api/feature-flags?key=xxx` → removeOverride

### UX
- Toggle switch con animacion
- Optimistic update: cambia inmediato, revierte si error
- Tooltip con descripcion del flag
- Confirmacion si el cambio afecta capacidades del plan

---

## Estructura Final de Archivos

```
src/
  app/
    dashboard/
      layout.tsx              ← Sidebar + nav layout
      page.tsx                ← Dashboard (migrado desde /)
      loading.tsx             ← Skeleton loader
      settings/
        wootric/
          page.tsx            ← Wootric credentials form
      data/
        page.tsx              ← Data explorer
      exports/
        page.tsx              ← Export history
    api/
      wootric/
        test/route.ts         ← POST: test connection
        fetch/route.ts        ← POST: fetch responses
        export/route.ts       ← POST: export data
  components/
    dashboard/
      sidebar.tsx             ← Sidebar
      sidebar-item.tsx        ← Sidebar item
      toggle-switch.tsx       ← Reusable toggle
    wootric/
      credentials-form.tsx    ← Credentials form
      connection-test.tsx     ← Connection test button
      data-table.tsx          ← Paginated data table
      date-range-picker.tsx   ← Date range selector
      fetch-controls.tsx      ← Fetch controls bar
      export-modal.tsx        ← Export format modal
      export-progress.tsx     ← Export progress indicator
  application/
    services/
      WootricService.ts       ← Wootric API calls (server-side)
```

## Consideraciones Tecnicas

| Aspecto | Decision |
|---|---|
| Credenciales | Guardar en `tenant_config.settings->wootric` (JSONB), encryptar en el futuro |
| Fetch server vs worker | Para preview: `WootricService` directo (misma logica que sync-worker). Para export masivo: worker via queue |
| RLS | Endpoints de Wootric usan service role, no anon key |
| Rate limiting | `WootricApiClient` ya tiene rate limiter (60 RPM default) — reutilizable |
| Paginacion | Wootric API retorna `{ data: [...], links: { next } }` — cursor-based |
| CSV | Generar server-side con streaming |
| Excel | Usar `exceljs` (ya disponible), procesar en worker async |
