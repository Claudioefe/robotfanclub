# The portal (Phase 2)

Routes under `/portal`. What each user sees is decided by RLS: a client sees only their workspace; staff see all and enter through the client list.

| Route | What it shows |
|---|---|
| `/portal/[clientId]` | **Overview:** running citation count, straight-line projection to day 60, the ruler (floor 12, target 18, bonus 25), SLA status with clawback risk, off-top10 share against 30%, **citation rate**, an INP summary and the 3 newest Citation Cards |
| `/citations` | **Chart** of cumulative citations and citations per day against floor/target/bonus; table of the frozen queries with a **day strip** per surface, "days cited N of M", citation rate, organic rank and evidence links; filters (all, cited, off-top10, AI answer without the client) and surface; Slack card button. Uses the full screen width (D-047) |
| `/citations/query?q=…` | **One query day by day** (D-047): what each surface showed, who else was cited, link to the raw JSON of every check |
| `/speed` | Headline mobile INP p75, by template, 28-day trend, CrUX windows and Tag Bouncer (simulator) |
| `/setup` | Measurement snippet with the `client_id` already filled in |

## Where the numbers come from
- **Citations, off-top10, citation rate:** views `sla_citations`, `citation_rate`, `citation_first_checks`, `latest_checks`. Projection and status math is in `src/lib/sla.ts` (tested against the prototype).
- **INP:** views `inp_p75_overall`, `inp_p75`, `inp_p75_daily` over `vitals`. The sprint deploy and baseline live on `clients`.
- **Tag Bouncer:** `tag_bouncer_scripts`. The estimate is indicative and the UI says so.

## Data layer rules
Columns are listed explicitly (never `select *` on `clients`, `aio_checks` or `citation_cards`: some columns are staff-only). All reads run as the user, not with the secret key.

Spanish version: [`../es/portal.md`](../es/portal.md).

## Citations day by day (D-047)
A 60-day window holds thousands of checks; the table does not grow with the days because the history is compressed into each row.
- **Day strip:** one cell per day and surface (AI Overview on top, AI Mode below, newest on the right). **Lime** = cited; **pink** = an AI answer existed without the client; **grey** = Google showed no AI answer that day (not a lost citation); **dashed** = no check stored. On a phone only the last 14 days show.
- **"Days cited: N of M":** M counts only the days with an AI answer (on either surface).
- **Chart:** the line is the number of queries cited at least once up to that day (**the SLA number, it never goes down**); the bars are the queries cited that day (**it goes up and down**: normal, see D-046). A day with no check at all is not drawn and the line ends at the last day with data.
- **Code:** `src/lib/data/history.ts` (pure functions: states, metrics, cumulative line), `getHistory` and `getQueryHistory` in the data core `src/lib/data/read.ts` (read in pages of 1000 rows), `Strip` and `CitationsChart` components (own SVG, no library).
- **Demo:** `npm run seed:demo` generates a daily history with alternation like the real one; the cumulative count ends at the same 13 citations.
