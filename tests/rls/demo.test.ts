// Checks that the seeded demo client (npm run seed:demo) produces the prototype's numbers when read
// through RLS as a client user, using the same views the portal reads.
// Skipped without Supabase keys, or when the demo client has not been seeded yet.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCitations, getClient, getHistory, getQueryHistory } from "../../src/lib/data/read.ts";

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

  it("reads the whole day-by-day history (more than 1000 checks) and its SLA line ends at the same 13 citations", async (ctx) => {
    if (!seeded) return ctx.skip();
    const client = (await getClient(member, DEMO))!;
    const cit = (await getCitations(member, client))!;
    const history = await getHistory(member, DEMO, cit);
    expect(history.days).toHaveLength(cit.day); // one cell per day since the window started
    expect(history.queries).toHaveLength(40);
    // The demo stores 38 days of AI Overview checks for 40 queries (1520 rows): they only all show up if the read went past the
    // 1000-row page limit. (The demo's own "today" is fixed at day 38, so the latest days of a later real date show as not checked.)
    const stored = history.queries.reduce((n, q) => n + q.surfaces.ai_overview.filter((s) => s !== "unchecked").length, 0);
    expect(stored).toBe(40 * 38);
    expect(history.daily.at(-1)!.cumulative).toBe(cit.cited); // the strip and the SLA view agree
    expect(history.daily.every((d, i) => i === 0 || d.cumulative >= history.daily[i - 1].cumulative)).toBe(true);
    expect(history.daily.some((d) => d.citedThatDay < d.cumulative)).toBe(true); // citations come and go day to day
  });

  it("reads one query day by day, newest first, with the evidence of the first citation", async (ctx) => {
    if (!seeded) return ctx.skip();
    const client = (await getClient(member, DEMO))!;
    const cit = (await getCitations(member, client))!;
    const cited = cit.rows.find((r) => r.cited)!;
    const days = await getQueryHistory(member, DEMO, cited.query, cit);
    expect(days).toHaveLength(cit.day);
    expect(days[0].day > days[1].day).toBe(true);
    const first = days.find((d) => d.day === cited.firstSeen!.slice(0, 10))!;
    expect(first.surfaces.ai_overview.state).toBe("cited");
    expect(first.surfaces.ai_overview.snapshotPath).toBeTruthy();
    expect(days.filter((d) => d.day < first.day).every((d) => d.state !== "cited")).toBe(true); // nothing cited before the first citation
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
