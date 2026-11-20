# Plan: from a frozen SLA to a flexible measurement tool (D-049)

Status: **plan approved, Phase 1 awaiting OK, not executed**.

Rollback point: git tag `v1-sla-frozen` (commit 8f68cf0), the stable version before the turn. None of this is built until the owner approves it. Until then the code keeps the current rules.

## What changes (decided in D-049)
- The contract is retired: no 20% credit, no mandatory frozen list, no fixed 60-day window.
- Queries are added and removed whenever the user wants. A removed query keeps its history.
- Goals stay as motivation, as a **percentage** of the tracked queries (default 30 / 45 / 60%, editable per client), also showing the equivalent number.
- The product shows **where the client started and where they are after X days**.
- Unchanged: the raw JSON of every check in Storage, fixed conditions (US, English, mobile, same hour), RLS, views with `security_invoker`.

## Phases (each ends with tests, es/en docs, a commit and your OK to move on)

### Phase 1 — Data model (migration; you apply it with `supabase db push --remote`)
- New table `tracked_queries` (`client_id`, `query`, `started_on`, `ended_on`; null = active). A query can have several periods (removing and re-adding opens a new one). No overlapping-window guard; one constraint instead: a single active period per query and client.
- Copy of what exists: each `query_sets` row becomes a `tracked_queries` row with `started_on = frozen_from` and a null `ended_on`. `query_sets` is **not dropped** in this phase (retired later, once nothing reads it).
- Per-client goals: columns `goal_floor_pct`, `goal_target_pct`, `goal_bonus_pct` (30 / 45 / 60 by default).
- Summary views (`citations_by_query` and the ones that use `frozen_from`) rewritten on `tracked_queries`, each with `security_invoker = true`. The `citation_cards` key stops depending on `frozen_from`.
- RLS on `tracked_queries`: read through `can_read_client`; writes by the server only (for now; roles in Phase 7).
- New RLS tests and the demo test adapted.

### Phase 2 — Data core and calculations (no UI)
- `history.ts`: the day axis becomes the chosen period (not a fixed window) and a **"not tracked"** state appears (the query was not being tracked that day), distinct from "not checked".
- `goals.ts` (replaces `sla.ts` for citations): goals in %, equivalent number, "progress toward goal" state. No contractual projection or credit status.
- Cohort metrics: proportion ("9 of 15 tracked, 60%"), **baseline** (each query's first check), **"same queries"** comparison start vs today (won, lost, stable) for queries with at least X days, and markers for **when the list changed**.
- The 30% off-top-10 rule becomes an informational metric.
- Unit tests with the pilot's real fixtures.

### Phase 3 — Watcher and jobs
- The watcher reads the active queries from `tracked_queries` instead of the current window; days with no active query spend nothing.
- Monthly spend cap per client (aborts with a notice when reached) and a visible estimated daily cost. `WATCHER_ALLOW_LIVE` and `WATCHER_MAX_COST_USD` stay.
- Periodic ChatGPT job (one run per query per day, ≈ USD 0.004 per query) behind the same guards. No real calls without your explicit authorization.
- Admin > Costs also adds AI visibility.

### Phase 4 — Portal: Overview and AI citations
- Overview: "at start → today" with goals in %, no SLA status, no linear projection, no credit.
- AI citations: chart and strip with list-change markers; period selector ("last 30 / 60 / 90 days / since the start").
- ChatGPT page updated to the new model.

### Phase 5 — Adding and removing queries
- **Queries** page in the portal and in Admin: add (showing the estimated daily cost), remove (with confirmation; history stays), view removed ones. Validation: count limit and duplicates.
- Admin: replaces "freeze list" with this management.

### Phase 6 — Retire the citations SLA in copy and docs
- Landing, `/guide`, `docs/es` and `docs/en`, `docs/spec.md`, `prototype` (reference only) and `CLAUDE.md`: remove the 20% and the refund, and rewrite "Product rules" with the flexible model. Remove the "change in progress" note.
- MCP tools updated (`get_history`, `get_llm_runs` and the wording of the existing ones).
- Drop `query_sets` and the fixed-window code once nothing uses it.

### Phase 7 — Roles (later, together with the agency layer D-045)
- Inside each agency: **admin** (adds and removes queries, edits goals, invites) and **viewer** (read only).

## What you have to do
- Apply each migration (Phase 1; and one more in Phase 6 to retire `query_sets`).
- Give the OK to move between phases and for any real DataForSEO call.

## Decisions (approved by the owner on 2026-11-20, as proposed)
1. **Does the INP Sprint keep its SLA?** (INP p75 ≤ 200 ms over two CrUX windows). We only talked about citations; I propose leaving it untouched until you decide.
2. **"X days" for comparing start vs today:** I propose 14 by default (editable).
3. **Lists already loaded** (pilot and demo): I propose they stay active from their `frozen_from`, with nothing cut.
4. **Query limit per client:** 60 today; I propose keeping it, configurable.
5. **Default monthly cap:** I propose USD 10 per client, editable.
