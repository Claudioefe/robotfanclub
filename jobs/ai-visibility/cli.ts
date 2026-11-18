// Entry point: node jobs/ai-visibility/cli.ts [--mode dry-run|live]
// dry-run (default): real responses saved in tests/fixtures, sandbox clients only. No network call to DataForSEO.
// live: calls DataForSEO LLM Mentions for real clients. Costs money (about USD 0.14 per client and platform), so it needs
// AI_VISIBILITY_ALLOW_LIVE=yes, DFS_LOGIN and DFS_PASSWORD. D-040.
import { createClient } from "@supabase/supabase-js";
import { runAiVisibility } from "./run.ts";
import { DEFAULT_LIMIT, FixtureSource, LiveSource } from "./source.ts";
import { createSupabaseAiVisibilityStore } from "./store.ts";

const args = process.argv.slice(2);
const i = args.indexOf("--mode");
const mode = i >= 0 ? args[i + 1] : "dry-run";
if (mode !== "dry-run" && mode !== "live") {
  console.error(`Unknown mode "${mode}". Use --mode dry-run or --mode live.`);
  process.exit(2);
}
const live = mode === "live";
const env = process.env;

if (live) {
  if (env.AI_VISIBILITY_ALLOW_LIVE !== "yes") {
    console.error("Live mode is disabled. It needs AI_VISIBILITY_ALLOW_LIVE=yes, set only after the owner authorizes DataForSEO spending.");
    process.exit(2);
  }
  if (!env.DFS_LOGIN || !env.DFS_PASSWORD) {
    console.error("Live mode needs DFS_LOGIN and DFS_PASSWORD.");
    process.exit(2);
  }
}
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  if (!live) {
    console.log("::notice::Supabase secrets are not set, so the dry-run was skipped.");
    process.exit(0);
  }
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(2);
}

const maxCostUsd = Number(env.AI_VISIBILITY_MAX_COST_USD ?? "2");
if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) {
  console.error("AI_VISIBILITY_MAX_COST_USD must be a positive number.");
  process.exit(2);
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const source = live ? new LiveSource(env.DFS_LOGIN as string, env.DFS_PASSWORD as string, { limit: DEFAULT_LIMIT }) : new FixtureSource();

try {
  const s = await runAiVisibility(createSupabaseAiVisibilityStore(sb), source, { live, maxCostUsd, limit: DEFAULT_LIMIT, log: console.error });
  console.log(
    `AI visibility (${mode}): ${s.targets} clients, ${s.calls} calls, ${s.skipped} already done today, ${s.failed} failed, ` +
      `${s.rows} rows, USD ${s.costUsd.toFixed(3)}.`,
  );
  if (process.env.GITHUB_ACTIONS) for (const e of s.errors) console.log(`::warning::${e.client_id} ${e.platform}: ${e.message}`);
  if (s.stopped) console.error(s.stopped);
  process.exit(live ? (s.failed > 0 || s.stopped ? 1 : 0) : s.targets > 0 && s.failed === s.targets ? 1 : 0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
