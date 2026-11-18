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
- Pending: manual login test with a real link.

## Phase 2 — portal (2026-11-17)
- Tailwind 4 (D-021). Views `/portal`, `/citations`, `/speed`, `/setup` and a signed link to the evidence (D-022). SLA logic in `src/lib/sla.ts`.
- `portal_speed` migration: sprint deploy date, baseline, INP views and citation-evidence views.
- Extended, repeatable demo seed (AI Mode, snapshots, ~2,600 INP events, Tag Bouncer scripts).
- Verified: 49 tests (including the prototype's numbers against the database: 13 citations, 6 off-top10, INP ≈213 ms), lint, typecheck, build, and a pass over the 7 URLs as staff with a real session (200, correct data, 404 for unknown routes, snapshot link).
- Differences from the prototype: organic rank only on cited queries; the demo's per-template p75s sit ~20% above the prototype's because of the calibration to the headline INP.
- Pending: visual review in the browser (light/dark/phone) by the user; the ingest endpoint (Phase 4).

## Phase 3 — dry-run watcher (2026-11-17)
- TypeScript watcher (`jobs/watcher/`): parser, sources (fixtures and live), idempotent orchestrator, Supabase store and CLI. Node's native TypeScript (D-026).
- `real` / `demo` / `sandbox` clients (D-023); `watcher_runs` table; GitHub Actions workflow (cron 14:00 UTC and manual).
- Live mode blocked by default, with a fixed hour and a cost ceiling (D-025, D-027). DataForSEO was never called.
- Read-only subagent audit and fixes (D-027): unique snapshot paths, empty top 10 = unknown, transient-only retries, `kind` without a default.
- Verified: 96 tests (parser, orchestrator, live gate, stubbed requests, and the real watcher against the database on a sandbox client), lint, typecheck, build. The dry-run writes 4 checks and a second run writes 0.
- Pending: authorize the DataForSEO account and budget (D-011) before turning on live; add the GitHub secrets for the cron; evaluate blocking evidence deletion (Phase 7).

## Phase 4 — real-visitor measurement (2026-11-18)
- `POST /api/ingest/vitals` with bounded validation, origin check, Postgres rate limit, hashed IP and CORS (D-028). Snippet with per-session sampling. `npm run create-client`.
- Client "EFE Digital" (`efedigital.com.ar`, `kind = demo`) for the real-site test (D-029).
- Verified: validator, handler, snippet↔endpoint contract (runs the snippet's real code) and database integration tests; real HTTP test on the production build (preflight, beacon with and without www, foreign origin, unknown client, invalid body, attribution).
- **Real test done (2026-11-18):** from `efedigital.com.ar` on a phone, LCP from 4 pages, one CLS and a **40 ms INP** (a tap on the menu button on `/cotizador/`) arrived with attribution through ngrok. The Speed view shows them. A low-sample notice was added (fewer than 50 interactions in 28 days).
- Pending: remove the snippet from the site and close ngrok when done; real portal deploy in a separate Netlify account.
