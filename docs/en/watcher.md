# The watcher (Phase 3)

Daily job that queries Google AI Overviews and AI Mode for every frozen query and stores the evidence. Code in `jobs/watcher/`.

| File | Role |
|---|---|
| `parser.ts` | Pure functions: extracts the references from the AI answer, detects the client's citation and computes position and organic rank (by normalized URL) |
| `dataforseo.ts` | `FixtureSource` (reads `tests/fixtures`, no network) and `LiveSource` (DataForSEO, with the fixed US/English/mobile conditions) |
| `config.ts` | Picks the mode and **blocks live** unless explicitly enabled (D-025) |
| `run.ts` | Orchestrator: idempotency, retry, partial failures, cost, snapshots |
| `store.ts` | Supabase access with the secret key |
| `cli.ts` | Entry point |

## Modes
- **dry-run** (default): uses the fixtures and writes only to `sandbox` clients (D-023). It shows in the portal under "Fixture Sandbox".
- **live**: uses DataForSEO and processes only `real` clients. Blocked until the owner authorizes it (D-011, D-025).

## Commands
```bash
npm run watcher:dry-run                       # local, reads .env.local
node jobs/watcher/cli.ts --mode dry-run       # equivalent
```

## GitHub Actions (`.github/workflows/aio-watcher.yml`)
Daily cron at 14:00 UTC and manual runs (live refuses to run outside 14:00–16:59 UTC, D-027). A live run with failures ends red. To turn it on in the repo: *Settings > Secrets and variables > Actions*, add the secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Without them the dry-run is skipped with a notice. For live (later): secrets `DFS_LOGIN` and `DFS_PASSWORD`, and the variable `WATCHER_LIVE_ENABLED=yes`.

## Costs (reference, verify before turning on)
≈ $0.0066 per query per day in Live mode (SERP $0.002 + async AI Overview $0.0006 + AI Mode $0.004). 40 queries for 60 days ≈ $16 per client. Every check stores its `cost_usd`.

Spanish version: [`../es/watcher.md`](../es/watcher.md).

## Evidence
Snapshots at `snapshots/{client}/{day}/{surface}/{slug}-{hash}-{time}.json` (unique path, D-027). Checks are append-only and idempotent; the run is always closed in `watcher_runs`. Variables: `WATCHER_ALLOW_LIVE`, `WATCHER_ALLOW_OFF_HOUR`, `WATCHER_MAX_COST_USD` (default 5).
