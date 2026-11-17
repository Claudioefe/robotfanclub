// RLS tests against the development Supabase project.
// They create temporary clients and users (prefix "rls-test") and delete them at the end.
// Skipped automatically when Supabase keys are not in .env.local.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);

const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

describe.skipIf(!hasEnv)("row level security", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const password = `Pw-${crypto.randomUUID()}`;
  const emails = {
    a: `rls-test-${run}-a@example.com`,
    b: `rls-test-${run}-b@example.com`,
    staff: `rls-test-${run}-staff@example.com`,
    outsider: `rls-test-${run}-out@example.com`,
  };

  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let staff: SupabaseClient;
  let outsider: SupabaseClient;
  let clientA = "";
  let clientB = "";
  const userIds: string[] = [];
  const pathA = () => `${clientA}/${day(0)}/ai_overview/q1.json`;
  const pathB = () => `${clientB}/${day(0)}/ai_overview/q1.json`;

  async function makeUser(email: string) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userIds.push(data.user.id);
    const sb = createClient(url!, publishableKey!, opts);
    const signIn = await sb.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    return { sb, id: data.user.id };
  }

  const ok = (label: string, r: { error: { message: string } | null }) => {
    if (r.error) throw new Error(`${label}: ${r.error.message}`);
  };

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    anon = createClient(url!, publishableKey!, opts);

    const a = await admin.from("clients").insert({ name: `rls-test A ${run}`, domain: `a-${run}.test` }).select("id").single();
    const b = await admin.from("clients").insert({ name: `rls-test B ${run}`, domain: `b-${run}.test` }).select("id").single();
    if (a.error || b.error) throw a.error ?? b.error;
    clientA = a.data.id;
    clientB = b.data.id;

    const ua = await makeUser(emails.a);
    const ub = await makeUser(emails.b);
    const us = await makeUser(emails.staff);
    const uo = await makeUser(emails.outsider);
    userA = ua.sb; userB = ub.sb; staff = us.sb; outsider = uo.sb;

    ok("members", await admin.from("client_members").insert([
      { client_id: clientA, user_id: ua.id },
      { client_id: clientB, user_id: ub.id },
    ]));
    ok("staff", await admin.from("staff").insert({ user_id: us.id }));

    const from = day(-5);
    const until = day(54);
    ok("query_sets", await admin.from("query_sets").insert([
      { client_id: clientA, query: "q1", frozen_from: from, frozen_until: until },
      { client_id: clientA, query: "q2", frozen_from: from, frozen_until: until },
      { client_id: clientB, query: "q1", frozen_from: from, frozen_until: until },
    ]));
    ok("aio_checks", await admin.from("aio_checks").insert([
      // A cited "q1" on two different days (counts once) and never organic: off-top10
      { client_id: clientA, query: "q1", surface: "ai_overview", checked_on: day(-2), checked_at: `${day(-2)}T14:00:00Z`, aio_present: true, cited: true, organic_rank: null },
      { client_id: clientA, query: "q1", surface: "ai_overview", checked_on: day(-1), checked_at: `${day(-1)}T14:00:00Z`, aio_present: true, cited: true, organic_rank: null },
      { client_id: clientA, query: "q2", surface: "ai_overview", checked_on: day(-1), checked_at: `${day(-1)}T14:00:00Z`, aio_present: true, cited: false },
      { client_id: clientB, query: "q1", surface: "ai_overview", checked_on: day(-1), checked_at: `${day(-1)}T14:00:00Z`, aio_present: true, cited: true, organic_rank: 3 },
    ]));
    ok("citation_cards", await admin.from("citation_cards").insert([
      { client_id: clientA, query: "q1", frozen_from: from, surface: "ai_overview", cited_url: "https://a.test/x", off_top10: true, first_seen_at: new Date().toISOString(), slack_error: "secret-detail" },
      { client_id: clientB, query: "q1", frozen_from: from, surface: "ai_overview", cited_url: "https://b.test/x", off_top10: false, first_seen_at: new Date().toISOString() },
    ]));
    ok("crux_history", await admin.from("crux_history").insert([
      { client_id: clientA, scope: "origin", target: "https://a.test", period_start: day(-28), period_end: day(0), inp_p75_ms: 180 },
      { client_id: clientB, scope: "origin", target: "https://b.test", period_start: day(-28), period_end: day(0), inp_p75_ms: 420 },
    ]));
    ok("vitals", await admin.from("vitals").insert([
      { client_id: clientA, metric: "INP", value: 180, device: "mobile", url_template: "/a" },
      { client_id: clientB, metric: "INP", value: 420, device: "mobile", url_template: "/b" },
    ]));
    ok("snapshot A", await admin.storage.from("snapshots").upload(pathA(), '{"who":"A"}', { contentType: "application/json" }));
    ok("snapshot B", await admin.storage.from("snapshots").upload(pathB(), '{"who":"B"}', { contentType: "application/json" }));
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.storage.from("snapshots").remove([pathA(), pathB()]);
    await admin.from("ingest_rate_limits").delete().eq("client_id", clientA);
    await admin.from("clients").delete().in("id", [clientA, clientB].filter(Boolean)); // cascades to child rows
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  });

  describe("client users", () => {
    it("see only their own client", async () => {
      const { data } = await userA.from("clients").select("id");
      expect(data?.map((c) => c.id)).toEqual([clientA]);
      const b = await userB.from("clients").select("id");
      expect(b.data?.map((c) => c.id)).toEqual([clientB]);
    });

    it("see only their own rows in every client table and view", async () => {
      for (const table of ["query_sets", "aio_checks", "vitals", "sla_citations", "citation_rate", "inp_p75"]) {
        const { data, error } = await userA.from(table).select("client_id");
        expect(error, table).toBeNull();
        expect(data?.length, table).toBeGreaterThan(0);
        expect(data?.every((r) => r.client_id === clientA), table).toBe(true);
      }
    });

    it("see only their own citation cards and CrUX history", async () => {
      for (const table of ["citation_cards", "crux_history"]) {
        const { data, error } = await userA.from(table).select("client_id");
        expect(error, table).toBeNull();
        expect(data?.length, table).toBe(1);
        expect(data![0].client_id, table).toBe(clientA);
      }
    });

    it("cannot read staff-only columns (API cost, Slack errors)", async () => {
      expect((await userA.from("aio_checks").select("cost_usd")).error).not.toBeNull();
      expect((await userA.from("aio_checks").select("*")).error).not.toBeNull();
      expect((await userA.from("citation_cards").select("slack_error")).error).not.toBeNull();
      expect((await userA.from("aio_checks").select("query, cited, off_top10")).error).toBeNull();
    });

    it("cannot list another client's snapshot folder", async () => {
      const theirs = await userA.storage.from("snapshots").list(clientB);
      expect(theirs.data ?? []).toEqual([]);
      const mine = await userA.storage.from("snapshots").list(clientA);
      expect(mine.data?.length).toBeGreaterThan(0);
    });

    it("cannot read the Slack webhook column", async () => {
      expect((await userA.from("clients").select("slack_webhook_url")).error).not.toBeNull();
      expect((await userA.from("clients").select("*")).error).not.toBeNull();
    });

    it("cannot write anything", async () => {
      const row = { client_id: clientA, query: "q9", surface: "ai_overview", aio_present: true };
      expect((await userA.from("aio_checks").insert(row)).error).not.toBeNull();
      expect((await userA.from("clients").update({ name: "hacked" }).eq("id", clientA)).error).not.toBeNull();
      expect((await userA.from("clients").delete().eq("id", clientA)).error).not.toBeNull();
      expect((await userA.from("staff").insert({ user_id: crypto.randomUUID() })).error).not.toBeNull();
    });

    it("cannot read server-only tables or call the rate limiter", async () => {
      expect((await userA.from("mini_scans").select("id")).error).not.toBeNull();
      expect((await userA.from("ingest_rate_limits").select("hits")).error).not.toBeNull();
      expect((await userA.rpc("ingest_rate_check", { p_client: clientA, p_ip_hash: "x", p_limit: 5 })).error).not.toBeNull();
    });

    it("read their own snapshots but not another client's", async () => {
      const mine = await userA.storage.from("snapshots").download(pathA());
      expect(mine.error).toBeNull();
      expect(JSON.parse(await mine.data!.text())).toEqual({ who: "A" });
      const theirs = await userA.storage.from("snapshots").download(pathB());
      expect(theirs.error).not.toBeNull();
    });
  });

  describe("staff", () => {
    it("see every client, row and snapshot", async () => {
      const { data } = await staff.from("clients").select("id").in("id", [clientA, clientB]);
      expect(data?.map((c) => c.id).sort()).toEqual([clientA, clientB].sort());
      const checks = await staff.from("aio_checks").select("client_id").in("client_id", [clientA, clientB]);
      expect(new Set(checks.data?.map((r) => r.client_id))).toEqual(new Set([clientA, clientB]));
      expect((await staff.storage.from("snapshots").download(pathB())).error).toBeNull();
    });
  });

  describe("users without access", () => {
    it("a signed-in user with no membership sees nothing", async () => {
      const { data } = await outsider.from("clients").select("id").in("id", [clientA, clientB]);
      expect(data).toEqual([]);
      expect((await outsider.from("aio_checks").select("id")).data).toEqual([]);
    });

    it("nobody can sign up with the public key (turn off sign-ups in Supabase Auth settings)", async () => {
      const email = `rls-test-${run}-signup@example.com`;
      const signUp = await anon.auth.signUp({ email, password });
      if (signUp.data.user?.id) userIds.push(signUp.data.user.id); // clean up if it wrongly succeeded
      expect(signUp.error, "signUp must be rejected").not.toBeNull();

      const otp = await anon.auth.signInWithOtp({ email: `rls-test-${run}-otp@example.com`, options: { shouldCreateUser: true } });
      expect(otp.error, "OTP must not create users").not.toBeNull();
    });

    it("anonymous visitors cannot read anything", async () => {
      for (const table of ["clients", "aio_checks", "vitals", "query_sets", "sla_citations"]) {
        const { data, error } = await anon.from(table).select("*");
        expect(error !== null || (data ?? []).length === 0, table).toBe(true);
      }
    });
  });

  describe("data rules", () => {
    it("counts a query once per window, however many days it was cited", async () => {
      const { data } = await userA.from("sla_citations").select("query, first_off_top10, surfaces").eq("client_id", clientA);
      expect(data).toHaveLength(1);
      expect(data![0]).toMatchObject({ query: "q1", first_off_top10: true });
    });

    it("computes the citation rate over the window", async () => {
      const { data } = await userA.from("citation_rate").select("query, checks_with_ai, checks_cited, rate");
      const q1 = data?.find((r) => r.query === "q1");
      const q2 = data?.find((r) => r.query === "q2");
      expect(q1).toMatchObject({ checks_with_ai: 2, checks_cited: 2 });
      expect(Number(q1!.rate)).toBe(1);
      expect(Number(q2!.rate)).toBe(0);
    });

    it("counts one citation even when both surfaces cited the query", async () => {
      ok("ai_mode check", await admin.from("aio_checks").insert({
        client_id: clientA, query: "q1", surface: "ai_mode", checked_on: day(-1), aio_present: true, cited: true,
      }));
      const { data } = await userA.from("sla_citations").select("query, surfaces").eq("client_id", clientA);
      expect(data).toHaveLength(1);
      expect([...data![0].surfaces].sort()).toEqual(["ai_mode", "ai_overview"]);
      await admin.from("aio_checks").delete().eq("client_id", clientA).eq("surface", "ai_mode");
    });

    it("judges off-top10 by the first citation, not a later one", async () => {
      // q2 is first cited inside the top 10, then cited again outside it.
      ok("q2 first", await admin.from("aio_checks").insert({
        client_id: clientA, query: "q2", surface: "ai_overview", checked_on: day(-3), checked_at: `${day(-3)}T14:00:00Z`,
        aio_present: true, cited: true, organic_rank: 4,
      }));
      ok("q2 later", await admin.from("aio_checks").insert({
        client_id: clientA, query: "q2", surface: "ai_overview", checked_on: day(0), checked_at: `${day(0)}T14:00:00Z`,
        aio_present: true, cited: true, organic_rank: null,
      }));
      const { data } = await userA.from("sla_citations").select("first_off_top10").eq("client_id", clientA).eq("query", "q2");
      expect(data).toEqual([{ first_off_top10: false }]);
      await admin.from("aio_checks").delete().eq("client_id", clientA).eq("query", "q2").in("checked_on", [day(-3), day(0)]);
    });

    it("does not call a citation off-top10 when the organic top 10 was unavailable", async () => {
      const res = await admin.from("aio_checks").insert({
        client_id: clientB, query: "q1", surface: "ai_mode", checked_on: day(-1), aio_present: true,
        cited: true, organic_rank: null, organic_checked: false,
      }).select("off_top10").single();
      expect(res.error).toBeNull();
      expect(res.data?.off_top10).toBe(false);
      await admin.from("aio_checks").delete().eq("client_id", clientB).eq("surface", "ai_mode");
    });

    it("rejects a citation without an AI answer", async () => {
      const res = await admin.from("aio_checks").insert({
        client_id: clientA, query: "q2", surface: "ai_mode", checked_on: day(-1), aio_present: false, cited: true,
      });
      expect(res.error?.code).toBe("23514");
    });

    it("keeps checks as append-only evidence", async () => {
      const res = await admin.from("aio_checks").update({ cited: false }).eq("client_id", clientA).eq("query", "q1");
      expect(res.error?.message).toMatch(/append-only/);
    });

    it("rejects overlapping windows for the same client and query", async () => {
      const res = await admin.from("query_sets").insert({
        client_id: clientA, query: "q1", frozen_from: day(5), frozen_until: day(64),
      });
      expect(res.error?.message).toMatch(/overlapping/);
    });

    it("rejects a second check for the same query, surface and day", async () => {
      const dup = await admin.from("aio_checks").insert({
        client_id: clientA, query: "q1", surface: "ai_overview", checked_on: day(-1), aio_present: true,
      });
      expect(dup.error?.code).toBe("23505");
    });

    it("never edits a frozen query list", async () => {
      const res = await admin.from("query_sets").update({ query: "changed" }).eq("client_id", clientA);
      expect(res.error?.message).toMatch(/frozen/);
    });

    it("rate limiter allows up to the limit, then blocks", async () => {
      const call = async () => (await admin.rpc("ingest_rate_check", { p_client: clientA, p_ip_hash: "test", p_limit: 2 })).data;
      expect(await call()).toBe(true);
      expect(await call()).toBe(true);
      expect(await call()).toBe(false);
    });
  });
});
