// Entry point: node jobs/miniscan/cli.ts [--mode dry-run|live]
// dry-run (default): simulated results, only for scans flagged simulated. No API call.
// live: DataForSEO, only for real scans. Needs MINISCAN_ALLOW_LIVE=yes (the owner's authorization to spend), DFS_LOGIN and DFS_PASSWORD.
import { createClient } from "@supabase/supabase-js";
import { LiveSource } from "../watcher/dataforseo.ts";
import { runMiniScans } from "./run.ts";
import { SimulatedSource } from "./simulated.ts";
import { createSupabaseMiniScanStore } from "./store.ts";

const args = process.argv.slice(2);
const i = args.indexOf("--mode");
const raw = i >= 0 ? args[i + 1] : "dry-run";
if (raw !== "dry-run" && raw !== "live") {
  console.error(`Unknown mode "${raw}". Use --mode dry-run or --mode live.`);
  process.exit(2);
}
const live = raw === "live";

const { SUPABASE_URL, SUPABASE_SECRET_KEY, DFS_LOGIN, DFS_PASSWORD, MINISCAN_ALLOW_LIVE } = process.env;
if (live) {
  if (MINISCAN_ALLOW_LIVE !== "yes") {
    console.error("Live Mini-Scan is disabled. It needs MINISCAN_ALLOW_LIVE=yes, set only after the owner authorizes DataForSEO spending.");
    process.exit(2);
  }
  if (!DFS_LOGIN || !DFS_PASSWORD) {
    console.error("Live mode needs DFS_LOGIN and DFS_PASSWORD.");
    process.exit(2);
  }
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
const store = createSupabaseMiniScanStore(sb);

try {
  const s = await runMiniScans(store, (domain) => (live ? new LiveSource(DFS_LOGIN as string, DFS_PASSWORD as string) : new SimulatedSource(domain)), {
    simulated: !live,
    concurrency: live ? 4 : 1,
    log: console.error,
  });
  console.log(`Mini-Scan (${live ? "live" : "dry-run"}): ${s.scans} scans, ${s.done} done, ${s.failed} failed, cost $${s.costUsd.toFixed(4)}.`);
  process.exit(live && s.failed > 0 ? 1 : 0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
