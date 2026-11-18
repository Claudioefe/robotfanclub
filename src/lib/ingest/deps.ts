// Supabase-backed dependencies for the ingest endpoint. Takes a service client (secret key): server only.
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IngestDeps } from "./handle.ts";

const CACHE_MS = 60_000;

/** Hash of the visitor's IP for the rate limit. Raw IPs are never stored. */
export const hashIp = (ip: string, secret: string) => createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);

export function supabaseIngestDeps(sb: SupabaseClient, extraOrigins?: string): IngestDeps {
  // Per-instance cache so a busy site does not hit the database to look up its own client on every event.
  const clients = new Map<string, { value: { domain: string } | null; at: number }>();

  return {
    extraOrigins: (extraOrigins ?? "").split(",").map((s) => s.trim()).filter(Boolean),

    async findClient(id) {
      const hit = clients.get(id);
      if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
      const { data, error } = await sb.from("clients").select("domain").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      const value = data ? { domain: data.domain as string } : null;
      clients.set(id, { value, at: Date.now() });
      return value;
    },

    async rateOk(clientId, ipHash, limit) {
      const { data, error } = await sb.rpc("ingest_rate_check", { p_client: clientId, p_ip_hash: ipHash, p_limit: limit });
      if (error) throw new Error(error.message);
      return data === true;
    },

    async insert(event) {
      const { error } = await sb.from("vitals").insert(event);
      if (error) throw new Error(error.message);
    },
  };
}
