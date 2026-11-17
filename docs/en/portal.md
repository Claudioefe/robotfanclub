# The portal (Phase 2)

Routes under `/portal`. What each user sees is decided by RLS: a client sees only their workspace; staff see all and enter through the client list.

| Route | What it shows |
|---|---|
| `/portal/[clientId]` | **Overview:** running citation count, straight-line projection to day 60, the ruler (floor 12, target 18, bonus 25), SLA status with clawback risk, off-top10 share against 30%, **citation rate**, an INP summary and the 3 newest Citation Cards |
| `/citations` | Table of the frozen queries; filters (all, cited, off-top10, AI answer without the client) and surface (AI Overview / AI Mode); per-query citation rate; link to the snapshot (evidence); Slack card button |
| `/speed` | Headline mobile INP p75, by template, 28-day trend, CrUX windows and Tag Bouncer (simulator) |
| `/setup` | Measurement snippet with the `client_id` already filled in |

## Where the numbers come from
- **Citations, off-top10, citation rate:** views `sla_citations`, `citation_rate`, `citation_first_checks`, `latest_checks`. Projection and status math is in `src/lib/sla.ts` (tested against the prototype).
- **INP:** views `inp_p75_overall`, `inp_p75`, `inp_p75_daily` over `vitals`. The sprint deploy and baseline live on `clients`.
- **Tag Bouncer:** `tag_bouncer_scripts`. The estimate is indicative and the UI says so.

## Data layer rules
Columns are listed explicitly (never `select *` on `clients`, `aio_checks` or `citation_cards`: some columns are staff-only). All reads run as the user, not with the secret key.

Spanish version: [`../es/portal.md`](../es/portal.md).
