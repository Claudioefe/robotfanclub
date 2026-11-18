// Supabase-backed store for the CrUX job. Uses the secret key: jobs and server code only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CruxRow, CruxStore, StoredTarget } from "./run.ts";

export function createSupabaseCruxStore(sb: SupabaseClient, options: { onlyClientId?: string } = {}): CruxStore {
  return {
    async targets(live) {
      // live: real and demo clients (CrUX is public and free). dry-run: sandbox only, so fixtures never touch real history.
      let clients = sb.from("clients").select("id");
      clients = live ? clients.in("kind", ["real", "demo"]) : clients.eq("kind", "sandbox");
      if (options.onlyClientId) clients = clients.eq("id", options.onlyClientId);
      const { data: list, error } = await clients;
      if (error) throw new Error(`clients: ${error.message}`);
      if (!list?.length) return [];

      const { data, error: targetsError } = await sb
        .from("crux_targets")
        .select("client_id, scope, target")
        .in("client_id", list.map((c) => c.id as string))
        .order("id");
      if (targetsError) throw new Error(`crux_targets: ${targetsError.message}`);
      return (data ?? []).map((t) => ({ clientId: t.client_id as string, scope: t.scope as StoredTarget["scope"], target: t.target as string }));
    },

    async insertRows(rows: CruxRow[]) {
      if (!rows.length) return 0;
      const { data, error } = await sb
        .from("crux_history")
        .upsert(rows, { onConflict: "client_id,scope,target,form_factor,period_end", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`crux_history insert: ${error.message}`);
      return data?.length ?? 0;
    },
  };
}
