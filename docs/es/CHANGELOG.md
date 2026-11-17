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
