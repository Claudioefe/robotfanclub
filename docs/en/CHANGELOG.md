# Changelog

## Phase 0 — foundation (2026-11-17)
- Next.js 16.4 (App Router, TypeScript, `src/`), React 19, ESLint, Vitest 4, `@supabase/supabase-js` and `@supabase/ssr`.
- Placeholder page with name and tagline, smoke test, `jobs/` and `supabase/migrations/` folders.
- Scripts: `dev`, `build`, `test`, `lint`, `typecheck`.
- Verified: tests, lint, typecheck and build pass.
- Pending: preview deploy (needs a GitHub remote, D-003); development Supabase (Phase 1).

## Phase 1 — data and access (2026-11-17)
- `initial_schema` and `hardening` migrations applied to `robotfanclub-dev`: RLS tables, `security_invoker` views, private `snapshots` bucket, explicit privileges (D-015 to D-018).
- Demo client seed, Northwind Security (`npm run seed:demo`): 40 queries, 13 citations, 6 off the top 10.
- Magic-link login with no public sign-up, a proxy protecting `/portal`, a placeholder `/portal` page. Access via `npm run grant-access`.
- 23 RLS tests against the development project; read-only subagent audit and fixes.
- Verified: 24 tests, lint, typecheck.
- Pending: manual login test with a real link; decide D-009 (`any_off_top10`).
