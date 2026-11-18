# El job de CrUX (Fase 5)

Lee los datos de campo que Google publica en el Chrome UX Report: INP p75 en móvil, ventanas de 28 días. Es lo que juzga el SLA de INP. No requiere instalar nada en el sitio del cliente. Código en `jobs/crux/`.

| Archivo | Rol |
|---|---|
| `parser.ts` | Funciones puras para `queryRecord` y `queryHistoryRecord` (INP entero, CLS como texto, `null` y `"NaN"` de los períodos sin datos) |
| `source.ts` | `FixtureSource` (sin red) y `LiveSource` (API de Google con key; 404 = sin datos) |
| `run.ts` | Orquestador idempotente: reintento, "sin datos", corte ante error de clave |
| `store.ts` / `cli.ts` | Acceso a Supabase y punto de entrada |

## Cómo sacar la API key (gratis)
1. Entrar a [console.cloud.google.com](https://console.cloud.google.com/) con una cuenta de Google.
2. Selector de proyectos (arriba) > **Proyecto nuevo** > nombre `robotfanclub`.
3. [Biblioteca de APIs](https://console.cloud.google.com/apis/library/chromeuxreport.googleapis.com): buscar **Chrome UX Report API** y **Habilitar**.
4. [Credenciales](https://console.cloud.google.com/apis/credentials) > **Crear credenciales** > **Clave de API**.
5. Editar la clave > **Restricciones de API** > **Restringir clave** > marcar solo **Chrome UX Report API** > Guardar.
6. Copiarla en `.env.local`: `CRUX_API_KEY=...` (nunca en el chat ni en el repo).

## Agregar un cliente
```bash
npm run create-client -- --name "Bauman Rare Books" --domain baumanrarebooks.com --kind demo
npm run add-crux-target -- --domain baumanrarebooks.com --origin https://www.baumanrarebooks.com --url https://www.baumanrarebooks.com/
npm run crux:backfill     # una vez: trae hasta 40 semanas de historial
npm run crux:live         # lectura diaria (el workflow lo hace solo)
```
CrUX trata `https://www.x.com` y `https://x.com` como orígenes distintos: usar el que visitan las personas. Un sitio sin tráfico suficiente devuelve "sin datos": no es un error.

## Modos
- `npm run crux:dry-run`: fixtures, solo clientes `sandbox`.
- `npm run crux:live` y `crux:backfill`: API real, clientes `real` y `demo`.

## GitHub Actions (`.github/workflows/crux.yml`)
Corre a las 06:00 UTC. Secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y, para el live, `CRUX_API_KEY`. El live se activa con la variable de repositorio `CRUX_LIVE_ENABLED=yes`; hasta entonces las corridas programadas son dry-run. Un live con fallas termina en rojo.

Versión en inglés: [`../en/crux.md`](../en/crux.md).
