# Mini-Scan (Phase 7)

Public lead-gen form: domain + up to 25 queries → "citation gap" (in how many queries Google answers with AI and cites others) and a copyable summary. **It is off by default** (D-038).

## States (`MINI_SCAN_MODE`)
| Value | What happens |
|---|---|
| `off` (default) | `/mini-scan` says "Coming soon" and refuses every request |
| `simulated` | Works with made-up results, labelled "Simulated data". For local testing |
| `live` | Real spend. Needs the Turnstile captcha, the live worker and the spending authorization |

## Flow
1. The visitor sends a domain and queries. It is validated and **queued** (DataForSEO is not called).
2. They get a private link `/mini-scan/<token>` that refreshes itself.
3. The worker (`node jobs/miniscan/cli.ts`, every 10 min on GitHub Actions) runs the pending ones: simulated with `--mode dry-run`, real with `--mode live`.
4. The page shows the result, the table and "Copy summary".

## Trying it locally
```bash
MINI_SCAN_MODE=simulated npm run build && MINI_SCAN_MODE=simulated npm start   # open /mini-scan
node --env-file=.env.local jobs/miniscan/cli.ts --mode dry-run                 # processes what was queued
```
`/admin` shows the mode, this week's real scans against the cap (30) and the latest scans.

## Opening it to the public (when decided)
1. Free Cloudflare Turnstile account: `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` on the server.
2. `MINI_SCAN_MODE=live` on the server.
3. GitHub: variable `MINI_SCAN_MODE=live`, variable `MINISCAN_ALLOW_LIVE=yes` and the secrets `DFS_LOGIN` and `DFS_PASSWORD`.
Reference cost: ≈ USD 0.05 per scan of 25 queries; with the cap, up to ≈ USD 1.50 per week.

Spanish version: [`../es/mini-scan.md`](../es/mini-scan.md).
