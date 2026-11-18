// Creates a client. Until the admin screen exists (Phase 7), this is how a client is registered.
//
// Usage:
//   npm run create-client -- --name "EFE Digital" --domain efedigital.com.ar --kind demo
//
// --kind is required on purpose (D-027):
//   real     processed by live watcher runs (costs money once live is enabled)
//   demo     never touched by any job (use it for your own sites and speed-only tests)
//   sandbox  dry-run watcher only

import { createClient } from "@supabase/supabase-js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg("name")?.trim();
  const domain = arg("domain")?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const kind = arg("kind");
  if (!name || !domain || !["real", "demo", "sandbox"].includes(kind)) {
    throw new Error('Usage: --name "<name>" --domain <domain without www> --kind real|demo|sandbox');
  }
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  const existing = await sb.from("clients").select("id, kind").eq("domain", domain).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    console.log(`Already exists: ${domain} (${existing.data.kind}), id ${existing.data.id}`);
    return;
  }
  const { data, error } = await sb.from("clients").insert({ name, domain, kind }).select("id").single();
  if (error) throw error;
  console.log(`Created ${name} (${domain}, ${kind}). Client id: ${data.id}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
