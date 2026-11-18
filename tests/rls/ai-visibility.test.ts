// The AI visibility job (fixture source) against the development project, on temporary clients.
// Needs the Phase 8 migration (ai_mentions, ai_mention_runs). Skipped without Supabase keys, and skipped with a note
// until the migration is applied.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runAiVisibility } from "../../jobs/ai-visibility/run.ts";
import { FixtureSource } from "../../jobs/ai-visibility/source.ts";
import { createSupabaseAiVisibilityStore } from "../../jobs/ai-visibility/store.ts";
import { listQueryIdeas } from "@/lib/admin/ops";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const fast = { retryWaitMs: 0, sleep: async () => {}, limit: 40, maxCostUsd: 5 };

async function migrationApplied(): Promise<boolean> {
  if (!hasEnv) return false;
  const admin = createClient(url!, secretKey!, opts);
  const { error } = await admin.from("ai_mention_runs").select("id").limit(1);
  return !error;
}
const applied = await migrationApplied();
if (hasEnv && !applied) console.warn("[ai-visibility rls test] skipped: apply supabase/migrations/20261123100000_ai_visibility.sql first");

describe.skipIf(!applied)("AI visibility against Supabase (dry-run, sandbox client)", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const password = `Pw-${crypto.randomUUID()}`;
  let admin: SupabaseClient;
  let member: SupabaseClient;
  let outsider: SupabaseClient;
  let sandbox = "";
  let real = "";
  const userIds: string[] = [];
  const clientIds: string[] = [];

  async function userClient(email: string, clientId?: string) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userIds.push(created.data.user.id);
    if (clientId) await admin.from("client_members").insert({ client_id: clientId, user_id: created.data.user.id });
    const c = createClient(url!, publishableKey!, opts);
    const s = await c.auth.signInWithPassword({ email, password });
    if (s.error) throw s.error;
    return c;
  }

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    const mk = async (kind: string) => {
      const { data, error } = await admin.from("clients").insert({ name: `rls-test aivis ${kind} ${run}`, domain: `aivis-${kind}-${run}.test`, kind }).select("id").single();
      if (error) throw error;
      clientIds.push(data.id);
      return data.id as string;
    };
    sandbox = await mk("sandbox");
    real = await mk("real");
    member = await userClient(`rls-test-${run}-aivis-a@example.com`, sandbox);
    outsider = await userClient(`rls-test-${run}-aivis-b@example.com`);
  });

  afterAll(async () => {
    if (!admin) return;
    if (clientIds.length) {
      const paths = await admin.from("ai_mention_runs").select("snapshot_path").in("client_id", clientIds);
      if (paths.data?.length) await admin.storage.from("snapshots").remove(paths.data.map((p) => p.snapshot_path as string));
      await admin.from("clients").delete().in("id", clientIds); // cascades to runs and mentions
    }
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  });

  it("stores both platforms with their rows and raw evidence, and is idempotent", async () => {
    const store = createSupabaseAiVisibilityStore(admin, { onlyClientId: sandbox });
    const first = await runAiVisibility(store, new FixtureSource(), { live: false, ...fast });
    expect(first).toMatchObject({ targets: 1, calls: 2, failed: 0, rows: 80 });

    const runs = await admin.from("ai_mention_runs").select("platform, total_count, rows_stored, snapshot_path").eq("client_id", sandbox).order("platform");
    expect(runs.data!.map((r) => [r.platform, r.total_count, r.rows_stored])).toEqual([["chat_gpt", 122, 40], ["google", 1543, 40]]);
    const file = await admin.storage.from("snapshots").download(runs.data![0].snapshot_path as string);
    expect(file.error).toBeNull();
    expect(JSON.parse(await file.data!.text()).total_count).toBeGreaterThan(0);

    const again = await runAiVisibility(store, new FixtureSource(), { live: false, ...fast });
    expect(again).toMatchObject({ calls: 0, skipped: 2 });
    const count = await admin.from("ai_mentions").select("id", { count: "exact", head: true }).eq("client_id", sandbox);
    expect(count.count).toBe(80);
  });

  it("dry-run reads only sandbox clients and live reads only real ones", async () => {
    const store = createSupabaseAiVisibilityStore(admin);
    expect((await store.targets(false)).some((t) => t.clientId === sandbox)).toBe(true);
    expect((await store.targets(false)).some((t) => t.clientId === real)).toBe(false);
    expect((await store.targets(true)).some((t) => t.clientId === real)).toBe(true);
    expect((await store.targets(true)).some((t) => t.clientId === sandbox)).toBe(false);
  });

  it("the client's users read their rows, but never the cost, and cannot write", async () => {
    const rows = await member.from("ai_mentions").select("question, relation, platform").eq("client_id", sandbox);
    expect(rows.data).toHaveLength(80);
    const runs = await member.from("ai_mention_runs").select("platform, total_count").eq("client_id", sandbox);
    expect(runs.data).toHaveLength(2);
    expect((await member.from("ai_mention_runs").select("cost_usd").eq("client_id", sandbox)).error).not.toBeNull();
    expect((await member.from("ai_mentions").insert({ client_id: sandbox, platform: "google", captured_on: "2026-01-01", question: "x", relation: "cited" })).error).not.toBeNull();
    expect((await member.from("ai_mentions").delete().eq("client_id", sandbox)).error ?? null).toBeNull(); // no policy: deletes nothing
    expect((await admin.from("ai_mentions").select("id", { count: "exact", head: true }).eq("client_id", sandbox)).count).toBe(80);
  });

  it("another client's users and visitors see nothing", async () => {
    expect((await outsider.from("ai_mentions").select("id").eq("client_id", sandbox)).data).toEqual([]);
    expect((await outsider.from("ai_mention_runs").select("id").eq("client_id", sandbox)).data).toEqual([]);
    const anon = createClient(url!, publishableKey!, opts);
    expect((await anon.from("ai_mentions").select("id")).error).not.toBeNull();
  });

  it("rejects a bad relation or platform", async () => {
    const bad = await admin.from("ai_mentions").insert({ client_id: sandbox, platform: "google", captured_on: "2026-01-01", question: "x", relation: "maybe" });
    expect(bad.error).not.toBeNull();
    const bad2 = await admin.from("ai_mention_runs").insert({ client_id: sandbox, platform: "bing", captured_on: "2026-01-01", total_count: 1, rows_stored: 1, snapshot_path: "x" });
    expect(bad2.error).not.toBeNull();
  });

  it("Admin query ideas: Google-cited questions only, minus what is frozen", async () => {
    const all = await listQueryIdeas(admin, sandbox, []);
    expect(all.ideas).toHaveLength(25);
    expect(all.ideas[0]).toMatchObject({ query: "gifts for a book lover", volume: 27100 });
    const some = await listQueryIdeas(admin, sandbox, ["Gifts for a book lover"]);
    expect(some.ideas[0].query).toBe("gifts for booklovers");
    expect((await listQueryIdeas(admin, real, [])).ideas).toEqual([]); // no read yet
  });
});
