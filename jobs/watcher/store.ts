// Supabase-backed Store for the watcher. Uses the secret key, so it only runs in jobs and server code.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mode } from "./config.ts";
import type { CheckRow, RunSummary, Store, Target } from "./run.ts";

export function createSupabaseStore(sb: SupabaseClient, options: { onlyClientId?: string } = {}): Store {
  return {
    async startRun(mode: Mode) {
      const { data, error } = await sb.from("watcher_runs").insert({ mode }).select("id").single();
      if (error) throw new Error(`watcher_runs insert: ${error.message}`);
      return data.id as number;
    },

    async finishRun(id, summary: RunSummary) {
      if (id === null) return;
      const { error } = await sb
        .from("watcher_runs")
        .update({
          finished_at: new Date().toISOString(),
          checks_written: summary.checksWritten,
          queries_ok: summary.queriesOk,
          queries_failed: summary.queriesFailed,
          cost_usd: summary.costUsd,
          errors: summary.errors,
        })
        .eq("id", id);
      if (error) throw new Error(`watcher_runs update: ${error.message}`);
    },

    async targets(kind, today): Promise<Target[]> {
      let q = sb.from("clients").select("id, domain").eq("kind", kind);
      if (options.onlyClientId) q = q.eq("id", options.onlyClientId);
      const { data: clients, error } = await q;
      if (error) throw new Error(`clients: ${error.message}`);

      const targets: Target[] = [];
      for (const c of clients ?? []) {
        const { data: sets, error: setsError } = await sb
          .from("query_sets")
          .select("query")
          .eq("client_id", c.id)
          .lte("frozen_from", today)
          .gte("frozen_until", today)
          .order("id");
        if (setsError) throw new Error(`query_sets: ${setsError.message}`);
        if (sets?.length) targets.push({ clientId: c.id as string, domain: c.domain as string, queries: sets.map((s) => s.query as string) });
      }
      return targets;
    },

    async existing(clientId, day) {
      // PostgREST returns at most 1000 rows per request, so read in pages.
      const keys = new Set<string>();
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb
          .from("aio_checks")
          .select("query, surface")
          .eq("client_id", clientId)
          .eq("checked_on", day)
          .order("id")
          .range(from, from + 999);
        if (error) throw new Error(`aio_checks: ${error.message}`);
        for (const r of data ?? []) keys.add(`${r.query}|${r.surface}`);
        if ((data?.length ?? 0) < 1000) return keys;
      }
    },

    async saveSnapshot(path, json) {
      // Paths are unique per query and run, so an existing file is a real error: never reuse a file for a different response.
      const { error } = await sb.storage.from("snapshots").upload(path, json, { contentType: "application/json", upsert: false });
      if (error) throw new Error(`snapshot ${path}: ${error.message}`);
    },

    async insertCheck(row: CheckRow) {
      const { data, error } = await sb
        .from("aio_checks")
        .upsert(row, { onConflict: "client_id,query,surface,checked_on", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`aio_checks insert: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },
  };
}
