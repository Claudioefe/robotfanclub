// Entry point: node jobs/watcher/cli.ts [--mode dry-run|live]
// Needs SUPABASE_URL and SUPABASE_SECRET_KEY. Live mode additionally needs WATCHER_ALLOW_LIVE=yes, DFS_LOGIN and DFS_PASSWORD.
import { createClient } from "@supabase/supabase-js";
import { resolveConfig } from "./config.ts";
import { FixtureSource, LiveSource } from "./dataforseo.ts";
import { runWatcher } from "./run.ts";
import { createSupabaseStore } from "./store.ts";

const config = resolveConfig(process.argv.slice(2), process.env);
if (!config.ok) {
  console.error(config.error);
  process.exit(2);
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  if (config.mode === "dry_run") {
    console.log("::notice::Supabase secrets are not set, so the dry-run was skipped.");
    process.exit(0);
  }
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(2);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const source = config.mode === "live" ? new LiveSource(config.dfsLogin, config.dfsPassword) : new FixtureSource();

try {
  // Spend ceiling per run (USD, as reported by DataForSEO). A client with 40 queries costs about $0.27 per day.
  // An empty or invalid value (GitHub passes "" for an unset variable) falls back to the default.
  const configured = Number(process.env.WATCHER_MAX_COST_USD);
  const maxCostUsd = configured > 0 ? configured : 5;
  const summary = await runWatcher(createSupabaseStore(sb), source, { mode: config.mode, log: console.error, maxCostUsd });
  console.log(
    `Watcher (${config.mode}, ${source.name}): ${summary.queriesOk} ok, ${summary.queriesFailed} failed, ` +
      `${summary.queriesSkipped} already done, ${summary.checksWritten} checks written, cost $${summary.costUsd}.`,
  );
  if (process.env.GITHUB_ACTIONS) for (const e of summary.errors) console.log(`::warning::${e.query} (${e.surface ?? "both"}): ${e.message}`);
  // A live run with any failure ends red, so GitHub emails the owner: a missing check is lost evidence.
  // Dry-run only fails when nothing worked at all. Details are always stored in watcher_runs.
  const failed = config.mode === "live" ? summary.queriesFailed > 0 || summary.stopped !== null : summary.queriesOk === 0 && summary.queriesFailed > 0;
  process.exit(failed ? 1 : 0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
