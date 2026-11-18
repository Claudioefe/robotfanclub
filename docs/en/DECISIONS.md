# Decision Log — Robot Fan Club

Each decision has a number, date, context, decision and consequences. They are never deleted: if one changes, a new entry supersedes it. Spanish version: [`../es/DECISIONS.md`](../es/DECISIONS.md) (keep both in sync).

Status: ✅ decided · ⏳ pending

---

## D-001 — Name and brand ✅ (2026-11-17)
- **Context:** the repo used "Citable" as a provisional name (spec, open decision 5).
- **Decision:** the product is **Robot Fan Club**. Tagline: **"Make the robots your biggest fans."** It replaces "Citable".
- **Consequences:** update CLAUDE.md, spec and schema. Repo folder: `rfc`.

## D-002 — Documentation and code language ✅ (2026-11-17)
- **Decision:** bilingual documentation (`docs/es/` and `docs/en/`, always in sync). All code (identifiers, comments, commit messages) in English. All user-facing product text in English. Conversation with Claude in Spanish.
- **Consequences:** every new document is written in both languages. That is extra work, so a cheaper model handles translation.

## D-003 — Local repo first ✅ (2026-11-17)
- **Decision:** local `git init`. The GitHub remote and Netlify deploy come later.
- **Consequences:** Phase 0 no longer requires a preview deploy to be considered done; that criterion moves to a later phase, once the remote exists.

## D-004 — Positioning: any agency or business ✅ (2026-11-17)
- **Context:** CLAUDE.md and the spec mentioned B2B SaaS and multi-location dental groups.
- **Decision:** the product is not niche-focused: it serves any agency or business that wants to be cited by AI and measure its speed.
- **Consequences:** copy must not mention verticals. Clients are still US-based because of the fixed measurement conditions (D-006). Per-city/per-location measurement stays out of the MVP (spec open decision 3, assumed by the user: "I suppose so").

## D-005 — What counts as a citation for the SLA ✅ (2026-11-17)
- **Decision:** a query counts as cited if it was cited in **AI Overview or AI Mode** (either one). The portal shows both surfaces separately.
- **Consequences:** the `sla_citations` view groups by query and window, regardless of surface. The count is unchanged.

## D-006 — Fixed measurement conditions ✅ (inherited from the spec)
- **Decision:** US (`location_code` 2840), English, `device: mobile`, same time every day. Changing them requires prior notice: it breaks comparability of the series.

## D-007 — Authentication ✅ (2026-11-17)
- **Decision:** Supabase Auth with magic link, no public sign-up (staff invites). Clerk is ruled out for now.

## D-008 — Agent strategy ✅ (2026-11-17)
- **Context:** control and lower quota consumption are desired.
- **Decision:** the main session decides and builds what is delicate and sequential (Phases 0–1, schema, RLS, SLA calculation). Subagents only for independent parallel work (portal and watcher after Phase 1), read-only reviews at the end of each phase (RLS, spec fidelity), and translation/doc drafts with a cheaper model. No mass workflows.
- **Consequences:** subagents do not reduce total tokens; they only isolate context. Documents are the persistent memory between sessions.

## D-009 — SLA business rules to document explicitly ✅ (proposed, to be validated)
- Off-top10 is measured **by normalized URL**, not by domain, against that same query's organic results on that same day.
- A query counts as off-top10 if **any** of its cited checks was (`bool_or`).
- `citation_rate` must be computed over the active 60-day window (a fix to the initial schema).

## D-010 — Fixes to the initial design to include in the migration ✅ (2026-11-17)
Findings from the analysis, to resolve in the first migration (nothing is migrated yet):
1. Idempotent checks: unique constraint per client, query, surface and day.
2. Missing tables: CrUX history, Tag Bouncer, sent Citation Cards, Mini-Scan and its weekly cap, ingest limits.
3. Private `snapshots` bucket policies by `client_id` (first path segment).
4. Ingest rate limit persisted in Postgres (in-memory does not work on serverless).
5. Ingest endpoint with CORS and OPTIONS (the snippet runs on third-party domains).
6. Watcher: add dry-run, store `cost_usd` and one retry per query.

## D-011 — DataForSEO: own account or the agency's ⏳
- Pending. Does not block until Phase 3. Until then, fixtures and dry-run only.

## D-012 — Phase 0 technical base ✅ (2026-11-17)
- Next.js 16.4.6 + React 19.3 + Vitest 4, no Tailwind (styles use prototype tokens in Phase 2). `npm audit` only flags dev dependencies; the fix is not forced.

## D-013 — GitHub remote configured ✅ (2026-11-17)
- **Decision:** the repo is published at https://github.com/Claudioefe/robotfanclub.git (`main` branch). The remote's initial commit (a README only) was integrated with an unrelated-histories merge. Supersedes the "local repo" part of D-003.
- **Consequences:** the Netlify preview deploy is now unblocked; it happens when instructed.

## D-014 — Intelligence layer (AI) ⏳ (idea logged 2026-11-17)
- **Idea:** make the product "intelligent": connect a model (Claude or GPT) to help measure, track and improve (e.g. explain why a citation was lost or suggest INP fixes).
- **To define:** provider (Claude or GPT), what data the model may see (client data: privacy), cost cap, and the phase it enters. To be handled after the MVP; the data schema should leave room to store the analyses.

## D-015 — Supabase configuration and explicit privileges ✅ (2026-11-17)
- **Decision:** the `robotfanclub-dev` project (East US) has Data API on, "automatically expose new tables" **off** and "automatic RLS" **on**. So the migration writes every `grant` by hand: `authenticated` only reads; `anon` gets nothing; `service_role` has full access.
- **Consequences:** the `clients.slack_webhook_url` column is not readable by users (the portal must list explicit columns, never `select *` on `clients`). Every new table or view needs its `grant` in its own migration.

## D-016 — Access model ✅ (2026-11-17)
- **Decision:** reads go only through RLS (staff or client member). All writes are done by jobs and endpoints using the secret key. No public sign-up: the magic link uses `shouldCreateUser: false` and the form reply is identical for any email (it does not reveal who has an account). Staff grants access with `npm run grant-access`.
- **Consequences:** ingest, the watcher and Mini-Scan are server routes. `mini_scans` and `ingest_rate_limits` have no policies: only the server touches them.

## D-017 — Migrations: the user applies them ✅ (2026-11-17)
- **Decision:** Supabase CLI 3.x requires human confirmation to apply migrations to the remote project (`supabase db push --remote`). Claude prepares and validates (`--dry-run`); the user runs the push in their terminal.

## D-018 — Hardening after the Phase 1 audit ✅ (2026-11-17)
Second migration `20261117150000_hardening.sql` (the initial one is not edited):
1. `organic_checked`: if the organic top 10 was unavailable, `off_top10` is not inferred from a null `organic_rank`.
2. `aio_checks` is **append-only** evidence: never updated. The watcher must use `insert ... on conflict do nothing` (a same-day rerun never erases a citation).
3. Overlapping windows for the same client and query are rejected (they would double the count).
4. Staff-only columns: `aio_checks.cost_usd` and `citation_cards.slack_error` are not readable by users; the portal lists explicit columns.
5. Default privileges for `service_role` on future tables; the `snapshots` bucket is forced private and the path policy cannot error on odd input.
6. The magic link uses `NEXT_PUBLIC_SITE_URL`, not the `Origin` header.
- **Required Supabase setting:** Authentication > Sign In / Providers: turn off "Allow new users to sign up" (and anonymous sign-ins). A test verifies it.
- **Accepted risks:** (a) with sign-up closed, Supabase answers differently for a non-existent email if someone calls the API directly (cannot be hidden); (b) raw JSON in Storage may include DataForSEO's `cost` and clients can read it; (c) frozen lists are protected in the app (server-only writes), with no database block on INSERT/DELETE.
- **Pending decisions:** sprint deploy date for the INP SLA (Phase 5).

## D-019 — Off-top10 is judged by the first citation ✅ (2026-11-17)
- **Decision:** a citation counts as off-top10 if its **first** cited check was. It replaces the `bool_or` of D-009: a later drop out of the top 10 no longer turns it off-top10. The `sla_citations` view exposes `first_off_top10` (formerly `any_off_top10`). Migration `20261117170000_first_citation_off_top10.sql`.

## D-020 — No Cache Components or Partial Prefetching ✅ (2026-11-17)
- **Context:** the `create-next-app` scaffold turned on `cacheComponents` and `partialPrefetching`; `/portal` failed with "unstable value Date.now() while prerendering".
- **Decision:** both are removed (CLAUDE.md: no opt-in/experimental features). Pages that read the session are dynamic by default. Next.js says both become standard in the next major version; revisit then.

## D-021 — Tailwind CSS ✅ (2026-11-17)
- **Decision:** the portal uses Tailwind CSS 4. It replaces the "no Tailwind" of D-012. The prototype's colors are CSS variables (light and dark following the system) mapped to Tailwind utilities (`bg-surface`, `text-muted`, `border-line`, `text-cite`…).
- **Scope:** visual fidelity to the prototype is secondary (the design will be redone later); logic, calculations and copy are kept.

## D-022 — Phase 2 (portal) decisions ✅ (2026-11-17)
1. **Tag Bouncer:** the saved action is set by staff (in the database; edited in Phase 7). Clients see a "what if" simulator that recalculates the estimate but saves nothing.
2. **Headline INP:** mobile p75 of all real-visitor events in the last 28 days. The CrUX windows are a separate panel (that is what the SLA judges) and are counted from the day after the deploy.
3. **New data (migration `20261118100000_portal_speed.sql`):** `clients.inp_sprint_deployed_on` and `inp_baseline_ms`; `tag_bouncer_scripts.label` and `is_required`; views `inp_p75_overall`, `inp_p75_daily`, `citation_first_checks` and `latest_checks`. The last two avoid PostgREST's 1000-rows-per-request cap.
4. **Out of Phase 2:** the prototype's Mini-Scan view (Phase 7) and Setup's "Database tables" and "Not built yet" sections. Setup shows only the snippet (with `web-vitals` 6.2.3 pinned).
5. **Routes:** `/portal` (list or redirect), `/portal/[clientId]` (Overview), `/citations`, `/speed`, `/setup`, and `/snapshot` (signed link to the evidence).
6. **Organic rank:** only stored for cited queries; uncited ones show "—". Copy says "top 10", not "top 50", because we measure at depth 10.
7. **Demo:** the seed now rebuilds the demo client's checks (including AI Mode, sample snapshots, ~2,600 INP events calibrated to ≈214 ms and 6 scripts). Only the demo is reset; other clients' checks stay append-only.

## D-023 — Client kinds: real, demo and sandbox ✅ (2026-11-17)
- **Problem:** the fixtures are a single synthetic response; applying it to real clients would write fake SLA evidence (append-only, and it blocks that day's real check), and it would change Northwind's 13 citations.
- **Decision:** `clients.kind`: `real` (live mode only), `demo` (Northwind; no job touches it) and `sandbox` ("Fixture Sandbox", the only client the dry-run writes to). Live refuses `demo` and `sandbox`; dry-run refuses `real`.

## D-024 — Watcher design ✅ (2026-11-17)
- Fixed time **14:00 UTC** (9:00 AM New York in winter) and UTC day; not changed without notice (D-006).
- **Idempotent:** one check per query, surface and day. A second run the same day does not call the API again (saves money) and overwrites nothing: `insert … do nothing` and snapshots without `upsert`. If only one surface is missing, only that one is filled in.
- One retry per call, with a wait. Partial failures are recorded and the run continues: if AI Mode fails but the SERP worked, the AI Overview is kept; if the SERP fails, AI Mode is saved with `organic_checked = false` (the organic rank is not guessed). The run only "fails" (exit 1) if nothing worked.
- `cost_usd` per check and one `watcher_runs` row per run (mode, checks written, errors, cost). The raw JSON is always stored, even when there is no AI answer (it is evidence of absence).

## D-025 — Live mode is blocked by default ✅ (2026-11-17)
- Calling DataForSEO needs three things at once: `--mode live`, `WATCHER_ALLOW_LIVE=yes` (on GitHub, the repository variable `WATCHER_LIVE_ENABLED`) and `DFS_LOGIN`/`DFS_PASSWORD`. Without the variable it does not run, even with credentials. Tests use only fixtures and a stubbed `fetch`.
- Scheduled runs are dry-run until the owner enables live (D-011 is still pending: account and budget).

## D-026 — Native TypeScript in jobs ✅ (2026-11-17)
- Node 24 (Actions) and 25 (local) run `.ts` with no dependencies: jobs import with the `.ts` extension and use only erasable syntax (`erasableSyntaxOnly`). `tsx` is not installed. `package.json` declares `"type": "module"`.

## D-027 — Watcher hardening after the Phase 3 audit ✅ (2026-11-17)
Code plus migration `20261119120000_watcher_hardening.sql`:
1. **Unique snapshot paths:** `{client}/{day}/{surface}/{slug}-{hash of the query}-{time}.json`. Before, two queries with the same slug (case, punctuation, non-ASCII, truncation at 80) shared a file and the evidence was silently wrong. An existing snapshot is now an error, not ignored.
2. **An empty top 10 is "unknown":** a SERP without organic results sets `organic_checked = false`; it no longer turns every citation into off-top10. A 20000 response without a `result` is a **failure**, not "no AI answer".
3. **D-019 refined:** `first_off_top10` is judged on the first citation whose organic top 10 was known (`organic_checked`). A check without a top 10 does not decide.
4. **Retries only for transient errors** (network, timeout, 429, 5xx). An authentication or funds error (HTTP 401/402/403 or code 40100–40299) **stops the whole run**. 120 s timeout per call and a **per-run cost ceiling** (`WATCHER_MAX_COST_USD`, default USD 5).
5. **`clients.kind` has no default:** it must be chosen when creating a client (before, forgetting it meant `real` and was billed in live).
6. **Fixed hour reinforced:** live refuses to run outside 14:00–16:59 UTC unless `WATCHER_ALLOW_OFF_HOUR=yes`. DataForSEO credentials only reach the workflow's live step. A live run with failures ends red (GitHub emails the owner).
7. A failure in one client does not cut the others, and the run is always closed in `watcher_runs`. `existing()` pages (PostgREST's 1000-row cap).
8. The parser recognizes the client by the domain field **or** the URL host.
- **Verified in DataForSEO's public documentation (no API call):** AI Mode returns the same `ai_overview` / `ai_overview_reference` as the SERP, nested in elements, tables and expanded components.
- **Business rules documented:** if several client pages are cited, the first by source position defines the citation; the URL is normalized without the query string (`?utm=…` does not change the page).
- **Accepted risks:** (a) the secret key can still delete evidence (the trigger only blocks `UPDATE`); mitigation: backups, to be evaluated in Phase 7; (b) GitHub actions are pinned by tag, not SHA; (c) GitHub disables cron after 60 days without repo activity: a heartbeat or a check is needed; (d) the cost of a failed-but-billed call is unknown and not in `cost_usd`.

## D-028 — Speed ingest endpoint (Phase 4) ✅ (2026-11-18)
- `POST /api/ingest/vitals`: public on purpose (the snippet runs on the client's site). Accepts `text/plain` (sendBeacon) and JSON, which are the same JSON. Answers `204` (stored, or silently dropped if the client does not exist), `400` (invalid payload), `403` (foreign origin), `413` (large body), `429` (rate limit) and `503` (database unavailable, no details).
- **Bounded validation:** metric INP/LCP/CLS, value capped per metric, URL as a path template (no query or hash, so no personal data is kept), attribution reduced to an allow-list of scalar keys with strings up to 200 characters.
- **Origin:** if the browser sends `Origin`, it must be the client's domain or a subdomain (www included). Without `Origin` (curl, servers) it is accepted and the rate limit covers it. For development, `INGEST_EXTRA_ORIGINS`.
- **Rate limit persisted in Postgres:** 120 events per minute per visitor and 6000 per client. The IP is stored only as an HMAC with the secret key, never in the clear.
- **Snippet:** per-session sampling (`SAMPLE_RATE`, `NEXT_PUBLIC_SNIPPET_SAMPLE_RATE`) to bound volume and cost. A test runs the snippet's real code against the endpoint's parser so they cannot drift apart.
- Clients are registered with `npm run create-client` (`--kind` required) until the admin exists (Phase 7).

## D-029 — Test with a real site through ngrok ✅ (2026-11-18)
- **Test site:** `efedigital.com.ar` (Astro on Netlify, personal site, outside the agency), registered as client "EFE Digital" with `kind = demo` (no job touches it). It has no CSP, so no headers need changing.
- **How:** the app runs locally in production mode and ngrok (free plan) exposes it on its fixed domain; the snippet points at that domain. This avoids creating a project in the Netlify account that hosts the site, whose credits are per team (going over pauses all projects).
- **Later:** the portal's real deploy will go in a separate Netlify account.
- **ngrok free plan limits** (per its documentation): ≈20,000 requests and 1 GB per month. Sampling keeps usage down.

## D-030 — Snippet address separate from the portal's ✅ (2026-11-18)
- **Problem:** using `NEXT_PUBLIC_SITE_URL` to point the snippet at the ngrok tunnel also changed the login magic link's redirect, which is not in Supabase's allowed URLs, and login stopped working.
- **Decision:** `NEXT_PUBLIC_INGEST_URL` sets where the snippet sends events (tunnel or deployed portal; if missing, it falls back to `NEXT_PUBLIC_SITE_URL`). `NEXT_PUBLIC_SITE_URL` is only for login.
- **First real test (2026-11-18):** an 884 ms LCP and a ≈0 CLS arrived from a phone, with attribution, through the tunnel and from the real domain. No INP until there is an interaction.

## D-031 — CrUX job (Phase 5) ✅ (2026-11-18)
- **Source:** Google's Chrome UX Report API (`queryRecord` for the current 28-day window and `queryHistoryRecord` for the weekly history of up to 40 periods). `PHONE` only and INP only. Free (150 queries per minute per project, per the official docs); needs an API key restricted to that API.
- **What is queried:** the `crux_targets` table explicitly lists origin and key URLs per client. CrUX distinguishes `https://www.x.com` from `https://x.com`, so it is not derived from the domain.
- **Idempotent:** one row per target and period (`period_end`); a period already stored is not touched. A Google 404 means **"no data"** (low traffic), not an error. A key or disabled-API error (400/401/403) stops the run; 429, 5xx and also 403 are retried once (after a key's restrictions change, Google can answer 403 for a few minutes: seen in practice). The key goes in the URL (Google's format) and is never written to messages or logs.
- **Modes:** dry-run uses fixtures and `sandbox` clients only; live uses the API and `real` and `demo` clients (the data is public and free), never `sandbox`. A live run with failures ends red.
- **Cadence:** 06:00 UTC; Google updates ~04:00 UTC and publishes ~2 days behind. The history is **weekly** and each point is a 28-day window overlapping its neighbours: it serves the trend and the baseline (`--backfill` once when a client is added), not aligning the SLA windows.
- **SLA windows:** a window's value (it starts the day after the deploy) is the daily reading whose `period_end` equals the window's end. That reading exists if the job ran that day (two days after the close): hence the workflow must run every day and fails red. If it is missing, the view says Google publishes the value about two days after the close.
- **Geography:** the CrUX API **does not filter by country**: the data is global. "US" in the rules applies only to Google searches; the view says so.
- **Speed view:** history chart, per-URL reading, each SLA window's value when it exists and, for clients without the snippet (like Bauman), CrUX's INP as the headline, labelled as Google's.
- **Test client:** Bauman Rare Books (an agency client, no snippet; public domain only, `kind = demo`).
