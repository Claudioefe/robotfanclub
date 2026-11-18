// Loads the two real DataForSEO responses captured on 2026-11-18 (tests/fixtures/real) into the portal, under the
// Bauman Rare Books demo client, so the real data can be seen in AI citations. It runs them through the same parser
// and the same storage layout as the watcher. Costs nothing: no DataForSEO call is made.
//
// Usage: npm run load-real-sample        (safe to run again: it skips what already exists)

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { organicTop10, parseCitation } from "../jobs/watcher/parser.ts";
import { snapshotPath } from "../jobs/watcher/run.ts";

const QUERY = "how to tell if a book is a first edition";
const DOMAIN = "baumanrarebooks.com";
const CAPTURED_AT = new Date("2026-11-18T14:03:49Z"); // when the SERP was captured (UTC)
const day = CAPTURED_AT.toISOString().slice(0, 10);

const load = (name) => JSON.parse(readFileSync(new URL(`../tests/fixtures/real/${name}`, import.meta.url), "utf8")).tasks[0].result[0];
const serp = load("dfs-organic-mobile-resolved-real.json"); // captured with resolve_goto_urls: real URLs
const aiMode = load("dfs-ai-mode-mobile-real.json"); // trimmed copy of the real response

async function main() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const must = (label, { error }) => { if (error) throw new Error(`${label}: ${error.message}`); };

  const client = await sb.from("clients").select("id, kind").eq("domain", DOMAIN).maybeSingle();
  must("client", client);
  if (!client.data) throw new Error(`No client with domain ${DOMAIN}. Create it first with npm run create-client.`);
  if (client.data.kind === "sandbox") throw new Error("Refusing to load real data into a sandbox client");
  const clientId = client.data.id;

  // A frozen window that contains the capture day, created only if the client has none for this query
  const windows = await sb.from("query_sets").select("id").eq("client_id", clientId).eq("query", QUERY);
  must("query_sets", windows);
  if (!windows.data.length) {
    const until = new Date(Date.parse(day) + 59 * 864e5).toISOString().slice(0, 10);
    must("insert query_sets", await sb.from("query_sets").insert({ client_id: clientId, query: QUERY, frozen_from: day, frozen_until: until }));
  }

  const top10 = organicTop10(serp);
  const surfaces = [
    { surface: "ai_overview", result: serp, cost: 0.002 },
    { surface: "ai_mode", result: aiMode, cost: 0.004 },
  ];
  let written = 0;
  for (const { surface, result, cost } of surfaces) {
    const existing = await sb.from("aio_checks").select("id").eq("client_id", clientId).eq("query", QUERY).eq("surface", surface).eq("checked_on", day);
    must("existing check", existing);
    if (existing.data.length) continue;

    const parsed = parseCitation(result, DOMAIN, top10);
    const path = snapshotPath(clientId, day, surface, QUERY, CAPTURED_AT);
    const evidence = { _sample: "Real DataForSEO response captured on 2026-11-18, loaded by npm run load-real-sample. The AI Mode one is trimmed (see tests/fixtures/real).", ...result };
    must("snapshot", await sb.storage.from("snapshots").upload(path, JSON.stringify(evidence), { contentType: "application/json", upsert: false }));
    must("check", await sb.from("aio_checks").insert({
      aio_present: parsed.aio_present, cited: parsed.cited, cited_url: parsed.cited_url, source_position: parsed.source_position,
      source_count: parsed.source_count, organic_rank: parsed.organic_rank, organic_checked: parsed.organic_checked, other_domains: parsed.other_domains,
      client_id: clientId, query: QUERY, surface, checked_on: day, checked_at: CAPTURED_AT.toISOString(), snapshot_path: path, cost_usd: cost,
    }));
    written++;
    console.log(`  ${surface}: AI answer ${parsed.aio_present ? "yes" : "no"}, cited ${parsed.cited ? "yes" : "no"}, ${parsed.source_count} sources`);
  }
  console.log(written ? `Loaded ${written} real check(s) for ${DOMAIN}.` : "Already loaded: nothing to do.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
