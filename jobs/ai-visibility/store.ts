// Supabase-backed store for the AI visibility job. Uses the secret key: jobs and server code only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiVisibilityStore, RunRow } from "./run.ts";
import type { MentionRow } from "./parser.ts";

export function createSupabaseAiVisibilityStore(sb: SupabaseClient, options: { onlyClientId?: string } = {}): AiVisibilityStore {
  return {
    async targets(live) {
      let q = sb.from("clients").select("id, domain");
      q = live ? q.eq("kind", "real") : q.eq("kind", "sandbox");
      if (options.onlyClientId) q = q.eq("id", options.onlyClientId);
      const { data, error } = await q.order("name");
      if (error) throw new Error(`clients: ${error.message}`);
      return (data ?? []).map((c) => ({ clientId: c.id as string, domain: c.domain as string }));
    },

    async hasRun(clientId, platform, day) {
      const { data, error } = await sb.from("ai_mention_runs").select("id").eq("client_id", clientId).eq("platform", platform).eq("captured_on", day).limit(1);
      if (error) throw new Error(`ai_mention_runs: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },

    async saveSnapshot(path, json) {
      const { error } = await sb.storage.from("snapshots").upload(path, json, { contentType: "application/json", upsert: false });
      if (error) throw new Error(`snapshot ${path}: ${error.message}`);
    },

    async insertRun(run: RunRow, rows: MentionRow[]) {
      const inserted = await sb.from("ai_mention_runs").insert(run).select("id").single();
      if (inserted.error) throw new Error(`ai_mention_runs insert: ${inserted.error.message}`);
      if (!rows.length) return;
      const { error } = await sb
        .from("ai_mentions")
        .insert(rows.map((r) => ({ ...r, client_id: run.client_id, platform: run.platform, captured_on: run.captured_on })));
      if (error) {
        await sb.from("ai_mention_runs").delete().eq("id", inserted.data.id); // do not leave a run without its rows
        throw new Error(`ai_mentions insert: ${error.message}`);
      }
    },
  };
}
