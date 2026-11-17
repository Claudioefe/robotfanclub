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
- Pendiente: prueba manual del login con link real; decidir D-009 (`any_off_top10`).
