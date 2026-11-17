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
