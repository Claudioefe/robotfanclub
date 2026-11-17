// The real-visitor speed snippet shown on the Setup page. Phase 4 builds the endpoint that receives it.
// The web-vitals version is pinned on purpose: a floating version could change what is measured.
export const WEB_VITALS_VERSION = "6.2.3";

export function buildSnippet(args: { clientId: string; endpoint: string }): string {
  return `<script type="module">
import { onINP, onLCP, onCLS } from "https://unpkg.com/web-vitals@${WEB_VITALS_VERSION}/dist/web-vitals.attribution.js";

const CLIENT_ID = "${args.clientId}";
const ENDPOINT = "${args.endpoint}";

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

onINP(send);
onLCP(send);
onCLS(send);
</script>`;
}
