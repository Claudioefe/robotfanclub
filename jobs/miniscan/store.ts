// Supabase-backed store for the Mini-Scan worker (secret key: jobs only).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScanResult } from "../../src/lib/miniscan/core.ts";
import type { ClaimedScan, MiniScanStore } from "./run.ts";

export function createSupabaseMiniScanStore(sb: SupabaseClient): MiniScanStore {
  return {
    async claim(simulated, limit): Promise<ClaimedScan[]> {
      const { data, error } = await sb.from("mini_scans").select("id, domain, queries").eq("status", "pending").eq("simulated", simulated).order("created_at").limit(limit);
      if (error) throw new Error(`mini_scans: ${error.message}`);
      const claimed: ClaimedScan[] = [];
      for (const s of data ?? []) {
        // Optimistic claim: only the worker whose update still finds the row "pending" gets it
        const { data: won } = await sb.from("mini_scans").update({ status: "running" }).eq("id", s.id).eq("status", "pending").select("id");
        if (won?.length) claimed.push({ id: s.id as string, domain: s.domain as string, queries: s.queries as string[] });
      }
      return claimed;
    },

    async complete(id, result: ScanResult, costUsd) {
      const { error } = await sb.from("mini_scans").update({ status: "done", result, cost_usd: costUsd, completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(`mini_scans: ${error.message}`);
    },

    async fail(id, errorMessage, costUsd) {
      const { error } = await sb.from("mini_scans").update({ status: "failed", error: errorMessage, cost_usd: costUsd, completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(`mini_scans: ${error.message}`);
    },

    async failStale(hours) {
      const before = new Date(Date.now() - hours * 36e5).toISOString();
      const { data } = await sb
        .from("mini_scans")
        .update({ status: "failed", error: "The scan took too long. Please try again.", completed_at: new Date().toISOString() })
        .eq("status", "running")
        .lt("created_at", before)
        .select("id");
      return data?.length ?? 0;
    },
  };
}
