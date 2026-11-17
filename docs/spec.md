# Spec: Citable MVP

## Qué resuelve
Una agencia vende dos servicios con SLA a clientes de EE. UU.:
1. **AIO Pro**: lograr que Google AI Overviews y AI Mode citen al cliente (piso 12, objetivo 18, bonus 25 citas en 60 días).
2. **INP Sprint**: bajar el INP p75 mobile a 200 ms o menos.

El portal es la prueba del trabajo: el cliente ve sus citas, la evidencia y la velocidad sin pedir reportes.

## Usuarios y permisos
- **Staff** (agencia): ve todos los clientes, crea clientes, carga y congela listas de queries, ve costos de API.
- **Cliente**: ve solo su workspace, en modo lectura. Puede tener varios usuarios.
- Login con magic link (Supabase Auth). Sin registro público: el staff invita.

## Módulos

### 1. Clientes y listas de queries (admin)
- Crear cliente: nombre, dominio (sin www), fee del servicio, webhook de Slack opcional.
- Cargar lista de queries (pegar una por línea, máximo 60) y congelarla: `frozen_from` = hoy, `frozen_until` = hoy + 59 días. Una lista congelada no se edita; para cambiarla se crea una ventana nueva.

### 2. Citas en IA
- Job diario (`aio-watcher`): por cada query de una ventana activa, consulta DataForSEO:
  - Google Organic SERP advanced, `depth: 10`, `load_async_ai_overview: true` (trae AI Overview y top 10 en una llamada).
  - Google AI Mode advanced.
- Por cada superficie guarda una fila en `aio_checks`: si hubo respuesta de IA, si citó al cliente, URL citada, posición entre las fuentes, cantidad de fuentes, rank orgánico de la URL citada (o null si no está en el top 10), otros dominios citados, ruta del snapshot y costo de la llamada.
- Snapshot: JSON crudo en Storage, `snapshots/{client_id}/{fecha}/{surface}/{query-slug}.json`.
- Modo dry-run: lee `tests/fixtures/` en vez de llamar a la API. Es el modo por defecto hasta que se autorice el gasto.
- Reintentos: un reintento por query con espera; si falla, se registra el error y sigue con la siguiente.

### 3. Vistas del portal (referencia: `prototype/portal-mvp.html`)
- **Overview**: citas acumuladas, proyección lineal al día 60, regla graduada con piso/objetivo/bonus, estado del SLA (incluye riesgo de clawback), % off-top10 contra 30%, resumen de INP, últimas 3 Citation Cards.
- **AI citations**: tabla de las queries congeladas con filtros (todas, citadas, off-top10, respuesta de IA sin el cliente), superficie (AI Overview / AI Mode), tasa de cita por query, enlace al snapshot.
- **Speed**: INP p75 mobile por template, tendencia de 28 días, estado de las dos ventanas de CrUX, Tag Bouncer.
- **Setup**: snippet de medición de visitantes reales con el `client_id` del cliente ya completado.

### 4. Velocidad (RUM + CrUX)
- Endpoint `POST /api/ingest/vitals`: acepta `text/plain` (sendBeacon) y JSON; valida campos; descarta eventos de `client_id` inexistentes; rate limit simple por IP y cliente; inserta con la secret key.
- Snippet con `web-vitals` (build de atribución) que manda INP, LCP y CLS con el template de URL. Fijar la versión exacta en la documentación del snippet.
- Job nocturno de CrUX API: p75 de INP mobile por origin y por URLs clave; guardar historial diario para mostrar las ventanas de 28 días.
- Tag Bouncer: lista de scripts de terceros por cliente con tiempo de bloqueo y acción elegida (mantener, cargar en la primera interacción, mover a server-side, quitar). La estimación es orientativa y debe decirlo en la UI.

### 5. Citation Cards y Slack
- Cuando el watcher detecta la primera cita de una query en la ventana, publica una Citation Card en el webhook de Slack del cliente (query, URL citada, posición, si es off-top10, fecha, link al portal).
- Botón "Copy for Slack" en cada card del portal.

### 6. Mini-Scan (captación)
- Formulario público: dominio + hasta 25 queries. Consulta en vivo (requiere autorización de gasto), muestra la brecha de citas y genera un resumen copiable para outreach.
- Tope de 30 escaneos por semana en total y captcha o verificación por email para evitar abuso.

## Fases
Cada fase termina con algo que corre y se puede probar.

**Fase 0: base.** Repo, Next.js + TypeScript, lint, Vitest, conexión a un proyecto Supabase de desarrollo, deploy de preview en Netlify conectado al repo de GitHub.
Listo cuando: la app despliega y `npm test` pasa.

**Fase 1: datos y acceso.** Migración desde `supabase/schema.sql`, seed con el cliente demo del prototipo (Northwind Security, 40 queries, ~13 citas), login con magic link, rol staff.
Listo cuando: un usuario cliente ve solo su cliente, el staff ve todos, y hay tests de RLS.

**Fase 2: portal.** Portar Overview, AI citations, Speed y Setup leyendo de Supabase, con el mismo diseño del prototipo, mobile y modo oscuro.
Listo cuando: el portal con datos del seed se ve y calcula igual que el prototipo.

**Fase 3: watcher en dry-run.** Portar `scripts/aio-watcher.mjs` a TypeScript, tests del parser con los fixtures, workflow de GitHub Actions en modo dry-run.
Listo cuando: los tests pasan y el dry-run escribe chequeos que aparecen en el portal.
**Freno:** no activar llamadas reales hasta que yo autorice cuenta y presupuesto de DataForSEO.

**Fase 4: medición de visitantes reales.** Endpoint de ingest, snippet en Setup, vista de p75.
Listo cuando: una página de prueba con el snippet manda eventos y se ven en Speed.

**Fase 5: CrUX.** Job nocturno y estado de las ventanas en Speed.

**Fase 6: Slack.** Citation Cards automáticas al detectar citas nuevas.

**Fase 7: admin, Mini-Scan y landing.**

## Costos de referencia (DataForSEO, noviembre 2026; verificar antes de activar)
Por query y por día en modo Live: SERP orgánica $0.002 + AI Overview asíncrono $0.0006 + AI Mode $0.004 ≈ $0.0066. Con 40 queries por 60 días ≈ $16 por cliente. La cola estándar es más barata (≈ $0.0024 por query y día) pero requiere postback o polling. Guardar el `cost` de cada respuesta para mostrarlo en admin.

## Decisiones abiertas (preguntarme antes de asumir)
1. Cuenta de DataForSEO: ¿propia o de la agencia?
2. ¿AI Overview y AI Mode cuentan juntos para el SLA? Propuesta por defecto: una query cuenta si fue citada en cualquiera de las dos; el portal muestra ambas por separado.
3. Grupos dentales: medir por ciudad de cada sede multiplica queries y costo. Fuera del MVP salvo que diga lo contrario.
4. Auth: Supabase Auth por defecto (menos servicios). Alternativa: Clerk.
5. Nombre y marca definitivos.
