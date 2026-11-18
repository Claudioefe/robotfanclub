// Mini-Scan operations on the database. They take a Supabase client (the secret-key one, server only) and import
// nothing from Next.js, so they can be tested against the real project.
import type { SupabaseClient } from "@supabase/supabase-js";
import { DAILY_SCANS_PER_VISITOR, WEEKLY_SCAN_CAP, parseScanRequest, type ScanMode, type ScanResult } from "./core.ts";

export type SubmitResult = { ok: true; token: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Queues a scan. Nothing here calls DataForSEO: a separate job does that, so a visitor can never trigger spend directly.
 * Limits (checked before inserting): 25 queries, 30 scans per rolling week for everyone, 3 per visitor per day.
 * The caps count only scans of the same kind as the current mode, so simulated tests never use up the real budget.
 * Two simultaneous requests can pass the cap check together and overshoot by a scan or two: acceptable.
 */
export async function submitScanOp(
  sb: SupabaseClient,
  input: { domain: string; queries: string; website?: string; ipHash: string; mode: ScanMode; now?: Date },
): Promise<SubmitResult> {
  if (input.mode === "off") return { ok: false, error: "The Mini-Scan is not open yet." };
  const parsed = parseScanRequest(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const now = input.now ?? new Date();
  const simulated = input.mode === "simulated";
  const countSince = async (since: Date, ipHash?: string) => {
    let q = sb.from("mini_scans").select("id", { count: "exact", head: true }).eq("simulated", simulated).gte("created_at", since.toISOString());
    if (ipHash) q = q.eq("ip_hash", ipHash);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  if ((await countSince(new Date(now.getTime() - 7 * 864e5))) >= WEEKLY_SCAN_CAP) {
    return { ok: false, error: "The Mini-Scan is at capacity this week. Please try again in a few days." };
  }
  if ((await countSince(new Date(now.getTime() - 864e5), input.ipHash)) >= DAILY_SCANS_PER_VISITOR) {
    return { ok: false, error: "You have reached today's limit. Please try again tomorrow." };
  }

  const { data, error } = await sb
    .from("mini_scans")
    .insert({ domain: parsed.value.domain, queries: parsed.value.queries, ip_hash: input.ipHash, simulated, status: "pending" })
    .select("public_token")
    .single();
  if (error) return { ok: false, error: "Could not queue the scan. Please try again." };
  return { ok: true, token: data.public_token as string };
}

export interface ScanView {
  domain: string;
  queryCount: number;
  status: "pending" | "running" | "done" | "failed";
  simulated: boolean;
  result: ScanResult | null;
  createdAt: string;
}

/** What the result page may show. Never the IP hash or the cost. */
export async function getScanByToken(sb: SupabaseClient, token: string): Promise<ScanView | null> {
  if (!UUID.test(token)) return null;
  const { data } = await sb.from("mini_scans").select("domain, queries, status, simulated, result, created_at").eq("public_token", token).maybeSingle();
  if (!data) return null;
  return {
    domain: data.domain as string,
    queryCount: (data.queries as string[]).length,
    status: data.status as ScanView["status"],
    simulated: Boolean(data.simulated),
    result: (data.result as ScanResult | null) ?? null,
    createdAt: data.created_at as string,
  };
}

export interface ScanListRow {
  id: string;
  domain: string;
  status: string;
  simulated: boolean;
  queries: number;
  costUsd: number;
  createdAt: string;
}

/** For the staff Admin: recent scans and how much of this week's capacity is used (real scans only). */
export async function listRecentScans(sb: SupabaseClient, limit = 15): Promise<{ rows: ScanListRow[]; realThisWeek: number }> {
  const { data } = await sb.from("mini_scans").select("id, domain, status, simulated, queries, cost_usd, created_at").order("created_at", { ascending: false }).limit(limit);
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { count } = await sb.from("mini_scans").select("id", { count: "exact", head: true }).eq("simulated", false).gte("created_at", since);
  return {
    rows: (data ?? []).map((r) => ({
      id: r.id as string,
      domain: r.domain as string,
      status: r.status as string,
      simulated: Boolean(r.simulated),
      queries: (r.queries as string[]).length,
      costUsd: Number(r.cost_usd ?? 0),
      createdAt: r.created_at as string,
    })),
    realThisWeek: count ?? 0,
  };
}
