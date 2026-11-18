# Changelog

## Fase 0 — base (2026-11-17)
- Next.js 16.4 (App Router, TypeScript, `src/`), React 19, ESLint, Vitest 4, `@supabase/supabase-js` y `@supabase/ssr`.
- Página provisoria con nombre y tagline, prueba de humo, carpetas `jobs/` y `supabase/migrations/`.
- Scripts: `dev`, `build`, `test`, `lint`, `typecheck`.
- Verificado: tests, lint, typecheck y build pasan.
- Pendiente: deploy de preview (requiere remoto de GitHub, D-003); Supabase de desarrollo (Fase 1).

## Fase 1 — datos y acceso (2026-11-17)
- Migraciones `initial_schema` y `hardening` aplicadas a `robotfanclub-dev`: tablas con RLS, vistas `security_invoker`, bucket privado `snapshots`, permisos explícitos (D-015 a D-018).
- Seed del cliente demo Northwind Security (`npm run seed:demo`): 40 queries, 13 citas, 6 fuera del top 10.
- Login con magic link sin registro público, proxy que protege `/portal`, página `/portal` provisoria. Accesos con `npm run grant-access`.
- 23 tests de RLS contra el proyecto de desarrollo; auditoría de solo lectura con subagente y correcciones.
- Verificado: 24 tests, lint, typecheck.
- Pendiente: prueba manual del login con link real.

## Fase 2 — portal (2026-11-17)
- Tailwind 4 (D-021). Vistas `/portal`, `/citations`, `/speed`, `/setup` y enlace firmado a la evidencia (D-022). Lógica del SLA en `src/lib/sla.ts`.
- Migración `portal_speed`: fecha de deploy del sprint, línea base, vistas de INP y de evidencia de citas.
- Seed del demo ampliado y repetible (AI Mode, snapshots, ~2.600 eventos de INP, scripts de Tag Bouncer).
- Verificado: 49 tests (incluye números del prototipo contra la base: 13 citas, 6 off-top10, INP ≈213 ms), lint, typecheck, build, y una pasada de las 7 URLs como staff con sesión real (200, datos correctos, 404 para rutas inexistentes, enlace al snapshot).
- Diferencias con el prototipo: rank orgánico solo en queries citadas; los p75 por plantilla del demo quedan ~20% sobre los del prototipo por la calibración al INP de cabecera.
- Pendiente: revisión visual en navegador (claro/oscuro/celular) por el usuario; el endpoint de ingest (Fase 4).

## Fase 3 — watcher en dry-run (2026-11-17)
- Watcher en TypeScript (`jobs/watcher/`): parser, fuentes (fixtures y live), orquestador idempotente, store de Supabase y CLI. TypeScript nativo de Node (D-026).
- Clientes `real` / `demo` / `sandbox` (D-023); tabla `watcher_runs`; workflow de GitHub Actions (cron 14:00 UTC y manual).
- Modo live bloqueado por defecto, con hora fija y tope de costo (D-025, D-027). DataForSEO no se llamó nunca.
- Auditoría de solo lectura con subagente y correcciones (D-027): rutas de snapshot únicas, top 10 vacío = desconocido, reintentos solo transitorios, `kind` sin valor por defecto.
- Verificado: 96 tests (parser, orquestador, gate del live, requests simulados, y el watcher real contra la base en un cliente sandbox), lint, typecheck, build. El dry-run escribe 4 chequeos y una segunda corrida escribe 0.
- Pendiente: autorizar la cuenta y el presupuesto de DataForSEO (D-011) antes de activar el live; agregar los secrets de GitHub para el cron; evaluar bloquear el borrado de evidencia (Fase 7).

## Fase 4 — medición de visitantes reales (2026-11-18)
- `POST /api/ingest/vitals` con validación acotada, chequeo de origen, rate limit en Postgres, IP hasheada y CORS (D-028). Snippet con muestreo por sesión. `npm run create-client`.
- Cliente "EFE Digital" (`efedigital.com.ar`, `kind = demo`) para la prueba con un sitio real (D-029).
- Verificado: tests del validador, del handler, del contrato snippet↔endpoint (ejecuta el código real del snippet) y de integración con la base; prueba HTTP real sobre el build de producción (preflight, beacon con y sin www, origen ajeno, cliente inexistente, cuerpo inválido, atribución).
- **Prueba real hecha (2026-11-18):** desde `efedigital.com.ar` en un móvil llegaron LCP de 4 páginas, un CLS y un **INP de 40 ms** (toque en el botón del menú de `/cotizador/`), con atribución, a través de ngrok. La vista Speed los muestra. Se agregó un aviso de muestra baja (menos de 50 interacciones en 28 días).
- Pendiente: sacar el snippet del sitio y cerrar ngrok al terminar; deploy real del portal en una cuenta de Netlify aparte.

## Fase 5 — CrUX (2026-11-18)
- Job nocturno `jobs/crux/` (parser de `queryRecord` y `queryHistoryRecord`, fuentes fixture y live, orquestador idempotente, store de Supabase, CLI), tabla `crux_targets`, workflow de GitHub Actions a las 06:00 UTC y scripts `add-crux-target` y `crux:*` (D-031).
- Vista Speed: historial de CrUX, lectura por URL, valor de cada ventana del SLA y respaldo con CrUX para clientes sin snippet. Aviso explícito de que CrUX es global, no solo EE. UU.
- Verificado: 149 tests (parser sobre fixtures con la forma documentada por Google, orquestador, requests simulados sin filtrar la key, e integración con la base); dry-run idempotente (1 fila nueva y 0 en la segunda corrida).
- **Prueba real hecha (2026-11-18):** la key funciona (el primer 403 `PERMISSION_DENIED` fue la propagación de los cambios de restricción de la key en Google; luego 12 de 12 llamadas dieron 200). Bauman Rare Books (`demo`, sin snippet) cargado con su origen y su home: 80 filas de historial (40 semanas por objetivo) y lectura diaria idempotente. **INP p75 móvil de 77 ms, 97% de cargas ≤ 200 ms**, 28 días al 15 nov 2026. La vista Speed lo muestra con el respaldo de CrUX. Un 403 ahora se reintenta una vez antes de cortar la corrida (D-031).
- Pendiente: secrets de GitHub (`CRUX_API_KEY`) y variable `CRUX_LIVE_ENABLED=yes` para el cron nocturno.

## Fase 6 — Slack: diferida (2026-11-18)
- Decisión del dueño: queda desactivada por ahora (D-032). No se construyó. El botón "Copy for Slack" manual sigue disponible.

## Primera consulta real a DataForSEO (2026-11-18)
- Una consulta autorizada (USD 0,006) con datos reales guardados como fixtures y tests de canario. Descubrió que en móvil los resultados orgánicos vienen como redirecciones de Google, lo que invalida la comparación off-top10 por URL (D-033, pendiente de decisión). El modo live sigue bloqueado.

## Verificación de `resolve_goto_urls` y concurrencia (2026-11-18)
- Segunda consulta real autorizada (USD 0,002, 82 s): con el parámetro todas las URLs vienen reales. Fixture resuelto + tests. Corregida la normalización de URL (D-035) y agregada concurrencia al watcher (D-034). Un error mío (columna `unresolved_refs` inexistente) se detectó con el test de integración y se corrigió; hay un test que fija las columnas del insert. 172 tests.

## Datos reales de DataForSEO visibles en el portal (2026-11-18)
- `npm run load-real-sample` carga las respuestas reales bajo Bauman (pasan por el mismo parser y el mismo formato de evidencia del watcher). El portal ahora combina "Other sources" de ambas superficies (antes mostraba solo la primera) y enlaza la evidencia de cada superficie también para queries no citadas.

## Fase 7 (pieza A) — Admin (2026-11-18)
- `/admin` para staff: clientes, listas de queries congeladas, objetivos de CrUX, sprint, Tag Bouncer, accesos y costos (D-037). Lógica en `src/lib/admin/` con tests contra la base real; migración `cost_by_client_day`.
- Verificado por HTTP real: usuario sin sesión, usuario cliente y staff; reproducir con un usuario cliente las acciones de dar acceso, congelar y crear cliente fue rechazado sin cambiar la base; las mismas acciones como staff funcionan.
- Pendiente: landing (B) y Mini-Scan (C).

## Fase 7 (piezas B y C) — Landing y Mini-Scan (2026-11-18)
- Landing pública en `/` y Mini-Scan (`/mini-scan`, resultado por enlace privado), **construido y apagado** (D-038). Worker asíncrono con modo simulado y modo live protegido por su propio interruptor; captcha Turnstile que falla cerrado; tope de 30 por semana y 3 por visitante por día; migración con estado, `simulated` y `public_token`. Sección de Mini-Scan en `/admin`.
