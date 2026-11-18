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
- Pendiente: prueba con el sitio real (requiere ngrok y subir el snippet al sitio, ver `ingest.md`); deploy real del portal en una cuenta de Netlify aparte.
