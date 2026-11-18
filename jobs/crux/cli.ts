// Entry point: node jobs/crux/cli.ts [--mode dry-run|live] [--backfill]
// dry-run (default): fixtures, sandbox clients only. live: Google's CrUX API, needs CRUX_API_KEY.
// --backfill reads the weekly history (up to 40 periods) instead of the current window: run it once when a client is added.
import { createClient } from "@supabase/supabase-js";
import { runCrux } from "./run.ts";
import { FixtureSource, LiveSource } from "./source.ts";
import { createSupabaseCruxStore } from "./store.ts";

const args = process.argv.slice(2);
const modeIndex = args.indexOf("--mode");
const rawMode = modeIndex >= 0 ? args[modeIndex + 1] : "dry-run";
if (rawMode !== "dry-run" && rawMode !== "live") {
  console.error(`Unknown mode "${rawMode}". Use --mode dry-run or --mode live.`);
  process.exit(2);
}
const live = rawMode === "live";
const backfill = args.includes("--backfill");

const { SUPABASE_URL, SUPABASE_SECRET_KEY, CRUX_API_KEY } = process.env;
if (live && !CRUX_API_KEY) {
  console.error("Live mode needs CRUX_API_KEY.");
  process.exit(2);
}
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  if (!live) {
    console.log("::notice::Supabase secrets are not set, so the dry-run was skipped.");
    process.exit(0);
  }
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(2);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const source = live ? new LiveSource(CRUX_API_KEY as string) : new FixtureSource();

try {
  const s = await runCrux(createSupabaseCruxStore(sb), source, { mode: backfill ? "backfill" : "daily", live, log: console.error });
  console.log(
    `CrUX (${live ? "live" : "dry-run"}, ${backfill ? "backfill" : "daily"}): ${s.targets} targets, ${s.withData} with data, ` +
      `${s.noData} without data, ${s.failed} failed, ${s.rowsWritten} new rows.`,
  );
  if (process.env.GITHUB_ACTIONS) for (const e of s.errors) console.log(`::warning::${e.target}: ${e.message}`);
  if (s.stopped) console.error(s.stopped);
  // A failed live run ends red so GitHub notifies the owner. "No data" is not a failure.
  process.exit(live ? (s.failed > 0 ? 1 : 0) : s.targets > 0 && s.failed === s.targets ? 1 : 0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
