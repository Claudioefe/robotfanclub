// Loads the two real LLM Mentions responses captured on 2026-11-18 (tests/fixtures/real) into the portal, under the
// Bauman Rare Books demo client, so the AI visibility page shows real data. It uses the same parser, storage layout and
// job code as the weekly job. Costs nothing: no DataForSEO call is made.
//
// Usage: npm run load-real-mentions                      (the one client with that domain)
//        npm run load-real-mentions -- --client <uuid>   (needed when several clients share the domain)
// Safe to run again: platforms already stored for that day are skipped.
// With --client the load records cost 0: the same capture is already stored (and costed) under another client, so loading
// it again must not count as new spending in Admin > Costs.

import { createClient } from "@supabase/supabase-js";
import { runAiVisibility } from "../jobs/ai-visibility/run.ts";
import { FixtureSource } from "../jobs/ai-visibility/source.ts";
import { createSupabaseAiVisibilityStore } from "../jobs/ai-visibility/store.ts";

const DOMAIN = "baumanrarebooks.com";
const CAPTURED_AT = new Date("2026-11-18T16:03:00Z");

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const clientArg = process.argv.includes("--client") ? process.argv[process.argv.indexOf("--client") + 1] : null;
const query = sb.from("clients").select("id, name, kind, domain");
const found = clientArg ? await query.eq("id", clientArg) : await query.eq("domain", DOMAIN);
if (found.error) throw new Error(`client: ${found.error.message}`);
if (!found.data?.length) throw new Error(clientArg ? `No client with id ${clientArg}.` : `No client with domain ${DOMAIN}. Create it first with npm run create-client.`);
if (found.data.length > 1) throw new Error(`Several clients share ${DOMAIN}: pick one with --client <uuid> (${found.data.map((c) => `${c.name} ${c.id}`).join("; ")}).`);
const client = { data: found.data[0] };
if (client.data.kind === "sandbox") throw new Error("Refusing to load real data into a sandbox client");

const store = { ...createSupabaseAiVisibilityStore(sb), targets: async () => [{ clientId: client.data.id, domain: DOMAIN }] };
const fixtures = new FixtureSource();
// A reload under another client is not new spending: record it as free.
const source = clientArg ? { name: fixtures.name, matchDomain: () => fixtures.matchDomain(), mentions: async (d, p) => ({ ...(await fixtures.mentions(d, p)), cost: 0 }) } : fixtures;
const s = await runAiVisibility(store, source, { live: false, maxCostUsd: 1, limit: 40, now: CAPTURED_AT, log: console.error });
console.log(`Loaded under ${client.data.name} (${DOMAIN}): ${s.calls} platforms, ${s.skipped} already there, ${s.rows} rows, ${s.failed} failed.`);
if (s.failed) process.exit(1);
