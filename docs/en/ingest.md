# Real-visitor measurement (Phase 4)

The snippet (`src/lib/snippet.ts`, shown in **Setup** with the `client_id` already filled in) uses `web-vitals` (pinned version) and sends INP, LCP and CLS to `POST /api/ingest/vitals`. Events go to the `vitals` table and feed the **Speed** view (p75 by template, 28-day trend).

## Event contract
```json
{ "client_id": "<uuid>", "metric": "INP|LCP|CLS", "value": 188, "rating": "good",
  "device": "mobile|desktop", "url_template": "/product/*", "nav_type": "navigate",
  "attribution": { "interactionTarget": "#cta" } }
```
`value` in ms (CLS × 1000). The template groups URLs (`/product/123` → `/product/*`): adjust the snippet's `template` function to the site. Response codes and protections: D-028.

## Installing on an Astro site
Paste the snippet before `</body>` in the layout, **with `is:inline`** so Astro does not try to bundle the external import:
```astro
<script is:inline type="module"> ... </script>
```
INP, LCP and CLS are sent when the tab is hidden or closed: to test, interact with the page and then switch tabs.

## Testing with a real site (ngrok)
1. Free account at ngrok.com; `brew install ngrok`; `ngrok config add-authtoken <token>` (the token is a credential).
2. In ngrok's dashboard, *Domains*: copy the development domain (`something.ngrok-free.app`).
3. In `.env.local`: `NEXT_PUBLIC_SITE_URL=https://something.ngrok-free.app` and `NEXT_PUBLIC_SNIPPET_SAMPLE_RATE=0.25`. These are fixed at build time.
4. Terminal 1: `npm run build && npm start`. Terminal 2: `ngrok http --url=something.ngrok-free.app 3000`.
5. Open `http://localhost:3000`, open the client's **Setup**, copy the snippet and paste it in the site's layout. Push the change.
6. Visit the site, interact, and switch tabs. In the portal, the client's **Speed** shows the events.
7. When done: remove the snippet from the site and close ngrok.
While the computer is off or ngrok is closed, events are lost.

Spanish version: [`../es/ingest.md`](../es/ingest.md).
