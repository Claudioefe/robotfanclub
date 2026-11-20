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

## Phase 7 (piece A) — Admin (2026-11-18)
- `/admin` for staff: clients, frozen query lists, CrUX targets, sprint, Tag Bouncer, access and costs (D-037). Logic in `src/lib/admin/` with tests against the real database; `cost_by_client_day` migration.
- Verified over real HTTP: signed-out user, client user and staff; replaying the grant-access, freeze and create-client actions as a client user was refused without changing the database; the same actions as staff work.
- Pending: landing (B) and Mini-Scan (C).

## Phase 7 (pieces B and C) — Landing and Mini-Scan (2026-11-18)
- Public landing at `/` and Mini-Scan (`/mini-scan`, result through a private link), **built and switched off** (D-038). Asynchronous worker with a simulated mode and a live mode guarded by its own switch; Turnstile captcha that fails closed; cap of 30 per week and 3 per visitor per day; migration with status, `simulated` and `public_token`. A Mini-Scan section in `/admin`.

## Research on other AIs with DataForSEO (2026-11-18)
- Reading the documentation and an authorized experiment of 9 real calls (USD 0.123): ChatGPT, Gemini and LLM Mentions. Responses saved as fixtures with canary tests; results and conclusions in D-039. Nothing was built.
- Second ChatGPT experiment (6 calls, ≈ USD 0.127): Bauman 0 of 5 runs on "gifts for a book lover", rotating sources, and 122 ChatGPT mentions about rare books. Complete responses saved as fixtures + canaries (D-039).

## Phase 8 — AI visibility (2026-11-18)
- Informational module (D-040): `ai_visibility` migration, weekly job `jobs/ai-visibility/` (dry-run on saved real responses, live gated by `AI_VISIBILITY_ALLOW_LIVE` and a cost ceiling), page `/portal/<client>/ai-visibility` and "Query ideas" in Admin. Cited vs read kept apart. One real call per platform for Bauman (≈ USD 0.28), complete responses saved. Pending: apply the migration and `npm run load-real-mentions`.

## Landing (2026-11-19)
- The home page `/` is now the landing design (D-041): components in `src/components/landing/`, styles isolated under `.landing`, fonts via `next/font`. Test `tests/landing.test.tsx`; Vitest now includes `.test.tsx`. Pending: contact email (`CONTACT_EMAIL`).
- The fan robots at the final button now rotate lines while the pointer is over it ("omg a new fan?!", "let's dance!!" → "...sorry, I meant: work.", etc.).

## Guide (2026-11-19)
- New `guide.md`: the product in plain language, who does what, how citations and the 30% off-top-10 rule work (with an example), how queries are chosen today, what it takes for AI to cite you, limits and glossary. Includes the AI advisor (D-014) as "what comes next", not built.
- Public page `/guide` (same look as the landing) explaining how it works, and a "Read more" button under "How it works" on the home page. Test `tests/guide.test.tsx`.
- `/guide` in Spanish and English: EN / ES switch in the header (`/guide?lang=es`; English by default). Copy lives in `src/components/guide/copy.ts`; a test checks both languages have the same structure and the same rules.
- Portal, Admin, login and Mini-Scan in the landing style, dark only (D-042): new palette and fonts, sidebar with logo, Overview with a main figure and three key figures, labeled headers, cleaner tables.
- First real run (D-043): Bauman pilot, 15 queries, 30 checks, USD 0.094. 11 of 15 queries cited, all outside the top 10. Evidence in `tests/fixtures/real/watcher-bauman-pilot-2026-11-19/` and test `tests/watcher/pilot-data.test.ts`.
- `load-real-mentions` accepts `--client <uuid>` (two clients share Bauman's domain) and, with that flag, records cost 0 because the same capture is already costed under another client. AI visibility data was loaded into the pilot (80 rows, no DataForSEO call).
- AI visibility: the "Top questions" table has a pager (25 per page, Previous / Next, "Show all") through `?p=` in the URL; an invalid value falls back to page 1. `Pager` component and `paginate` function with tests.
- Notes of 2026-11-19: D-044 (MCP in phases: local first, remote later), D-045 (finding: the agency layer is missing before selling to another agency) and the advisor demo with Bauman (`advisor-demo-bauman.md`). None of this is built.
- Local read-only MCP (D-044, phase 1): `mcp/` with 7 tools, shared data core `src/lib/data/read.ts` (the portal uses it as before), `docs/en/mcp.md`, `tests/mcp.test.ts`, `npm run mcp`. New dependencies: `@modelcontextprotocol/sdk` and `zod`.
- Notes of 2026-11-20 (D-046): consistency tests on Google and ChatGPT with "most valuable children's books" and "which wizard of oz books are considered the best?" (USD 0.096), raw responses in `tests/fixtures/real/`, a `40101` incident on the organic call, and an (undecided) proposal for showing 60 days of data. No code or test changes.
- Second real pilot run (2026-11-20, D-046 update): 15 queries OK, 30 checks, USD 0.102; 12 of 30 checks changed state against day 1; 13 queries cited cumulatively. Off-hour run approved by the owner this once only.
- AI citations day by day (D-047): chart of cumulative and per-day citations with floor/target/bonus, a day strip per surface in every row, "days cited N of M", a per-query detail page (`/citations/query?q=…`) and the citations page uses the full width. Core: `src/lib/data/history.ts`, `getHistory`, `getQueryHistory`. The demo seed generates 38 days of checks. New tests, and the MCP tests no longer pin the pilot's day-1 numbers.
- ChatGPT on the 13 remaining pilot queries (D-046, second update): 13 runs, USD 0.052, responses in `tests/fixtures/real/dfs-chatgpt-scraper-q15-*` and test `tests/dfs-chatgpt-pilot-queries.test.ts`.
- "ChatGPT" page (D-048): `llm_runs` table (migration `20261124100000_llm_runs.sql`, still to be applied by the owner), parser `jobs/chatgpt/parse.ts`, view `src/lib/data/llm.ts`, pages `/chatgpt` and `/chatgpt/query`, a menu item, `npm run load-chatgpt-runs`, and the Costs screen adds these runs up. New tests; the RLS one is skipped until the migration is applied. The periodic job is not built.
- Notes of 2026-11-20 (D-049): cadence (ChatGPT and Google one run a day per query, ≈ USD 9.5 per 60-day window for 15 queries) and the product turn from a contract (SLA) to a flexible measurement tool. Notes only: no rule or code changes.
- D-049 (update, 2026-11-20): the SLA goes away (no 20% credit), goals stay as motivation, removed queries keep their history, admin/viewer roles later; analysis of adding and removing queries and measured costs (one query for 10 days ≈ USD 0.106; AI visibility USD 0.28 per run). Notes only.
