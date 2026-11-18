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

## Phase 5 — CrUX (2026-11-18)
- Nightly job `jobs/crux/` (parsers for `queryRecord` and `queryHistoryRecord`, fixture and live sources, idempotent orchestrator, Supabase store, CLI), `crux_targets` table, GitHub Actions workflow at 06:00 UTC and the `add-crux-target` and `crux:*` scripts (D-031).
- Speed view: CrUX history, per-URL reading, each SLA window's value and a CrUX fallback for clients without the snippet. Explicit notice that CrUX is global, not only US.
- Verified: 149 tests (parsers on fixtures shaped as Google documents them, orchestrator, stubbed requests that never leak the key, and database integration); idempotent dry-run (1 new row, then 0 on the second run).
- **Real test done (2026-11-18):** the key works (the first 403 `PERMISSION_DENIED` was Google propagating the key's restriction changes; afterwards 12 of 12 calls were 200). Bauman Rare Books (`demo`, no snippet) loaded with its origin and home page: 80 history rows (40 weeks per target) and an idempotent daily read. **Mobile INP p75 of 77 ms, 97% of loads ≤ 200 ms**, 28 days to Nov 15, 2026. The Speed view shows it through the CrUX fallback. A 403 is now retried once before stopping the run (D-031).
- Pending: GitHub secret `CRUX_API_KEY` and variable `CRUX_LIVE_ENABLED=yes` for the nightly cron.

## Phase 6 — Slack: deferred (2026-11-18)
- Owner's decision: it stays off for now (D-032). Not built. The manual "Copy for Slack" button remains available.

## First real DataForSEO query (2026-11-18)
- One authorized query (USD 0.006) with real data saved as fixtures and canary tests. It found that on mobile organic results come as Google redirects, which breaks the off-top10 comparison by URL (D-033, decision pending). Live mode stays blocked.

## `resolve_goto_urls` verification and concurrency (2026-11-18)
- Second authorized real query (USD 0.002, 82 s): with the parameter every URL comes back real. Resolved fixture + tests. URL normalization fixed (D-035) and watcher concurrency added (D-034). A mistake of mine (a non-existent `unresolved_refs` column) was caught by the integration test and fixed; a test now pins the insert's columns. 172 tests.

## Real DataForSEO data visible in the portal (2026-11-18)
- `npm run load-real-sample` loads the real responses under Bauman (through the watcher's own parser and evidence format). The portal now merges "Other sources" from both surfaces (it used to show only the first one) and links the evidence of each surface also for uncited queries.
