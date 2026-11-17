# Arquitectura

## Componentes
| Pieza | Dónde | Qué hace |
|---|---|---|
| Portal | `src/app` (Next.js, Netlify) | Login, vistas de citas y velocidad |
| Clientes Supabase | `src/lib/supabase/` | `client` (navegador), `server` (usuario, aplica RLS), `admin` (secret key, solo servidor) |
| Proxy | `src/proxy.ts` | Refresca la sesión y redirige a `/login` si no hay usuario en `/portal` (chequeo optimista; la seguridad real es RLS) |
| Watcher diario | `jobs/` + GitHub Actions (Fase 3) | Consulta DataForSEO, guarda `aio_checks` y el JSON crudo |
| Ingest de vitals | `POST /api/ingest/vitals` (Fase 4) | Recibe INP, LCP y CLS del snippet |
| CrUX | `jobs/` (Fase 5) | Historial diario de INP p75 |
| Scripts | `scripts/` | `seed-demo`, `grant-access` |

## Base de datos (`supabase/migrations/`)
- **Acceso:** `clients`, `staff`, `client_members`. `can_read_client(id)` es true para staff o miembros.
- **Citas:** `query_sets` (listas congeladas de 60 días, no se editan), `aio_checks` (un chequeo por query, superficie y día UTC), `citation_cards`.
- **Velocidad:** `vitals`, `crux_history`, `tag_bouncer_scripts`.
- **Solo servidor:** `mini_scans`, `ingest_rate_limits` (función `ingest_rate_check`).
- **Vistas** (`security_invoker`): `sla_citations`, `citation_rate`, `inp_p75`.
- **Storage:** bucket privado `snapshots`, ruta `{client_id}/{fecha}/{superficie}/{slug}.json`; lectura por RLS según el primer segmento.

## Seguridad
- Lectura solo por RLS; escritura solo con la secret key en servidor (D-016).
- `anon` no tiene permisos; `authenticated` solo `select` (D-015). `slack_webhook_url` no es legible.
- La secret key nunca llega al navegador: `admin.ts` importa `server-only`.

Versión en inglés: [`../en/architecture.md`](../en/architecture.md).
