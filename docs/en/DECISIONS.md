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

## D-032 — Phase 6 (Slack) deferred; temporary snippet on the test site ✅ (2026-11-18)
- **Slack:** automatic Citation Cards stay **off for now**. The webhook sending is not built (`clients.slack_webhook_url` still exists, empty and unreadable by users; `citation_cards` already has its columns). The portal's "Copy for Slack" button keeps working: it copies the text to paste by hand. Resumed when decided (needs a client's Slack webhook).
- **Test site:** `efedigital.com.ar` temporarily keeps the speed snippet pointing at the ngrok tunnel (`SAMPLE_RATE = 1`). The owner will remove it later. Meanwhile: with the computer and ngrok off the events are lost, and every visitor downloads `web-vitals` from `unpkg.com`. To remove it: delete the `<script is:inline type="module">` block from `BaseLayout.astro`, push, and close ngrok.

## D-033 — First real DataForSEO query and a finding about off-top10 ⏳ (2026-11-18)
- **One-off authorization:** the owner authorized **one** real query (organic SERP with AI Overview + AI Mode) to get example data. Query: "how to tell if a book is a first edition", US, English, mobile, `depth` 10. Claude made it with the session's DataForSEO connection, which points to the owner's **own** trial account (USD 1 credit). Actual cost: SERP **USD 0.002** (the async AI Overview added no separate charge) + AI Mode **USD 0.004** = **USD 0.006** per query per day. Any further real query needs a new authorization. The responses are in `tests/fixtures/real/` (the AI Mode one trimmed and labelled) with canary tests.
- **Result:** the AI Overview cited 10 unique pages (26 mentions); AI Mode, only AbeBooks. **Bauman was not cited** (nor does it appear in the organic results). The parser and URL deduplication work with real data, and AI Mode uses the same types as the SERP, as the docs say.
- **Finding 1 (serious, unresolved): on mobile, organic results do not carry the real URL.** They come as redirect links `google.com/goto?url=<encrypted token>` with `domain: "google.com"`. Only `breadcrumb` gives the origin site (e.g. `https://www.reddit.com`), not the page, and sometimes not even that. With this, the **off-top10 rule by normalized URL never finds a match**: every citation would come out "outside the top 10" and meeting the 30% target would be trivial and false (it favours the vendor). There is no harm today because live mode never ran.
- **Finding 2: one AI Overview reference (1 of 10) was also a redirect** with `domain: "google.com"` and `source: "Quill & Brush"`. If a client's page came this way the parser would not see it and **citations would be undercounted**. The raw JSON is kept as evidence.
- **Update:** see D-034 (`resolve_goto_urls` exists; the "unknown" rank rule is already implemented).
- **Options for finding 1** (the owner's decision; it touches the "by URL, not by domain" rule and the "mobile" condition):
  - **A.** Add an organic call on **desktop** only to get the top 10 with real URLs; the AI Overview and AI Mode stay on mobile. Cost +USD 0.002 per query per day (≈ +33%, USD 0.008 total).
  - **B.** Stay on mobile and compare by **site** using `breadcrumb`. Weaker than "by URL" and fails when there is no breadcrumb.
  - **C.** Ask DataForSEO whether a parameter returns the real URL on mobile (free; not tried).
  - **Recommendation:** C first; if there is no fix, A. Meanwhile the watcher's live mode stays blocked.
- **Finding 2, possible mitigation:** record how many references per check are unattributed redirects, to show uncertainty in the portal. Pending decision.

## D-034 — `goto` redirects: DataForSEO parameter and an "unknown" organic rank ✅ (2026-11-18)
Result of option C from D-033 (a look at DataForSEO's documentation; no spend):
- **`resolve_goto_urls` exists** (boolean, default `false`) on the organic SERP: it resolves the redirects to their real URL. It adds up to 40 s of wait (maximum 260 s); the documentation states no extra charge. The watcher always sends it on the organic call and its timeout goes up to 280 s. **Not yet verified with a real call.**
- **Google's limit:** per [DataForSEO's Nov 2 notice](https://dataforseo.com/update/new-goto-url-limits-and-how-this-affects-your-results), Google limits how many redirects can be resolved per page; in *Live* mode about 50% are resolved and the **standard queue** (`task_post`/`task_get`, slower) resolves all of them. For AI Overview, DataForSEO reported (Aug 27) that 52% of SERPs had at least one unresolved redirect, and announced a fix on Aug 28; it says nothing about AI Mode.
- **New rule (in the parser, no spend):** if the top 10 carries unresolved redirects and the cited page is not among the resolved results, the organic rank is **unknown** (`organic_checked = false`), never "outside the top 10". If the page does appear, the rank is known. With D-027, a check with an unknown rank does not decide off-top10 (`first_off_top10` is `false` if none was known): **when in doubt, the vendor is not favoured**.
- **Unresolved AI Overview references:** the parser counts them (`unresolved_refs`, not persisted today; it is in the raw JSON), does not use them for `other_domains`, and keeps them apart (they are not merged by URL). A citation hidden behind a redirect is still invisible: an accepted risk of undercounting citations, to be watched.
- **Pending:** one real call with `resolve_goto_urls: true` (needs a new authorization) to measure how many resolve in Live; if few, evaluate the standard queue (≈ USD 0.0024 per query per day per the spec, with polling) or option A from D-033 (organic on desktop).

## D-034 (update) — Verified with a real call ✅ (2026-11-18)
Second authorized query (same query, `resolve_goto_urls: true`): **all** URLs came back resolved, both the 8 organic results and the AI Overview references (the one that used to be a redirect turned out to be `qbbooks.com`). Cost **USD 0.002**, **no extra charge** for the parameter. But it **took 82 s** (the first query without the parameter took ~13 s). One sample cannot prove that Live always resolves everything: DataForSEO warned that Live resolves ~50% under Google's limit; the watcher already handles unresolved ones as an "unknown" rank. Trimmed fixture at `tests/fixtures/real/dfs-organic-mobile-resolved-real.json`.
- **Concurrency:** 40 queries at 82 s each in sequence is ~55 min per client per day. The orchestrator now runs several queries at once (`concurrency`; the CLI uses 4 in live, 1 in dry-run, and `WATCHER_CONCURRENCY` changes it). With concurrency, the cost ceiling and the stop on a fatal error can overshoot by the queries already in flight. SERPs change between calls (the first query had Reddit at rank 1 and the second, Pinterest): that is why the top 10 is always compared against the one from the same call.
- **Live cost per query per day: USD 0.006** (SERP 0.002 + AI Mode 0.004), as before.

## D-035 — The normalized URL keeps the parameters that identify the page ✅ (2026-11-18)
- **Problem (found with real data):** normalization dropped the whole query string. On YouTube `?v=<id>` identifies the video: the cited video and a different video ranking organically came out as "the same page". It happens with any site that identifies pages with parameters (`?p=123`).
- **Decision:** `normUrl` keeps the parameters, sorted, and drops only tracking ones (`utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `dclid`, `mc_cid`, `mc_eid`, `igshid`, `_ga`, `_gl`), the hash and the trailing slash. It corrects what D-027 said ("no query"). Unresolved redirect references are told apart by their full URL.

## D-036 — No projection in the first week ✅ (2026-11-18)
- **Problem (seen with a real client, day 1):** with 0 citations the portal said "Clawback risk: projected below 12", an unfounded alarm (a straight-line projection from 1 day of data is noise).
- **Decision:** during the first 6 days of the window the portal neither projects nor warns about a clawback: it says "Day N of 60: too early to project" and the rule applies from day 7 (`MIN_PROJECTION_DAYS`). If the floor of 12 is already met, it says that. This is a UI rule; **the SLA does not change**: the credit is decided on day 60.

## D-037 — Staff Admin (Phase 7, piece A) ✅ (2026-11-18)
- **What it is:** `/admin`, staff only. It replaces the terminal scripts: adding clients (with a required `kind`), the frozen query list, CrUX targets, sprint deploy date and baseline, Tag Bouncer scripts (the editing D-022 left for this phase), user access and API costs.
- **Layered security (verified over real HTTP):** (1) the proxy sends signed-out visitors to `/login`; (2) the layout and **every page** check in the database that the user is staff and redirect to `/portal` if not (layouts and pages render in parallel, so a page cannot rely on the layout alone); (3) **every server action calls `assertStaff()` first**, because an action is a public POST: replaying the grant-access, freeze and create-client actions as a client user was refused without changing the database (Next answers 500 on the `Forbidden`, with no data). Actions use the secret key only on the server, after the check.
- **Logic outside Next.js:** `src/lib/admin/validate.ts` (pure) and `ops.ts` (takes a Supabase client), tested against the real database. Every form input goes through a validation before reaching the database.
- **Product rules applied:** at most 60 queries per window (counted after removing duplicates, ignoring case); 60-day window; a frozen list is not edited: freezing another creates a **new window that starts the day after the running one ends**, so they never overlap. A required script (e.g. the consent banner) cannot be removed and is outside the SLA.
- **Default decisions:** granting access **creates the account and the membership without sending any email** (the person opens `/login` and asks for their link; sign-up stays closed, D-016); the Slack webhook field **does not appear** (D-032); there is **no deletion** of clients or checks (evidence is append-only); CrUX targets (their history is kept), Tag Bouncer scripts and access (the account is kept) can be removed.
- **Costs:** new view `cost_by_client_day` (migration `20261121100000_admin_costs.sql`), readable only with the secret key because `cost_usd` is a staff-only column.

## D-038 — Public Mini-Scan, built and switched off (Phase 7, pieces B and C) ✅ (2026-11-18)
- **Status: off by default.** `MINI_SCAN_MODE` = `off` (default; `/mini-scan` says "Coming soon" and refuses everything), `simulated` (made-up results, labelled as such, for testing only) or `live` (real DataForSEO spend). Any value other than `simulated` or `live` counts as `off`. This option was chosen so simulated results are never shown to real prospects.
- **Asynchronous:** a real query takes ~80 s, so the form only **queues** the request and a separate process runs it (`jobs/miniscan/`, workflow every 10 min). The visitor gets a **private, unguessable link** (`/mini-scan/<token>`, kept out of search engines) with a page that refreshes itself. Nothing in the web request calls DataForSEO, so a visitor can never trigger spend directly.
- **What it checks:** only the AI Overview (organic call, `resolve_goto_urls`): does Google answer with AI, and does it cite the domain? ≈ **USD 0.002 per query, USD 0.05 per scan of 25**. The result and a copyable outreach text use facts from the scan, no promises.
- **Protections, in this order:** mode switch → captcha (live only; Cloudflare Turnstile, **fails closed**: no key or no token does not pass) → input limits (valid domain, 1 to 25 queries, honeypot) → **30 scans per week in total** and **3 per visitor per day** (by HMAC-hashed IP, never in the clear). The caps count only scans of the same kind as the current mode (test scans do not use up the real budget). Two simultaneous requests can overshoot the cap by one or two: accepted.
- **Simulated and real never mix** (`mini_scans.simulated`, like `clients.kind` in D-023): the dry-run worker only processes simulated scans and live only real ones. Live needs its **own** switch `MINISCAN_ALLOW_LIVE=yes` (the owner's spending authorization), the credentials, and it stops on authentication or funds errors.
- **Mode read on every request:** `/mini-scan` is dynamic (`force-dynamic`). A first version was prerendered at build time and stayed fixed to the mode of that moment; the real-HTTP test caught it (in simulated mode the form did not appear). Changing the mode does not need a rebuild.
- **Visitor data:** no email is asked. The domain, the queries and the IP hash are stored. The result page shows neither the cost nor the hash.
- **Landing (`/`):** name, tagline, what it measures, how it works and ways into the Mini-Scan and login. No verticals (D-004) and no promises: it describes what the product does. All text in English.
- **To open it to the public** (the owner's decision, D-011 pending): create a Cloudflare Turnstile account (`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`), set `MINI_SCAN_MODE=live` on the server and, on GitHub, the variable `MINI_SCAN_MODE=live` with `MINISCAN_ALLOW_LIVE=yes` and the DataForSEO secrets.
