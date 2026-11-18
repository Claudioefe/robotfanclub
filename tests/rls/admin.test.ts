// The Admin operations against the development project, on a temporary client. They run with the secret key, exactly as
// the server actions do after checking the caller is staff. Skipped without Supabase keys.
// The Costs test needs the Phase 7 migration (cost_by_client_day).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  addCruxTargetOp,
  createClientOp,
  freezeQueriesOp,
  getCosts,
  grantMemberOp,
  isStaffClient,
  listCruxTargets,
  listMembers,
  listTagScripts,
  listWindows,
  removeCruxTargetOp,
  removeMemberOp,
  removeTagScriptOp,
  saveTagScriptOp,
  setSprintOp,
} from "@/lib/admin/ops";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

describe.skipIf(!hasEnv)("admin operations", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const password = `Pw-${crypto.randomUUID()}`;
  let admin: SupabaseClient;
  let clientId = "";
  const userIds: string[] = [];
  const clientIds: string[] = [];

  async function userClient(email: string, makeStaff = false) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userIds.push(created.data.user.id);
    if (makeStaff) await admin.from("staff").insert({ user_id: created.data.user.id });
    const sb = createClient(url!, publishableKey!, opts);
    const signIn = await sb.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    return { sb, id: created.data.user.id };
  }

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    const r = await createClientOp(admin, { name: `rls-test admin ${run}`, domain: `admin-${run}.test`, kind: "demo", feeUsd: "1000" });
    if (!r.ok) throw new Error(r.error);
    clientId = r.data!.id;
    clientIds.push(clientId);
  });

  afterAll(async () => {
    if (!admin) return;
    if (clientIds.length) await admin.from("clients").delete().in("id", clientIds);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  });

  describe("who counts as staff", () => {
    it("is true only for a staff user; client users and anonymous visitors are refused", async () => {
      const staff = await userClient(`rls-test-${run}-staff@example.com`, true);
      const member = await userClient(`rls-test-${run}-member@example.com`);
      expect(await isStaffClient(staff.sb)).toBe(true);
      expect(await isStaffClient(member.sb)).toBe(false);
      expect(await isStaffClient(createClient(url!, publishableKey!, opts))).toBe(false);
    });
  });

  describe("clients", () => {
    it("created the temporary client with the chosen kind", async () => {
      const { data } = await admin.from("clients").select("kind, domain, service_fee_usd").eq("id", clientId).single();
      expect(data).toMatchObject({ kind: "demo", domain: `admin-${run}.test` });
      expect(Number(data!.service_fee_usd)).toBe(1000);
    });

    it("refuses a duplicate domain, a missing kind and bad input", async () => {
      expect((await createClientOp(admin, { name: "Dup", domain: `admin-${run}.test`, kind: "demo", feeUsd: "" })).ok).toBe(false);
      expect((await createClientOp(admin, { name: "No kind", domain: `nokind-${run}.test`, kind: "", feeUsd: "" })).ok).toBe(false);
      expect((await createClientOp(admin, { name: "", domain: "x.test", kind: "demo", feeUsd: "" })).ok).toBe(false);
      const none = await admin.from("clients").select("id").eq("domain", `nokind-${run}.test`);
      expect(none.data).toEqual([]);
    });
  });

  describe("frozen query lists", () => {
    it("freezes a list into a 60-day window starting today", async () => {
      const r = await freezeQueriesOp(admin, clientId, "soc 2 cost\nSOC 2  cost\nhow long does soc 2 take\n");
      expect(r).toMatchObject({ ok: true, data: { from: day(0), until: day(59), count: 2 } });
      expect(r.ok && r.message).toContain("1 duplicate(s) removed");
      const w = await listWindows(admin, clientId);
      expect(w).toHaveLength(1);
      expect(w[0].queries).toEqual(["soc 2 cost", "how long does soc 2 take"]);
    });

    it("a frozen row can never be edited", async () => {
      const res = await admin.from("query_sets").update({ query: "changed" }).eq("client_id", clientId);
      expect(res.error?.message).toMatch(/frozen/);
    });

    it("a new list while a window is running starts the day after it ends, so windows never overlap", async () => {
      const r = await freezeQueriesOp(admin, clientId, "iso 27001 cost");
      expect(r).toMatchObject({ ok: true, data: { from: day(60), until: day(119) } });
      expect(r.ok && r.message).toContain("starts on");
      expect(await listWindows(admin, clientId)).toHaveLength(2);
    });

    it("refuses more than 60 queries and empty lists without writing anything", async () => {
      const before = (await listWindows(admin, clientId)).length;
      const sixtyOne = Array.from({ length: 61 }, (_, i) => `query ${i}`).join("\n");
      expect((await freezeQueriesOp(admin, clientId, sixtyOne)).ok).toBe(false);
      expect((await freezeQueriesOp(admin, clientId, "   ")).ok).toBe(false);
      expect((await freezeQueriesOp(admin, "00000000-0000-4000-8000-0000000000ee", "x")).ok).toBe(false);
      expect(await listWindows(admin, clientId)).toHaveLength(before);
    });
  });

  describe("CrUX targets", () => {
    it("adds, rejects duplicates and removes, keeping the origin exact", async () => {
      expect(await addCruxTargetOp(admin, clientId, { scope: "origin", target: "https://www.example-admin.test/some/path" })).toMatchObject({ ok: true });
      expect((await addCruxTargetOp(admin, clientId, { scope: "origin", target: "https://www.example-admin.test" })).ok).toBe(false); // same origin
      expect((await addCruxTargetOp(admin, clientId, { scope: "url", target: "not a url" })).ok).toBe(false);
      const list = await listCruxTargets(admin, clientId);
      expect(list).toEqual([expect.objectContaining({ scope: "origin", target: "https://www.example-admin.test" })]);
      expect(await removeCruxTargetOp(admin, clientId, list[0].id)).toMatchObject({ ok: true });
      expect(await listCruxTargets(admin, clientId)).toEqual([]);
    });
  });

  describe("sprint details", () => {
    it("saves and clears the deploy date and baseline", async () => {
      expect(await setSprintOp(admin, clientId, { deployedOn: "2026-10-26", baselineMs: "296" })).toMatchObject({ ok: true });
      const a = await admin.from("clients").select("inp_sprint_deployed_on, inp_baseline_ms").eq("id", clientId).single();
      expect(a.data).toEqual({ inp_sprint_deployed_on: "2026-10-26", inp_baseline_ms: 296 });
      expect((await setSprintOp(admin, clientId, { deployedOn: "yesterday", baselineMs: "" })).ok).toBe(false);
      expect(await setSprintOp(admin, clientId, { deployedOn: "", baselineMs: "" })).toMatchObject({ ok: true });
      const b = await admin.from("clients").select("inp_sprint_deployed_on, inp_baseline_ms").eq("id", clientId).single();
      expect(b.data).toEqual({ inp_sprint_deployed_on: null, inp_baseline_ms: null });
    });
  });

  describe("Tag Bouncer scripts", () => {
    const chat = { label: "Live chat widget", scriptUrl: "https://chat.example.com/widget.js", blockingMs: "62", action: "keep", isRequired: false };

    it("adds, updates the action, refuses duplicates and removes", async () => {
      expect(await saveTagScriptOp(admin, clientId, null, chat)).toMatchObject({ ok: true });
      expect((await saveTagScriptOp(admin, clientId, null, chat)).ok).toBe(false); // same URL
      const [script] = await listTagScripts(admin, clientId);
      expect(script).toMatchObject({ label: "Live chat widget", blockingMs: 62, action: "keep" });
      expect(await saveTagScriptOp(admin, clientId, script.id, { ...chat, action: "load_on_first_interaction" })).toMatchObject({ ok: true });
      expect((await listTagScripts(admin, clientId))[0].action).toBe("load_on_first_interaction");
      expect(await removeTagScriptOp(admin, clientId, script.id)).toMatchObject({ ok: true });
      expect(await listTagScripts(admin, clientId)).toEqual([]);
    });

    it("a required script is carved out of the SLA and cannot be removed", async () => {
      const cmp = { label: "Consent banner", scriptUrl: "https://consent.example.com/cmp.js", blockingMs: "29", action: "keep", isRequired: true };
      expect(await saveTagScriptOp(admin, clientId, null, cmp)).toMatchObject({ ok: true });
      const { data } = await admin.from("tag_bouncer_scripts").select("id, excluded_from_sla").eq("client_id", clientId).single();
      expect(data!.excluded_from_sla).toBe(true);
      expect((await saveTagScriptOp(admin, clientId, data!.id as number, { ...cmp, action: "remove" })).ok).toBe(false);
    });
  });

  describe("access", () => {
    const email = () => `rls-test-${run}-invited@example.com`;

    it("creates the account without sending anything, and the person then sees only that client", async () => {
      const r = await grantMemberOp(admin, clientId, email().toUpperCase());
      expect(r).toMatchObject({ ok: true });
      expect(await grantMemberOp(admin, clientId, email())).toMatchObject({ ok: true }); // idempotent
      const members = await listMembers(admin, clientId);
      expect(members.map((m) => m.email)).toEqual([email()]);
      userIds.push(members[0].userId);

      // Give the new account a password only for this test, to act as that user
      await admin.auth.admin.updateUserById(members[0].userId, { password });
      const sb = createClient(url!, publishableKey!, opts);
      expect((await sb.auth.signInWithPassword({ email: email(), password })).error).toBeNull();
      const seen = await sb.from("clients").select("id").in("id", clientIds);
      expect(seen.data?.map((c) => c.id)).toEqual([clientId]);
      expect(await isStaffClient(sb)).toBe(false);
    });

    it("removing access hides the client again but keeps the account", async () => {
      const [m] = await listMembers(admin, clientId);
      expect(await removeMemberOp(admin, clientId, m.userId)).toMatchObject({ ok: true });
      const sb = createClient(url!, publishableKey!, opts);
      await sb.auth.signInWithPassword({ email: email(), password });
      expect((await sb.from("clients").select("id").eq("id", clientId)).data).toEqual([]);
      expect((await admin.auth.admin.getUserById(m.userId)).data.user).not.toBeNull();
    });

    it("rejects bad emails and unknown clients", async () => {
      expect((await grantMemberOp(admin, clientId, "nope")).ok).toBe(false);
      expect((await grantMemberOp(admin, "00000000-0000-4000-8000-0000000000ee", "someone@example.com")).ok).toBe(false);
    });
  });

  describe("costs", () => {
    it("adds up the API spend per client and day", async () => {
      await admin.from("query_sets").select("id").eq("client_id", clientId).limit(1); // window exists
      const rows = [
        { client_id: clientId, query: "soc 2 cost", surface: "ai_overview", aio_present: true, cost_usd: 0.002 },
        { client_id: clientId, query: "soc 2 cost", surface: "ai_mode", aio_present: true, cost_usd: 0.004 },
      ];
      const ins = await admin.from("aio_checks").insert(rows);
      expect(ins.error).toBeNull();
      const r = await getCosts(admin, 30);
      expect(r.ok, r.ok ? "" : r.error).toBe(true);
      if (!r.ok) return;
      const mine = r.data!.byClient.find((c) => c.clientId === clientId);
      expect(mine).toMatchObject({ checks: 2 });
      expect(mine!.cost).toBeCloseTo(0.006, 5);
      expect(r.data!.byDay.find((d) => d.day === day(0))!.cost).toBeGreaterThanOrEqual(0.006);
    });

    it("users cannot read the cost view", async () => {
      const member = await userClient(`rls-test-${run}-costs@example.com`);
      expect((await member.sb.from("cost_by_client_day").select("cost_usd")).error).not.toBeNull();
    });
  });
});
