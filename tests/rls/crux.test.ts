// The CrUX job (fixture source) against the development project, on a temporary sandbox client.
// Needs the Phase 5 migration (crux_targets). Skipped without Supabase keys.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runCrux } from "../../jobs/crux/run.ts";
import { FixtureSource } from "../../jobs/crux/source.ts";
import { createSupabaseCruxStore } from "../../jobs/crux/store.ts";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const fast = { retryWaitMs: 0, pauseMs: 0, sleep: async () => {} };

describe.skipIf(!hasEnv)("CrUX job against Supabase (dry-run, sandbox client)", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const password = `Pw-${crypto.randomUUID()}`;
  let admin: SupabaseClient;
  let member: SupabaseClient;
  let sandbox = "";
  let demo = "";
  let userId = "";
  const clientIds: string[] = []; // every client id, recorded as soon as it exists so cleanup works even if setup fails midway

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    const mk = async (kind: string) => {
      const { data, error } = await admin.from("clients").insert({ name: `rls-test crux ${kind} ${run}`, domain: `crux-${kind}-${run}.test`, kind }).select("id").single();
      if (error) throw error;
      clientIds.push(data.id);
      const t = await admin.from("crux_targets").insert({ client_id: data.id, scope: "origin", target: `https://www.crux-${kind}-${run}.test` });
      if (t.error) throw t.error;
      return data.id as string;
    };
    sandbox = await mk("sandbox");
    demo = await mk("demo");

    const email = `rls-test-${run}-crux@example.com`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    await admin.from("client_members").insert({ client_id: sandbox, user_id: userId });
    member = createClient(url!, publishableKey!, opts);
    const signIn = await member.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
  });

  afterAll(async () => {
    if (!admin) return;
    if (clientIds.length) await admin.from("clients").delete().in("id", clientIds); // cascades to targets and history
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("stores the current window and the weekly history, idempotently", async () => {
    const store = createSupabaseCruxStore(admin, { onlyClientId: sandbox });
    const daily = await runCrux(store, new FixtureSource(), { mode: "daily", live: false, ...fast });
    expect(daily).toMatchObject({ targets: 1, withData: 1, rowsWritten: 1 });
    const backfill = await runCrux(store, new FixtureSource(), { mode: "backfill", live: false, ...fast });
    expect(backfill.rowsWritten).toBe(4);
    const again = await runCrux(store, new FixtureSource(), { mode: "backfill", live: false, ...fast });
    expect(again.rowsWritten).toBe(0);

    const { data } = await admin.from("crux_history").select("period_end, inp_p75_ms, form_factor").eq("client_id", sandbox).order("period_end");
    expect(data).toHaveLength(5);
    expect(data!.every((r) => r.form_factor === "PHONE")).toBe(true);
  });

  it("dry-run reads only sandbox clients and live never reads sandbox ones", async () => {
    const dry = await createSupabaseCruxStore(admin).targets(false);
    expect(dry.some((t) => t.clientId === sandbox)).toBe(true);
    expect(dry.some((t) => t.clientId === demo)).toBe(false);
    const live = await createSupabaseCruxStore(admin).targets(true);
    expect(live.some((t) => t.clientId === demo)).toBe(true);
    expect(live.some((t) => t.clientId === sandbox)).toBe(false);
  });

  it("the client's users can read their history but not the target list", async () => {
    const history = await member.from("crux_history").select("target, inp_p75_ms").eq("client_id", sandbox);
    expect(history.error).toBeNull();
    expect(history.data!.length).toBe(5);
    expect((await member.from("crux_targets").select("target")).error).not.toBeNull();
  });
});
