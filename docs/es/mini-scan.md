# Mini-Scan (Fase 7)

Formulario público de captación: dominio + hasta 25 queries → "brecha de citas" (en cuántas queries Google responde con IA y cita a otros) y un resumen copiable. **Está apagado por defecto** (D-038).

## Estados (`MINI_SCAN_MODE`)
| Valor | Qué pasa |
|---|---|
| `off` (por defecto) | `/mini-scan` dice "Coming soon" y rechaza todo pedido |
| `simulated` | Funciona con resultados inventados, marcados "Simulated data". Para pruebas locales |
| `live` | Gasto real. Requiere captcha Turnstile, el worker live y la autorización de gasto |

## Flujo
1. El visitante envía dominio y queries. Se valida y se **encola** (no se llama a DataForSEO).
2. Recibe un enlace privado `/mini-scan/<token>` que se actualiza solo.
3. El worker (`node jobs/miniscan/cli.ts`, cada 10 min en GitHub Actions) ejecuta los pendientes: simulados con `--mode dry-run`, reales con `--mode live`.
4. La página muestra el resultado, la tabla y "Copy summary".

## Probarlo en local
```bash
MINI_SCAN_MODE=simulated npm run build && MINI_SCAN_MODE=simulated npm start   # abrir /mini-scan
node --env-file=.env.local jobs/miniscan/cli.ts --mode dry-run                 # procesa lo encolado
```
En `/admin` se ve el modo, los escaneos reales de la semana contra el tope (30) y los últimos escaneos.

## Abrirlo al público (cuando se decida)
1. Cuenta gratuita de Cloudflare Turnstile: `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` en el servidor.
2. `MINI_SCAN_MODE=live` en el servidor.
3. GitHub: variable `MINI_SCAN_MODE=live`, variable `MINISCAN_ALLOW_LIVE=yes` y los secrets `DFS_LOGIN` y `DFS_PASSWORD`.
Costo de referencia: ≈ USD 0,05 por escaneo de 25 queries; con el tope, hasta ≈ USD 1,50 por semana.

Versión en inglés: [`../en/mini-scan.md`](../en/mini-scan.md).
