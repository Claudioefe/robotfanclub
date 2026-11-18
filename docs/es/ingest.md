# Medición de visitantes reales (Fase 4)

El snippet (`src/lib/snippet.ts`, se ve en **Setup** con el `client_id` ya completo) usa `web-vitals` (versión fijada) y envía INP, LCP y CLS a `POST /api/ingest/vitals`. Los eventos van a la tabla `vitals` y alimentan la vista **Speed** (p75 por plantilla, tendencia de 28 días).

## Contrato del evento
```json
{ "client_id": "<uuid>", "metric": "INP|LCP|CLS", "value": 188, "rating": "good",
  "device": "mobile|desktop", "url_template": "/product/*", "nav_type": "navigate",
  "attribution": { "interactionTarget": "#cta" } }
```
`value` en ms (CLS × 1000). La plantilla agrupa URLs (`/product/123` → `/product/*`): ajustar la función `template` del snippet al sitio. Detalle de códigos de respuesta y protecciones: D-028.

## Instalar en un sitio Astro
Pegar el snippet antes de `</body>` en el layout, **con `is:inline`** para que Astro no intente empaquetar el import externo:
```astro
<script is:inline type="module"> ... </script>
```
INP, LCP y CLS se envían cuando la pestaña se oculta o se cierra: para probar, interactuar con la página y después cambiar de pestaña.

## Prueba con un sitio real (ngrok)
1. Cuenta gratuita en ngrok.com; `brew install ngrok`; `ngrok config add-authtoken <token>` (el token es una credencial).
2. En el panel de ngrok, *Domains*: copiar el dominio de desarrollo (`algo.ngrok-free.app`).
3. En `.env.local`: `NEXT_PUBLIC_SITE_URL=https://algo.ngrok-free.app` y `NEXT_PUBLIC_SNIPPET_SAMPLE_RATE=0.25`. Son variables que se fijan en el build.
4. Terminal 1: `npm run build && npm start`. Terminal 2: `ngrok http --url=algo.ngrok-free.app 3000`.
5. Entrar a `http://localhost:3000`, abrir el cliente en **Setup**, copiar el snippet y pegarlo en el layout del sitio. Subir el cambio.
6. Visitar el sitio, interactuar y cambiar de pestaña. En el portal, **Speed** del cliente muestra los eventos.
7. Al terminar: quitar el snippet del sitio y cerrar ngrok.
Mientras la computadora esté apagada o ngrok cerrado, los eventos se pierden.

Versión en inglés: [`../en/ingest.md`](../en/ingest.md).
