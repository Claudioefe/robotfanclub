# Architecture

## Components
| Piece | Where | What it does |
|---|---|---|
| Portal | `src/app` (Next.js, Netlify) | Login, citation and speed views |
| Supabase clients | `src/lib/supabase/` | `client` (browser), `server` (user, RLS applies), `admin` (secret key, server only) |
| Proxy | `src/proxy.ts` | Refreshes the session and redirects to `/login` when there is no user on `/portal` (optimistic check; real security is RLS) |
| Daily watcher | `jobs/` + GitHub Actions (Phase 3) | Queries DataForSEO, stores `aio_checks` and the raw JSON |
| Vitals ingest | `POST /api/ingest/vitals` (Phase 4) | Receives INP, LCP and CLS from the snippet |
| CrUX | `jobs/` (Phase 5) | Daily INP p75 history |
| Scripts | `scripts/` | `seed-demo`, `grant-access` |

## Database (`supabase/migrations/`)
- **Access:** `clients`, `staff`, `client_members`. `can_read_client(id)` is true for staff or members.
- **Citations:** `query_sets` (60-day frozen lists, never edited), `aio_checks` (one check per query, surface and UTC day), `citation_cards`.
- **Speed:** `vitals`, `crux_history`, `tag_bouncer_scripts`.
- **Server only:** `mini_scans`, `ingest_rate_limits` (function `ingest_rate_check`).
- **Views** (`security_invoker`): `sla_citations`, `citation_rate`, `inp_p75`.
- **Storage:** private bucket `snapshots`, path `{client_id}/{date}/{surface}/{slug}.json`; read access by RLS on the first path segment.

## Security
- Reads only through RLS; writes only with the secret key on the server (D-016).
- `anon` has no privileges; `authenticated` has `select` only (D-015). `slack_webhook_url` is not readable.
- The secret key never reaches the browser: `admin.ts` imports `server-only`.

Spanish version: [`../es/architecture.md`](../es/architecture.md).
