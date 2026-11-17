// Checks that the seeded demo client (npm run seed:demo) produces the prototype's numbers when read
// through RLS as a client user, using the same views the portal reads.
// Skipped without Supabase keys, or when the demo client has not been seeded yet.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);
const DEMO = "00000000-0000-4000-8000-000000000001";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

describe.skipIf(!hasEnv)("demo client through the portal views", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const email = `rls-test-${run}-demo@example.com`;
  const password = `Pw-${crypto.randomUUID()}`;
  let admin: SupabaseClient;
  let member: SupabaseClient;
  let userId = "";
  let seeded = false;

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    const demo = await admin.from("clients").select("id").eq("id", DEMO).maybeSingle();
    seeded = Boolean(demo.data);
    if (!seeded) return;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    await admin.from("client_members").insert({ client_id: DEMO, user_id: userId });
    member = createClient(url!, publishableKey!, opts);
    const signIn = await member.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId); // cascades the membership
  });

  it("counts 13 citations, 6 of them from outside the top 10", async (ctx) => {
    if (!seeded) return ctx.skip();
    const { data, error } = await member.from("sla_citations").select("query, first_off_top10").eq("client_id", DEMO);
    expect(error).toBeNull();
    expect(data).toHaveLength(13);
    expect(data!.filter((r) => r.first_off_top10)).toHaveLength(6);
  });

  it("has one first-citation evidence row per citation, with a snapshot", async (ctx) => {
    if (!seeded) return ctx.skip();
    const { data } = await member.from("citation_first_checks").select("query, snapshot_path").eq("client_id", DEMO);
    expect(data).toHaveLength(13);
    expect(data!.every((r) => r.snapshot_path)).toBe(true);
    const file = await member.storage.from("snapshots").download(data![0].snapshot_path as string);
    expect(file.error).toBeNull();
  });

  it("keeps AI Mode citations inside the AI Overview citations", async (ctx) => {
    if (!seeded) return ctx.skip();
    const { data } = await member.from("sla_citations").select("surfaces").eq("client_id", DEMO);
    expect(data!.every((r) => (r.surfaces as string[]).includes("ai_overview"))).toBe(true);
    expect(data!.some((r) => (r.surfaces as string[]).includes("ai_mode"))).toBe(true);
  });

  it("exposes the latest check per query and surface", async (ctx) => {
    if (!seeded) return ctx.skip();
    const { data } = await member.from("latest_checks").select("query, surface").eq("client_id", DEMO);
    expect(data!.filter((r) => r.surface === "ai_overview")).toHaveLength(40);
  });

  it("lands the overall mobile INP p75 near the prototype's 214 ms", async (ctx) => {
    if (!seeded) return ctx.skip();
    const { data } = await member.from("inp_p75_overall").select("p75, interactions").eq("client_id", DEMO).single();
    expect(Number(data!.p75)).toBeGreaterThanOrEqual(212);
    expect(Number(data!.p75)).toBeLessThanOrEqual(216);
  });

  it("has a daily trend, per-template p75 and Tag Bouncer scripts", async (ctx) => {
    if (!seeded) return ctx.skip();
    const daily = await member.from("inp_p75_daily").select("day").eq("client_id", DEMO);
    expect(daily.data!.length).toBeGreaterThanOrEqual(25);
    const templates = await member.from("inp_p75").select("url_template").eq("client_id", DEMO);
    expect(templates.data).toHaveLength(6);
    const tags = await member.from("tag_bouncer_scripts").select("id, is_required").eq("client_id", DEMO);
    expect(tags.data).toHaveLength(6);
    expect(tags.data!.filter((t) => t.is_required)).toHaveLength(1);
  });

  it("reads the sprint deploy date and baseline, but still not the Slack webhook", async (ctx) => {
    if (!seeded) return ctx.skip();
    const ok = await member.from("clients").select("inp_sprint_deployed_on, inp_baseline_ms").eq("id", DEMO).single();
    expect(ok.data).toEqual({ inp_sprint_deployed_on: "2026-10-26", inp_baseline_ms: 296 });
    expect((await member.from("clients").select("slack_webhook_url")).error).not.toBeNull();
  });
});
