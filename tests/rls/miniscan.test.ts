// Mini-Scan against the development project: queueing with its limits, the result view, and the worker's
// simulated/real separation. Needs the Phase 7C migration (mini_scans status columns). Skipped without keys.
// Only SIMULATED scans are created here: a real pending scan could be picked up by a live worker.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runMiniScans } from "../../jobs/miniscan/run.ts";
import { SimulatedSource } from "../../jobs/miniscan/simulated.ts";
import { createSupabaseMiniScanStore } from "../../jobs/miniscan/store.ts";
import { DAILY_SCANS_PER_VISITOR, WEEKLY_SCAN_CAP } from "@/lib/miniscan/core";
import { getScanByToken, listRecentScans, submitScanOp } from "@/lib/miniscan/ops";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

describe.skipIf(!hasEnv)("mini-scan against Supabase (simulated scans only)", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const domain = (n: number) => `rlstest-${run}-${n}.test`;
  const ip = (n: number) => `rlstest-ip-${run}-${n}`;
  let admin: SupabaseClient;
  const queries = "best crm\ncrm pricing\nwhat is a crm";

  beforeAll(() => {
    admin = createClient(url!, secretKey!, opts);
  });

  afterAll(async () => {
    if (admin) await admin.from("mini_scans").delete().like("domain", `rlstest-${run}-%`);
  });

  it("is closed when the mode is off, and writes nothing", async () => {
    const r = await submitScanOp(admin, { domain: domain(0), queries, ipHash: ip(0), mode: "off" });
    expect(r).toEqual({ ok: false, error: "The Mini-Scan is not open yet." });
    expect((await admin.from("mini_scans").select("id").eq("domain", domain(0))).data).toEqual([]);
  });

  it("queues a simulated scan with a private token and returns only what the visitor may see", async () => {
    const r = await submitScanOp(admin, { domain: `https://www.${domain(1)}/`, queries, ipHash: ip(1), mode: "simulated" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.token).toMatch(/^[0-9a-f-]{36}$/);

    const view = await getScanByToken(admin, r.token);
    expect(view).toMatchObject({ domain: domain(1), queryCount: 3, status: "pending", simulated: true, result: null });
    expect(Object.keys(view!).sort()).toEqual(["createdAt", "domain", "queryCount", "result", "simulated", "status"]); // no ip_hash, no cost
    expect(await getScanByToken(admin, "not-a-token")).toBeNull();
    expect(await getScanByToken(admin, "00000000-0000-4000-8000-0000000000ee")).toBeNull();
  });

  it("refuses a honeypot, too many queries and bad domains before writing anything", async () => {
    const before = (await admin.from("mini_scans").select("id", { count: "exact", head: true }).like("domain", `rlstest-${run}-%`)).count;
    expect((await submitScanOp(admin, { domain: domain(2), queries, website: "spam", ipHash: ip(2), mode: "simulated" })).ok).toBe(false);
    const tooMany = Array.from({ length: 26 }, (_, i) => `query ${i}`).join("\n");
    expect((await submitScanOp(admin, { domain: domain(2), queries: tooMany, ipHash: ip(2), mode: "simulated" })).ok).toBe(false);
    expect((await submitScanOp(admin, { domain: "not a domain", queries, ipHash: ip(2), mode: "simulated" })).ok).toBe(false);
    const after = (await admin.from("mini_scans").select("id", { count: "exact", head: true }).like("domain", `rlstest-${run}-%`)).count;
    expect(after).toBe(before);
  });

  it(`allows ${DAILY_SCANS_PER_VISITOR} scans per visitor per day, then refuses the next`, async () => {
    for (let i = 0; i < DAILY_SCANS_PER_VISITOR; i++) {
      expect((await submitScanOp(admin, { domain: domain(10 + i), queries, ipHash: ip(3), mode: "simulated" })).ok).toBe(true);
    }
    const blocked = await submitScanOp(admin, { domain: domain(19), queries, ipHash: ip(3), mode: "simulated" });
    expect(blocked).toMatchObject({ ok: false });
    expect(!blocked.ok && blocked.error).toMatch(/today's limit/);
    // another visitor is not affected
    expect((await submitScanOp(admin, { domain: domain(20), queries, ipHash: ip(4), mode: "simulated" })).ok).toBe(true);
  });

  it(`refuses everyone once ${WEEKLY_SCAN_CAP} scans were made in the last 7 days`, async () => {
    // Top up to the cap with simulated rows, then try as a brand-new visitor
    const current = (await admin.from("mini_scans").select("id", { count: "exact", head: true }).eq("simulated", true).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString())).count ?? 0;
    const missing = Math.max(0, WEEKLY_SCAN_CAP - current);
    if (missing) {
      const fill = Array.from({ length: missing }, (_, i) => ({ domain: domain(100 + i), queries: ["q"], ip_hash: ip(50 + i), simulated: true, status: "done" }));
      expect((await admin.from("mini_scans").insert(fill)).error).toBeNull();
    }
    const r = await submitScanOp(admin, { domain: domain(200), queries, ipHash: ip(99), mode: "simulated" });
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toMatch(/capacity this week/);
  });

  it("the worker completes simulated scans, never touches a real one, and the result shows through the token", async () => {
    // A pending REAL scan (simulated = false) must be left alone by the dry-run worker
    const real = await admin.from("mini_scans").insert({ domain: domain(300), queries: ["q"], ip_hash: ip(300), simulated: false, status: "pending" }).select("id, public_token").single();
    const sim = await admin.from("mini_scans").insert({ domain: domain(301), queries: queries.split("\n"), ip_hash: ip(301), simulated: true, status: "pending" }).select("id, public_token").single();
    expect(sim.error).toBeNull();

    // The worker takes the oldest pending simulated scans, which may include rows from this file: run until ours is done
    const store = createSupabaseMiniScanStore(admin);
    for (let i = 0; i < 6; i++) {
      await runMiniScans(store, (d) => new SimulatedSource(d), { simulated: true, maxScans: 50, retryWaitMs: 0, sleep: async () => {} });
      const s = await admin.from("mini_scans").select("status").eq("id", sim.data!.id).single();
      if (s.data!.status === "done") break;
    }

    const view = await getScanByToken(admin, sim.data!.public_token as string);
    expect(view).toMatchObject({ status: "done", simulated: true });
    expect(view!.result!.rows.map((r) => r.query)).toEqual(["best crm", "crm pricing", "what is a crm"]);
    expect(view!.result!.checked).toBe(3);

    const realAfter = await admin.from("mini_scans").select("status").eq("id", real.data!.id).single();
    expect(realAfter.data!.status).toBe("pending"); // untouched by the simulated worker
    await admin.from("mini_scans").delete().eq("id", real.data!.id); // remove it before any live worker could see it
  });

  it("users and visitors cannot read the table directly, and the Admin list shows no real scan from this test", async () => {
    const anon = createClient(url!, publishableKey!, opts);
    expect((await anon.from("mini_scans").select("id")).error).not.toBeNull();
    const list = await listRecentScans(admin, 50);
    expect(list.rows.every((r) => r.simulated || !r.domain.startsWith(`rlstest-${run}`))).toBe(true);
  });
});
