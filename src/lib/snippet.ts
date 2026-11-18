// The real-visitor speed snippet shown on the Setup page. It talks to POST /api/ingest/vitals (src/lib/ingest).
// The web-vitals version is pinned on purpose: a floating version could change what is measured.
export const WEB_VITALS_VERSION = "6.2.3";

export function buildSnippet(args: { clientId: string; endpoint: string; sampleRate?: number }): string {
  const sampleRate = Math.min(1, Math.max(0, args.sampleRate ?? 1));
  return `<script type="module">
import { onINP, onLCP, onCLS } from "https://unpkg.com/web-vitals@${WEB_VITALS_VERSION}/dist/web-vitals.attribution.js";

const CLIENT_ID = "${args.clientId}";
const ENDPOINT = "${args.endpoint}";
const SAMPLE_RATE = ${sampleRate}; // share of visits measured, from 0 to 1

// One decision per browser session, so a visit is either measured completely or not at all.
let sampled;
try {
  let saved = sessionStorage.getItem("rfc-sampled");
  if (saved === null) {
    saved = String(Math.random() < SAMPLE_RATE);
    sessionStorage.setItem("rfc-sampled", saved);
  }
  sampled = saved === "true";
} catch {
  sampled = Math.random() < SAMPLE_RATE;
}

// Groups URLs by template: /product/123 becomes /product/*. Adjust to your site's URL patterns.
const template = (path) => path.replace(/\\/(?:[0-9a-f-]{8,}|\\d+)(?=\\/|$)/gi, "/*");
const device = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";

function send(metric) {
  const body = JSON.stringify({
    client_id: CLIENT_ID,
    metric: metric.name,
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    device,
    url_template: template(location.pathname),
    nav_type: metric.navigationType,
    attribution: JSON.parse(JSON.stringify(metric.attribution, (_, v) => (v instanceof Node ? undefined : v))),
  });
  // text/plain keeps the request "simple" for cross-origin sendBeacon
  if (!navigator.sendBeacon(ENDPOINT, body)) fetch(ENDPOINT, { method: "POST", body, keepalive: true });
}

if (sampled) {
  onINP(send);
  onLCP(send);
  onCLS(send);
}
</script>`;
}
