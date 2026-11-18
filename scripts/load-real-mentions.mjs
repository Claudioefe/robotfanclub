// Loads the two real LLM Mentions responses captured on 2026-11-18 (tests/fixtures/real) into the portal, under the
// Bauman Rare Books demo client, so the AI visibility page shows real data. It uses the same parser, storage layout and
// job code as the weekly job. Costs nothing: no DataForSEO call is made.
//
// Usage: npm run load-real-mentions        (safe to run again: platforms already stored for that day are skipped)

import { createClient } from "@supabase/supabase-js";
import { runAiVisibility } from "../jobs/ai-visibility/run.ts";
import { FixtureSource } from "../jobs/ai-visibility/source.ts";
import { createSupabaseAiVisibilityStore } from "../jobs/ai-visibility/store.ts";

const DOMAIN = "baumanrarebooks.com";
const CAPTURED_AT = new Date("2026-11-18T16:03:00Z");

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const client = await sb.from("clients").select("id, kind").eq("domain", DOMAIN).maybeSingle();
if (client.error) throw new Error(`client: ${client.error.message}`);
if (!client.data) throw new Error(`No client with domain ${DOMAIN}. Create it first with npm run create-client.`);
if (client.data.kind === "sandbox") throw new Error("Refusing to load real data into a sandbox client");

const store = { ...createSupabaseAiVisibilityStore(sb), targets: async () => [{ clientId: client.data.id, domain: DOMAIN }] };
const s = await runAiVisibility(store, new FixtureSource(), { live: false, maxCostUsd: 1, limit: 40, now: CAPTURED_AT, log: console.error });
console.log(`Loaded under ${DOMAIN}: ${s.calls} platforms, ${s.skipped} already there, ${s.rows} rows, ${s.failed} failed.`);
if (s.failed) process.exit(1);
