// Seeds the demo client from prototype/portal-mvp.html (Northwind Security).
// Same seeded RNG and rules as the prototype, so the portal shows the same numbers.
//
// Usage: npm run seed:demo        (reads .env.local; safe to run more than once: it rebuilds the demo client's
// checks, snapshots, speed events and scripts from scratch)
// Writes with the secret key, so run it only against the development project.

import { createClient } from "@supabase/supabase-js";

const DEMO_CLIENT_ID = "00000000-0000-4000-8000-000000000001";
const START = Date.UTC(2026, 9, 11); // window day 1: 2026-10-11
const TODAY = Date.UTC(2026, 10, 17); // demo "today": 2026-11-17
const DAY = Math.round((TODAY - START) / 864e5) + 1;
const WINDOW = 60;

const QUERIES = ["soc 2 compliance software for startups","soc 2 type 1 vs type 2","how long does soc 2 take","soc 2 cost for a 50 person company","iso 27001 vs soc 2","hipaa compliance checklist for saas","continuous compliance monitoring tools","soc 2 readiness assessment","vendor risk management software","security questionnaire automation","soc 2 evidence collection automation","gdpr compliance software b2b","compliance automation pricing","soc 2 audit firms for startups","pci dss compliance for saas","access review software","trust center page examples","soc 2 policy templates","how to pass a soc 2 audit","compliance automation vs consultant","iso 27001 certification cost","soc 2 penetration test requirement","security awareness training for soc 2","automated access reviews with okta","soc 2 bridge letter","hitrust vs soc 2","risk register template for saas","soc 2 for ai companies","nist csf vs iso 27001","cmmc compliance software","data retention policy for saas","incident response plan template","soc 2 scope definition","background checks for soc 2","mdm requirement for soc 2","soc 2 renewal timeline","third party risk assessment questionnaire","compliance software aws integration","soc 2 trust services criteria explained","compliance evidence storage"];
const COMPETITORS = ["auditly.io", "trustkit.com", "complyhq.com", "secopsguide.net", "riskledger.org"];
const PAGES = ["/facts/soc-2", "/facts/pricing", "/compare/compliance-automation", "/facts/iso-27001", "/blog/soc-2-timeline", "/facts/integrations"];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemoRows() {
  const rnd = mulberry32(33);
  return QUERIES.map((q) => {
    const aio = rnd() < 0.74;
    const roll = rnd();
    const rank = roll < 0.45 ? 1 + Math.floor(rnd() * 10) : roll < 0.8 ? 11 + Math.floor(rnd() * 30) : null;
    const cited = aio && rnd() < (rank && rank <= 10 ? 0.55 : 0.38);
    const firstDay = cited ? 3 + Math.floor(rnd() * (DAY - 3)) : null;
    const page = PAGES[Math.floor(rnd() * PAGES.length)];
    const others = aio ? COMPETITORS.filter(() => rnd() < 0.45).slice(0, 3) : [];
    if (aio && !others.length) others.push(COMPETITORS[Math.floor(rnd() * COMPETITORS.length)]);
    const nsrc = others.length + (cited ? 1 : 0);
    const pos = cited ? 1 + Math.floor(rnd() * nsrc) : null;
    return { q, aio, rank, cited, firstDay, page, others, nsrc, pos };
  });
}

const isoDay = (d) => new Date(START + (d - 1) * 864e5).toISOString().slice(0, 10);

// Speed demo: ~10% of the prototype's interaction counts, shaped like its trend (sprint shipped Oct 26).
const TEMPLATES = [
  { t: "/ (home)", p75: 189, n: 421 }, { t: "/pricing", p75: 168, n: 298 }, { t: "/product/*", p75: 231, n: 612 },
  { t: "/compare/*", p75: 254, n: 187 }, { t: "/blog/*", p75: 142, n: 934 }, { t: "/facts/*", p75: 121, n: 144 },
];
const TAGS = [
  { label: "Live chat widget", host: "chat.example-widget.com", ms: 62, action: "load_on_first_interaction" },
  { label: "Session replay", host: "replay.example-analytics.com", ms: 48, action: "remove" },
  { label: "Tag manager container, 14 tags", host: "tags.example-manager.com", ms: 41, action: "move_server_side" },
  { label: "A/B testing script", host: "cdn.example-experiments.com", ms: 35, action: "keep" },
  { label: "Consent banner (CMP)", host: "consent.example-cmp.com", ms: 29, action: "keep", required: true },
  { label: "Marketing form embed", host: "forms.example-marketing.com", ms: 22, action: "load_on_first_interaction" },
];

async function seedSpeed(sb, must) {
  const INP_NOW = 214, INP_BEFORE = 296;
  const rnd = mulberry32(11);
  const TODAY_MS = TODAY;
  const events = [];
  for (const tpl of TEMPLATES) {
    for (let i = 0; i < tpl.n; i++) {
      const dayAgo = Math.floor(rnd() * 28);                       // 0 = today
      const idx = 27 - dayAgo;                                     // trend index, 0 = oldest
      const trend = idx < 5 ? INP_BEFORE : INP_BEFORE - (INP_BEFORE - INP_NOW) * (1 - Math.exp(-(idx - 5) / 6));
      // log-normal-ish spread around the template level, shaped by the day's trend
      const spread = Math.exp((rnd() + rnd() + rnd() - 1.5) * 0.9);
      const value = (tpl.p75 / 1.25) * (trend / INP_NOW) * spread;
      const at = TODAY_MS - dayAgo * 864e5 - Math.floor(rnd() * 20 * 36e5);
      events.push({ tpl: tpl.t, value, at });
    }
  }
  // Calibrate so the overall 28-day p75 lands on the prototype's headline (214 ms).
  const sorted = events.map((e) => e.value).sort((a, b) => a - b);
  const pos = 0.75 * (sorted.length - 1);
  const p75 = sorted[Math.floor(pos)] + (pos % 1) * (sorted[Math.ceil(pos)] - sorted[Math.floor(pos)]);
  const k = INP_NOW / p75;
  const vitals = events.map((e) => ({
    client_id: DEMO_CLIENT_ID, metric: "INP", value: Math.max(16, Math.round(e.value * k)),
    device: "mobile", url_template: e.tpl, created_at: new Date(e.at).toISOString(),
  }));
  must("clear vitals", await sb.from("vitals").delete().eq("client_id", DEMO_CLIENT_ID));
  for (let i = 0; i < vitals.length; i += 500) {
    must("vitals", await sb.from("vitals").insert(vitals.slice(i, i + 500)));
  }

  must("clear tags", await sb.from("tag_bouncer_scripts").delete().eq("client_id", DEMO_CLIENT_ID));
  must("tags", await sb.from("tag_bouncer_scripts").insert(TAGS.map((t) => ({
    client_id: DEMO_CLIENT_ID, label: t.label, script_host: t.host, script_url: `https://${t.host}/script.js`,
    blocking_ms: t.ms, action: t.action, is_required: Boolean(t.required), excluded_from_sla: Boolean(t.required),
  }))));

  // CrUX history for the demo: weekly 28-day windows, flat at ~296 ms before the sprint (Oct 26), then improving.
  const ends = ["2026-09-05", "2026-09-12", "2026-09-19", "2026-09-26", "2026-10-03", "2026-10-10", "2026-10-17", "2026-10-24", "2026-10-31", "2026-11-07", "2026-11-14"];
  const p75s = [296, 298, 294, 297, 295, 293, 291, 290, 276, 249, 226];
  const day = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
  must("clear crux", await sb.from("crux_history").delete().eq("client_id", DEMO_CLIENT_ID));
  must("crux", await sb.from("crux_history").insert(ends.map((end, i) => ({
    client_id: DEMO_CLIENT_ID, scope: "origin", target: "https://northwindsec.com", form_factor: "PHONE",
    period_start: day(end, -27), period_end: end, inp_p75_ms: p75s[i], inp_good_share: Number((0.55 + i * 0.019).toFixed(4)),
  }))));
}

// Fixture Sandbox: the only client the dry-run watcher writes to. Its queries match tests/fixtures, and its window
// starts today so the daily dry-run always has an active window. Rebuilt on every seed.
const SANDBOX_CLIENT_ID = "00000000-0000-4000-8000-000000000002";
async function seedSandbox(sb, must) {
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.parse(today) + 59 * 864e5).toISOString().slice(0, 10);
  must("sandbox client", await sb.from("clients").upsert({
    id: SANDBOX_CLIENT_ID, name: "Fixture Sandbox", domain: "northwindsec.com", kind: "sandbox",
  }));
  must("sandbox clear checks", await sb.from("aio_checks").delete().eq("client_id", SANDBOX_CLIENT_ID));
  must("sandbox clear sets", await sb.from("query_sets").delete().eq("client_id", SANDBOX_CLIENT_ID));
  must("sandbox crux history", await sb.from("crux_history").delete().eq("client_id", SANDBOX_CLIENT_ID));
  must("sandbox crux targets clear", await sb.from("crux_targets").delete().eq("client_id", SANDBOX_CLIENT_ID));
  must("sandbox crux target", await sb.from("crux_targets").insert({ client_id: SANDBOX_CLIENT_ID, scope: "origin", target: "https://www.example.com" }));
  must("sandbox sets", await sb.from("query_sets").insert(
    ["soc 2 type 1 vs type 2", "how long does soc 2 take"].map((query) => ({
      client_id: SANDBOX_CLIENT_ID, query, frozen_from: today, frozen_until: until,
    })),
  ));
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const rows = buildDemoRows();

  const must = (label, { error }) => { if (error) throw new Error(`${label}: ${error.message}`); };

  must("client", await sb.from("clients").upsert({
    id: DEMO_CLIENT_ID, name: "Northwind Security", domain: "northwindsec.com", service_fee_usd: 14500,
    inp_sprint_deployed_on: "2026-10-26", inp_baseline_ms: 296, kind: "demo",
  }));

  const frozenFrom = isoDay(1);
  const frozenUntil = isoDay(WINDOW);
  // Rebuilt from scratch: a re-insert would be rejected by the overlapping-window guard.
  must("clear query_sets", await sb.from("query_sets").delete().eq("client_id", DEMO_CLIENT_ID));
  must("query_sets", await sb.from("query_sets").insert(
    rows.map((r) => ({ client_id: DEMO_CLIENT_ID, query: r.q, frozen_from: frozenFrom, frozen_until: frozenUntil })),
  ));

  // Checks are append-only evidence, so the demo is rebuilt by deleting its rows first.
  must("clear checks", await sb.from("aio_checks").delete().eq("client_id", DEMO_CLIENT_ID));

  const slug = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  // Separate RNG for the day-by-day history, so the numbers that match the prototype (who is cited, who else, positions) stay identical.
  const histRnd = mulberry32(2026);
  const checks = [];
  const snapshots = [];
  const push = (r, surface, day, cited, others) => {
    const date = isoDay(day);
    const path = cited ? `${DEMO_CLIENT_ID}/${date}/${surface}/${slug(r.q)}.json` : null;
    if (path) snapshots.push({ path, body: { synthetic: true, demo: true, surface, query: r.q, date, cited_url: `https://northwindsec.com${r.page}`, other_domains: others } });
    checks.push({
      client_id: DEMO_CLIENT_ID, query: r.q, surface,
      checked_on: date, checked_at: `${date}T14:00:00Z`,
      aio_present: true, cited,
      cited_url: cited ? `https://northwindsec.com${r.page}` : null,
      source_position: cited ? r.pos : null, source_count: r.nsrc,
      organic_rank: cited && r.rank && r.rank <= 10 ? r.rank : null,
      other_domains: others, snapshot_path: path,
    });
  };
  const noAnswer = (r, surface, day) =>
    checks.push({ client_id: DEMO_CLIENT_ID, query: r.q, surface, checked_on: isoDay(day), checked_at: `${isoDay(day)}T14:00:00Z`, aio_present: false, cited: false });

  // One check per query, surface and day, like the daily watcher: Google's AI answers come and go from one day to the next
  // (the real pilot changed state in 12 of 30 checks in a single day, D-046), so the history alternates on purpose.
  //  - A query the demo marks as cited is first cited on its firstDay (AI Overview), and from then on is cited on about 70% of the
  //    days an AI answer shows up. AI Mode is cited only after that day, on about 40%: the first citation, and with it the
  //    "outside the top 10" judgement, always belongs to AI Overview, so the 13 citations and the 6 outside the top 10 hold.
  //  - A query the demo marks as having no AI answer shows one on about 8% of the days, and is never cited.
  for (const r of rows) {
    for (let day = 1; day <= DAY; day++) {
      const aioShows = r.aio ? day === r.firstDay || histRnd() < 0.9 : histRnd() < 0.08;
      if (!aioShows) noAnswer(r, "ai_overview", day);
      else {
        const cited = r.cited && day >= r.firstDay && (day === r.firstDay || histRnd() < 0.7);
        push(r, "ai_overview", day, cited, r.others.length ? r.others : [COMPETITORS[0]]);
      }
      if (r.aio) {
        // AI Mode answers where an AI answer exists for this query.
        const modeShows = histRnd() < 0.9;
        if (!modeShows) noAnswer(r, "ai_mode", day);
        else push(r, "ai_mode", day, r.cited && day > r.firstDay && histRnd() < 0.4, r.others);
      }
    }
  }
  // Snapshots are tiny and independent: upload a few at a time.
  const queue = [...snapshots];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let sn = queue.shift(); sn; sn = queue.shift()) {
        must("snapshot", await sb.storage.from("snapshots").upload(sn.path, JSON.stringify(sn.body), { contentType: "application/json", upsert: true }));
      }
    }),
  );
  for (let i = 0; i < checks.length; i += 500) must("aio_checks", await sb.from("aio_checks").insert(checks.slice(i, i + 500)));

  await seedSpeed(sb, must);
  await seedSandbox(sb, must);

  const cited = rows.filter((r) => r.cited);
  console.log(`Demo ready: ${rows.length} queries, ${cited.length} citations, day ${DAY} of ${WINDOW}, ${checks.length} daily checks, speed events and scripts loaded.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
