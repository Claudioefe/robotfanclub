# How it works

## AI citations (AIO Pro)
1. Staff loads a list of up to 60 queries and **freezes** it: a 60-day window (`frozen_until = frozen_from + 59`). A frozen list is never edited.
2. Every day, at the same time, the watcher queries Google (US, English, mobile) for each query: AI Overview and AI Mode. It stores one row per query, surface and day, plus the raw JSON as evidence.
3. **A citation** = one frozen query where a URL from the client's domain appears among the AI answer's sources at least once in the window. Seeing it again does not add. It counts if it happened in AI Overview **or** AI Mode (D-005).
4. **Goals:** floor 12, target 18, bonus 25. **Off-top10:** at least 30% of citations must come from URLs not in that query's organic top 10 that day (by normalized URL). A citation counts as off-top10 based on its first cited check (D-019).
5. If there are fewer than 12 citations on day 60: 20% fee credit.
6. **Citation rate:** % of checks with an AI answer in which the client was cited, within the window.

## Speed (INP Sprint)
- A `web-vitals` snippet sends INP, LCP and CLS from real visitors; a nightly job adds CrUX.
- Goal: INP p75 mobile ≤ 200 ms in two full 28-day CrUX windows since the deploy. Third-party scripts the client chooses to keep are outside the SLA.

## Access
No public sign-up. Staff grants access (`npm run grant-access`); the person signs in with an emailed link. A client user sees only their client, read-only; staff see all.

Spanish version: [`../es/how-it-works.md`](../es/how-it-works.md).
