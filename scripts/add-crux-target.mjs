// Adds what the CrUX job should query for a client: the site's origin and, optionally, some key pages.
//
// Usage:
//   npm run add-crux-target -- --domain baumanrarebooks.com --origin https://www.baumanrarebooks.com \
//     --url https://www.baumanrarebooks.com/
//
// CrUX treats https://www.x.com and https://x.com as different origins: use the one real visitors land on.
// --url can be repeated. Safe to run again: existing targets are kept.

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const values = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));

async function main() {
  const domain = values("domain")[0]?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const originArg = values("origin")[0];
  const urls = values("url");
  if (!domain || (!originArg && !urls.length)) throw new Error("Usage: --domain <client domain> --origin <https://origin> [--url <https://page> ...]");

  const rows = [];
  if (originArg) rows.push({ scope: "origin", target: new URL(originArg).origin });
  for (const u of urls) rows.push({ scope: "url", target: new URL(u).toString() });

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  const client = await sb.from("clients").select("id, name").eq("domain", domain).maybeSingle();
  if (client.error) throw client.error;
  if (!client.data) throw new Error(`No client with domain ${domain}. Create it first with npm run create-client.`);

  const { error } = await sb.from("crux_targets").upsert(
    rows.map((r) => ({ client_id: client.data.id, ...r })),
    { onConflict: "client_id,scope,target", ignoreDuplicates: true },
  );
  if (error) throw error;
  console.log(`OK: ${rows.length} target(s) for ${client.data.name}:\n${rows.map((r) => `  ${r.scope}  ${r.target}`).join("\n")}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
