// Loads the real ChatGPT LLM Scraper responses captured on 2026-11-18 and 2026-11-20 (tests/fixtures/real) into the portal as
// ChatGPT runs (D-048), under one client. It makes no DataForSEO call: it parses the saved responses with the same parser the
// future job will use, stores each raw JSON in the private bucket 'snapshots' and inserts one row per run.
//
// Usage: npm run load-chatgpt-runs -- --client <uuid>
// The client must be a real one on baumanrarebooks.com (the captures are about that domain). Safe to run again: a run that is
// already stored is skipped. The cost of every capture (USD 0.004) is recorded, because it was real spending that no table had
// counted yet.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseRun } from "../jobs/chatgpt/parse.ts";

const DOMAIN = "baumanrarebooks.com";
const DIR = new URL("../tests/fixtures/real/", import.meta.url);
const FILES = /^dfs-chatgpt-scraper-(children-run\d|gifts-run\d|wizard-of-oz-run\d|q15-.+)-real\.json$/;

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
const clientId = process.argv.includes("--client") ? process.argv[process.argv.indexOf("--client") + 1] : null;
if (!clientId) throw new Error("Pass --client <uuid>: several clients can share the domain.");
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const found = await sb.from("clients").select("id, name, kind, domain").eq("id", clientId).maybeSingle();
if (found.error) throw new Error(`client: ${found.error.message}`);
const client = found.data;
if (!client) throw new Error(`No client with id ${clientId}.`);
if (client.kind !== "real") throw new Error(`Refusing to load real captures into a ${client.kind} client.`);
if (client.domain !== DOMAIN) throw new Error(`The captures are about ${DOMAIN}, not ${client.domain}.`);

const slug = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const planned = [];
for (const f of readdirSync(DIR).filter((f) => FILES.test(f)).sort()) {
  const text = readFileSync(new URL(f, DIR), "utf8");
  const task = JSON.parse(text).tasks[0];
  const run = parseRun(task, DOMAIN);
  const hash = createHash("sha1").update(text).digest("hex").slice(0, 8);
  const time = run.runAt.slice(11, 19).replaceAll(":", "");
  planned.push({ run, text, path: `${clientId}/${run.runOn}/chat_gpt/${slug(run.query)}-${hash}-${time}.json` });
}

const existing = await sb.from("llm_runs").select("snapshot_path").eq("client_id", clientId);
if (existing.error) throw new Error(`llm_runs: ${existing.error.message} (is the migration applied?)`);
const have = new Set(existing.data.map((r) => r.snapshot_path));

let loaded = 0, skipped = 0;
for (const p of planned) {
  if (have.has(p.path)) { skipped++; continue; }
  const up = await sb.storage.from("snapshots").upload(p.path, p.text, { contentType: "application/json", upsert: false });
  if (up.error && !/already exists|Duplicate/i.test(up.error.message)) throw new Error(`snapshot ${p.path}: ${up.error.message}`);
  const r = p.run;
  const ins = await sb.from("llm_runs").insert({
    client_id: clientId, platform: "chat_gpt", query: r.query, run_at: r.runAt, run_on: r.runOn, relation: r.relation,
    source_count: r.sourceCount, client_source_rank: r.clientSourceRank, client_url: r.clientUrl, other_domains: r.otherDomains,
    consulted_count: r.consultedCount, snapshot_path: p.path, cost_usd: r.costUsd,
  });
  if (ins.error) throw new Error(`insert ${r.query}: ${ins.error.message}`);
  loaded++;
}
console.log(`Loaded under ${client.name}: ${loaded} runs, ${skipped} already there, ${planned.length} captures in total.`);
