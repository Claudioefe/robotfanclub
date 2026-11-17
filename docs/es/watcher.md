# El watcher (Fase 3)

Job diario que consulta Google AI Overviews y AI Mode para cada query congelada y guarda la evidencia. Código en `jobs/watcher/`.

| Archivo | Rol |
|---|---|
| `parser.ts` | Funciones puras: extrae las referencias de la respuesta de IA, detecta la cita del cliente y calcula posición y rank orgánico (por URL normalizada) |
| `dataforseo.ts` | `FixtureSource` (lee `tests/fixtures`, sin red) y `LiveSource` (DataForSEO, con las condiciones fijas EE. UU./inglés/mobile) |
| `config.ts` | Elige el modo y **bloquea el live** salvo habilitación explícita (D-025) |
| `run.ts` | Orquestador: idempotencia, reintento, fallas parciales, costo, snapshots |
| `store.ts` | Acceso a Supabase con la secret key |
| `cli.ts` | Punto de entrada |

## Modos
- **dry-run** (por defecto): usa los fixtures y escribe solo en clientes `sandbox` (D-023). Se ve en el portal con el cliente "Fixture Sandbox".
- **live**: usa DataForSEO y procesa solo clientes `real`. Bloqueado hasta que el dueño lo autorice (D-011, D-025).

## Comandos
```bash
npm run watcher:dry-run                       # local, con .env.local
node jobs/watcher/cli.ts --mode dry-run       # equivalente
```

## GitHub Actions (`.github/workflows/aio-watcher.yml`)
Cron diario a las 14:00 UTC y ejecución manual (el live se niega fuera de 14:00–16:59 UTC, D-027). Un live con fallas termina en rojo. Para activarlo en el repo: *Settings > Secrets and variables > Actions*, agregar los *secrets* `SUPABASE_URL` y `SUPABASE_SECRET_KEY`. Sin ellos, el dry-run se omite con un aviso. Para el live (más adelante): secrets `DFS_LOGIN` y `DFS_PASSWORD`, y la variable `WATCHER_LIVE_ENABLED=yes`.

## Costos (referencia, a verificar antes de activar)
≈ $0.0066 por query y día en modo Live (SERP $0.002 + AI Overview asíncrono $0.0006 + AI Mode $0.004). 40 queries por 60 días ≈ $16 por cliente. Cada chequeo guarda su `cost_usd`.

Versión en inglés: [`../en/watcher.md`](../en/watcher.md).

## Evidencia
Snapshots en `snapshots/{cliente}/{día}/{superficie}/{slug}-{hash}-{hora}.json` (ruta única, D-027). Los chequeos son append-only e idempotentes; la corrida se cierra siempre en `watcher_runs`. Variables: `WATCHER_ALLOW_LIVE`, `WATCHER_ALLOW_OFF_HOUR`, `WATCHER_MAX_COST_USD` (por defecto 5).
