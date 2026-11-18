// The ingest handler wired to the real Supabase dependencies (development project), on a temporary client.
// Skipped without Supabase keys.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { handleIngest } from "@/lib/ingest/handle";
import { hashIp, supabaseIngestDeps } from "@/lib/ingest/deps";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && secretKey);

describe.skipIf(!hasEnv)("ingest endpoint against Supabase", () => {
  const run = crypto.randomUUID().slice(0, 8);
  let admin: SupabaseClient;
  let clientId = "";
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("https://portal.test/api/ingest/vitals", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "text/plain", ...headers } });
  const event = (value: number, over: Record<string, unknown> = {}) => ({
    client_id: clientId, metric: "INP", value, rating: "good", device: "mobile", url_template: "/pricing", nav_type: "navigate", ...over,
  });

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.from("clients").insert({ name: `rls-test ingest ${run}`, domain: `ingest-${run}.test`, kind: "demo" }).select("id").single();
    if (error) throw error;
    clientId = data.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from("ingest_rate_limits").delete().eq("client_id", clientId);
    await admin.from("clients").delete().eq("id", clientId); // cascades to vitals
  });

  it("stores events and feeds the p75 views the portal reads", async () => {
    const deps = supabaseIngestDeps(admin);
    const ip = hashIp("203.0.113.7", secretKey!);
    for (const v of [100, 150, 200, 250, 300]) {
      const res = await handleIngest(post(event(v), { origin: `https://www.ingest-${run}.test` }), deps, ip);
      expect(res.status).toBe(204);
    }
    // desktop events must not count toward mobile INP
    await handleIngest(post(event(900, { device: "desktop" })), deps, ip);

    const { data: rows } = await admin.from("vitals").select("metric, value, url_template, device").eq("client_id", clientId);
    expect(rows).toHaveLength(6);
    const p75 = await admin.from("inp_p75_overall").select("p75, interactions").eq("client_id", clientId).single();
    expect(Number(p75.data!.p75)).toBe(250); // percentile_cont(0.75) of 100, 150, 200, 250, 300
    expect(Number(p75.data!.interactions)).toBe(5);
  });

  it("drops events for unknown clients and rejects foreign origins", async () => {
    const deps = supabaseIngestDeps(admin);
    const before = (await admin.from("vitals").select("id", { count: "exact", head: true }).eq("client_id", clientId)).count;

    const unknown = await handleIngest(post(event(100, { client_id: "00000000-0000-4000-8000-0000000000ee" })), deps, "ip");
    expect(unknown.status).toBe(204);
    const foreign = await handleIngest(post(event(100), { origin: "https://evil.example" }), deps, "ip");
    expect(foreign.status).toBe(403);

    const after = (await admin.from("vitals").select("id", { count: "exact", head: true }).eq("client_id", clientId)).count;
    expect(after).toBe(before);
    const orphans = await admin.from("vitals").select("id").eq("client_id", "00000000-0000-4000-8000-0000000000ee");
    expect(orphans.data).toEqual([]);
  });

  it("persists the rate limit in Postgres", async () => {
    const deps = supabaseIngestDeps(admin);
    expect(await deps.rateOk(clientId, "limited-visitor", 2)).toBe(true);
    expect(await deps.rateOk(clientId, "limited-visitor", 2)).toBe(true);
    expect(await deps.rateOk(clientId, "limited-visitor", 2)).toBe(false);
    // another visitor is not affected
    expect(await deps.rateOk(clientId, "other-visitor", 2)).toBe(true);
  });
});
