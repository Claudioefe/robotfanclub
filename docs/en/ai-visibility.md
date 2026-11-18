# AI visibility (Phase 8)

An **informational** portal module: where AI answers (Google AI Overview and ChatGPT) already mention the client's domain. It is **not the citation SLA** and does not count toward the credit (D-039, D-040).

## Where the data comes from
DataForSEO **LLM Mentions**: a database of AI answers recorded over time. It is not a live measurement and not in the SLA's fixed conditions. That is why every figure carries the capture date and the dates the answer was recorded (some are almost a year old).

- Two calls per client and run: `google` and `chat_gpt` (US, English), the 40 questions with the highest AI search volume.
- Cost: USD 0.10 per call + 0.001 per row = **≈ USD 0.14 per call, USD 0.28 per client and run**. Weekly: ≈ USD 1.2 per client per month.

## What the portal shows (`/portal/<client>/ai-visibility`)
- How many answers on each platform mention the domain (database total) and how many of the top 40 **cite** it.
- **Cited** (the domain is among the answer's sources) vs **Read, not cited** (ChatGPT opened a page of the domain while answering but did not list it). They are different things and are shown apart.
- A table of questions by volume, what each platform did, and when the answer was recorded.
- Other sites cited next to the client.
- A fixed notice: it is a snapshot, and the citation guarantee is measured separately, daily, on Google only.

## Admin
On `/admin/clients/<id>`, "Query ideas from AI visibility": questions Google already cites for the client, by volume, minus the ones already frozen, with "Copy all". **It freezes nothing**: paste into the form above (a frozen list cannot be edited). Questions that appear only on ChatGPT are **not** suggested: they do not prove that Google triggers an AI answer.

## The job
`node jobs/ai-visibility/cli.ts --mode dry-run|live` (GitHub Actions, Mondays 07:00 UTC).
- **dry-run** (default): uses the real responses saved in `tests/fixtures/real/` and `sandbox` clients only. No calls.
- **live**: `real` clients only. Needs `AI_VISIBILITY_ALLOW_LIVE=yes`, `DFS_LOGIN`, `DFS_PASSWORD`; spending ceiling `AI_VISIBILITY_MAX_COST_USD` (2 by default: it stops before going over). In Actions, scheduled runs are dry-run until the repository variable `AI_VISIBILITY_LIVE_ENABLED` is `yes`.
- Idempotent per client, platform and day. Saves the raw JSON in `snapshots/{client}/ai-visibility/...` before the rows. A 401/402/403 error stops the run; a transient error is retried once.

## Tables (migration `20261123100000_ai_visibility.sql`)
`ai_mention_runs` (one row per client, platform and day: database total, rows stored, JSON path, cost hidden from users) and `ai_mentions` (one row per question, with `relation` = `cited`/`consulted`). RLS: read for staff and the client's members; writes only with the secret key.

## See real data in the portal
`npm run load-real-mentions` loads the two saved real responses under Bauman (through the same job, without calling DataForSEO).
