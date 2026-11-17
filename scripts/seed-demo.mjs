// Seeds the demo client from prototype/portal-mvp.html (Northwind Security).
// Same seeded RNG and rules as the prototype, so the portal shows the same numbers.
//
// Usage: npm run seed:demo        (reads .env.local; safe to run more than once)
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

async function main() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const rows = buildDemoRows();

  const must = (label, { error }) => { if (error) throw new Error(`${label}: ${error.message}`); };

  must("client", await sb.from("clients").upsert({
    id: DEMO_CLIENT_ID, name: "Northwind Security", domain: "northwindsec.com", service_fee_usd: 14500,
  }));

  const frozenFrom = isoDay(1);
  const frozenUntil = isoDay(WINDOW);
  must("query_sets", await sb.from("query_sets").upsert(
    rows.map((r) => ({ client_id: DEMO_CLIENT_ID, query: r.q, frozen_from: frozenFrom, frozen_until: frozenUntil })),
    { onConflict: "client_id,query,frozen_from", ignoreDuplicates: true },
  ));

  const checks = [];
  for (const r of rows) {
    const base = (day) => ({
      client_id: DEMO_CLIENT_ID, query: r.q, surface: "ai_overview",
      checked_on: isoDay(day), checked_at: `${isoDay(day)}T14:00:00Z`,
      aio_present: r.aio, cited: r.cited,
      cited_url: r.cited ? `https://northwindsec.com${r.page}` : null,
      source_position: r.pos, source_count: r.aio ? r.nsrc : null,
      organic_rank: r.cited && r.rank && r.rank <= 10 ? r.rank : null,
      other_domains: r.aio ? r.others : null,
    });
    checks.push(base(DAY));                       // latest check
    if (r.cited) checks.push(base(r.firstDay));   // first time it was seen cited
  }
  must("aio_checks", await sb.from("aio_checks").upsert(checks, {
    onConflict: "client_id,query,surface,checked_on", ignoreDuplicates: true,
  }));

  const cited = rows.filter((r) => r.cited);
  console.log(`Demo ready: ${rows.length} queries, ${cited.length} citations, day ${DAY} of ${WINDOW}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
