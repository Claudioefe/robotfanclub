// Decides which mode the watcher runs in, and refuses live mode unless it was explicitly enabled.
// Hard rule (CLAUDE.md): DataForSEO is not called with real credentials until the owner authorizes it.

export type Mode = "dry_run" | "live";

export type Config =
  | { ok: true; mode: "dry_run" }
  | { ok: true; mode: "live"; dfsLogin: string; dfsPassword: string }
  | { ok: false; error: string };

// Live checks must run at the same time every day (D-006). The scheduled run is at 14:00 UTC; GitHub can delay it,
// so the window is 14:00 to 16:59 UTC. Outside it, a manual live run would take the day's slot at the wrong hour.
export const LIVE_HOURS_UTC = { from: 14, to: 16 } as const;

export function resolveConfig(argv: string[], env: Record<string, string | undefined>, now: Date = new Date()): Config {
  const i = argv.indexOf("--mode");
  const raw = i >= 0 ? argv[i + 1] : "dry-run";
  if (raw !== "dry-run" && raw !== "live") return { ok: false, error: `Unknown mode "${raw}". Use --mode dry-run or --mode live.` };
  if (raw === "dry-run") return { ok: true, mode: "dry_run" };

  if (env.WATCHER_ALLOW_LIVE !== "yes") {
    return { ok: false, error: "Live mode is disabled. It needs WATCHER_ALLOW_LIVE=yes, which is set only after the owner authorizes DataForSEO spending." };
  }
  if (!env.DFS_LOGIN || !env.DFS_PASSWORD) return { ok: false, error: "Live mode needs DFS_LOGIN and DFS_PASSWORD." };
  const hour = now.getUTCHours();
  if ((hour < LIVE_HOURS_UTC.from || hour > LIVE_HOURS_UTC.to) && env.WATCHER_ALLOW_OFF_HOUR !== "yes") {
    return { ok: false, error: `Live runs must happen between ${LIVE_HOURS_UTC.from}:00 and ${LIVE_HOURS_UTC.to}:59 UTC so the series keeps the same hour (D-006). Set WATCHER_ALLOW_OFF_HOUR=yes only with the owner's approval.` };
  }
  return { ok: true, mode: "live", dfsLogin: env.DFS_LOGIN, dfsPassword: env.DFS_PASSWORD };
}
