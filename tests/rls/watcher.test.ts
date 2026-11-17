// Runs the real watcher code (fixture source) against the development project, on a temporary sandbox client.
// Needs the Phase 3 migration (clients.kind, watcher_runs). Skipped without Supabase keys.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FixtureSource } from "../../jobs/watcher/dataforseo.ts";
import { runWatcher } from "../../jobs/watcher/run.ts";
import { createSupabaseStore } from "../../jobs/watcher/store.ts";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

describe.skipIf(!hasEnv)("watcher against Supabase (dry-run, sandbox client)", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const password = `Pw-${crypto.randomUUID()}`;
  let admin: SupabaseClient;
  let sandbox = "";
  let real = "";
  let userId = "";
  let member: SupabaseClient;
  const queries = ["soc 2 type 1 vs type 2", "how long does soc 2 take"];
  const testStart = new Date().toISOString();

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    const mk = async (kind: string) => {
      const { data, error } = await admin.from("clients").insert({ name: `rls-test ${kind} ${run}`, domain: `northwindsec.com`, kind }).select("id").single();
      if (error) throw error;
      await admin.from("query_sets").insert(queries.map((query) => ({ client_id: data.id, query, frozen_from: day(0), frozen_until: day(59) })));
      return data.id as string;
    };
    sandbox = await mk("sandbox");
    real = await mk("real");

    const created = await admin.auth.admin.createUser({ email: `rls-test-${run}-w@example.com`, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    await admin.from("client_members").insert({ client_id: sandbox, user_id: userId });
    member = createClient(url!, publishableKey!, opts);
    const signIn = await member.auth.signInWithPassword({ email: `rls-test-${run}-w@example.com`, password });
    if (signIn.error) throw signIn.error;
  });

  afterAll(async () => {
    if (!admin) return;
    const { data: files } = await admin.storage.from("snapshots").list(`${sandbox}/${day(0)}/ai_overview`);
    const { data: files2 } = await admin.storage.from("snapshots").list(`${sandbox}/${day(0)}/ai_mode`);
    await admin.storage.from("snapshots").remove([
      ...(files ?? []).map((f) => `${sandbox}/${day(0)}/ai_overview/${f.name}`),
      ...(files2 ?? []).map((f) => `${sandbox}/${day(0)}/ai_mode/${f.name}`),
    ]);
    await admin.from("watcher_runs").delete().eq("mode", "dry_run").gte("started_at", testStart); // only this test's runs
    await admin.from("clients").delete().in("id", [sandbox, real].filter(Boolean));
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("writes checks and snapshots for the sandbox client only, and records the run", async () => {
    const store = createSupabaseStore(admin, { onlyClientId: sandbox });
    const s = await runWatcher(store, new FixtureSource(), { mode: "dry_run", retryWaitMs: 0 });
    expect(s).toMatchObject({ checksWritten: 4, queriesOk: 2, queriesFailed: 0 });

    const { data: checks } = await admin.from("aio_checks").select("client_id, surface, cited, cost_usd, snapshot_path, organic_checked").eq("client_id", sandbox);
    expect(checks).toHaveLength(4);
    expect(checks!.every((c) => c.cited && c.organic_checked && c.snapshot_path)).toBe(true);
    expect(Number(checks!.find((c) => c.surface === "ai_mode")!.cost_usd)).toBe(0.004);

    // No check was written for the "real" client: dry-run never touches it
    const other = await admin.from("aio_checks").select("id").eq("client_id", real);
    expect(other.data).toEqual([]);

    const runs = await admin.from("watcher_runs").select("mode, checks_written, queries_ok, cost_usd, finished_at").gte("started_at", testStart).order("id", { ascending: false }).limit(1).single();
    expect(runs.data).toMatchObject({ mode: "dry_run", checks_written: 4, queries_ok: 2 });
    expect(runs.data!.finished_at).not.toBeNull();
  });

  it("the checks show up for the client member through RLS, with evidence they can open", async () => {
    const { data } = await member.from("sla_citations").select("query, surfaces").eq("client_id", sandbox);
    expect(data).toHaveLength(2);
    const first = await member.from("citation_first_checks").select("snapshot_path").eq("client_id", sandbox).limit(1).single();
    const file = await member.storage.from("snapshots").download(first.data!.snapshot_path as string);
    expect(file.error).toBeNull();
    expect(JSON.parse(await file.data!.text()).keyword).toBe("soc 2 type 1 vs type 2");
  });

  it("is idempotent on a second run: nothing new, nothing overwritten", async () => {
    const store = createSupabaseStore(admin, { onlyClientId: sandbox });
    const s = await runWatcher(store, new FixtureSource(), { mode: "dry_run", retryWaitMs: 0 });
    expect(s).toMatchObject({ checksWritten: 0, queriesSkipped: 2 });
    const { data } = await admin.from("aio_checks").select("id").eq("client_id", sandbox);
    expect(data).toHaveLength(4);
  });

  it("the CLI-level store never lists demo clients as targets", async () => {
    const store = createSupabaseStore(admin);
    const sandboxes = await store.targets("sandbox", day(0));
    const reals = await store.targets("real", day(0));
    // The seeded Northwind demo has kind "demo" and must appear in neither list
    expect([...sandboxes, ...reals].some((t) => t.clientId === "00000000-0000-4000-8000-000000000001")).toBe(false);
  });
});
