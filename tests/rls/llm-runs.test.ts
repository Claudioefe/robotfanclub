// ChatGPT runs (D-048) against the development project: what users can read, what they cannot (cost, other clients' rows,
// writes), and the loader's parser output stored as rows. Needs the migration 20261124100000_llm_runs.sql: skipped, with a
// note, until it is applied. Uses temporary clients only.

import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseRun } from "../../jobs/chatgpt/parse.ts";
import { getLlmRuns } from "../../src/lib/data/read.ts";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && publishableKey && secretKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

async function migrationApplied(): Promise<boolean> {
  if (!hasEnv) return false;
  const { error } = await createClient(url!, secretKey!, opts).from("llm_runs").select("id").limit(1);
  return !error;
}
const applied = await migrationApplied();
if (hasEnv && !applied) console.warn("[llm-runs rls test] skipped: apply supabase/migrations/20261124100000_llm_runs.sql first");

describe.skipIf(!applied)("ChatGPT runs against Supabase", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const password = `Pw-${crypto.randomUUID()}`;
  let admin: SupabaseClient;
  let member: SupabaseClient;
  let outsider: SupabaseClient;
  let clientId = "";
  const userIds: string[] = [];
  const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/real/${name}`, import.meta.url), "utf8")).tasks[0];

  async function userClient(email: string, withClient?: string) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userIds.push(created.data.user.id);
    if (withClient) await admin.from("client_members").insert({ client_id: withClient, user_id: created.data.user.id });
    const c = createClient(url!, publishableKey!, opts);
    const s = await c.auth.signInWithPassword({ email, password });
    if (s.error) throw s.error;
    return c;
  }

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    const { data, error } = await admin.from("clients").insert({ name: `rls-test llm ${run}`, domain: "baumanrarebooks.com", kind: "sandbox" }).select("id").single();
    if (error) throw error;
    clientId = data.id;
    member = await userClient(`rls-test-${run}-llm-a@example.com`, clientId);
    outsider = await userClient(`rls-test-${run}-llm-b@example.com`);

    for (const [i, name] of ["dfs-chatgpt-scraper-q15-where-to-sell-first-edition-books-real.json", "dfs-chatgpt-scraper-children-run1-real.json", "dfs-chatgpt-scraper-q15-books-worth-money-real.json"].entries()) {
      const r = parseRun(fixture(name), "baumanrarebooks.com");
      const ins = await admin.from("llm_runs").insert({
        client_id: clientId, platform: "chat_gpt", query: r.query, run_at: r.runAt, run_on: r.runOn, relation: r.relation,
        source_count: r.sourceCount, client_source_rank: r.clientSourceRank, client_url: r.clientUrl, other_domains: r.otherDomains,
        consulted_count: r.consultedCount, snapshot_path: `${clientId}/test/${i}.json`, cost_usd: r.costUsd,
      });
      if (ins.error) throw ins.error;
    }
  });

  afterAll(async () => {
    if (!admin) return;
    if (clientId) await admin.from("clients").delete().eq("id", clientId); // cascades to the runs
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  });

  it("a member reads their client's runs through the data core, shaped for the page", async () => {
    const data = await getLlmRuns(member, clientId, ["where to sell first edition books", "most valuable children's books", "books worth money", "never run"]);
    expect(data!.totals).toMatchObject({ frozenQueries: 4, measuredQueries: 3, queriesCited: 1, queriesConsultedOnly: 1, runs: 3, runsCited: 1, runsConsulted: 1 });
    const cited = data!.rows.find((r) => r.query === "where to sell first edition books")!;
    expect(cited.runs[0]).toMatchObject({ relation: "cited", clientSourceRank: 2, sourceCount: 9 });
  });

  it("another user sees nothing of this client's runs", async () => {
    const { data, error } = await outsider.from("llm_runs").select("id").eq("client_id", clientId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("users cannot read the cost, and the Admin cost view stays closed to them", async () => {
    expect((await member.from("llm_runs").select("cost_usd")).error).not.toBeNull();
    expect((await member.from("cost_by_client_day").select("cost_usd")).error).not.toBeNull();
  });

  it("the Admin cost view (server only) now counts the ChatGPT runs", async () => {
    const { data } = await admin.from("cost_by_client_day").select("checks, cost_usd").eq("client_id", clientId);
    expect(data!.reduce((n, r) => n + Number(r.checks), 0)).toBe(3);
    expect(data!.reduce((n, r) => n + Number(r.cost_usd), 0)).toBeCloseTo(0.012, 5);
  });

  it("users cannot write runs, and one file backs one run only", async () => {
    const row = { client_id: clientId, platform: "chat_gpt", query: "x", run_at: new Date().toISOString(), run_on: "2026-11-20", relation: "none", snapshot_path: `${clientId}/test/x.json` };
    expect((await member.from("llm_runs").insert(row)).error).not.toBeNull();
    expect((await admin.from("llm_runs").insert(row)).error).toBeNull();
    expect((await admin.from("llm_runs").insert(row)).error).not.toBeNull(); // unique (client_id, snapshot_path)
  });

  it("rejects a relation or platform outside the allowed values", async () => {
    const base = { client_id: clientId, query: "y", run_at: new Date().toISOString(), run_on: "2026-11-20", snapshot_path: `${clientId}/test/y.json` };
    expect((await admin.from("llm_runs").insert({ ...base, platform: "chat_gpt", relation: "maybe" })).error).not.toBeNull();
    expect((await admin.from("llm_runs").insert({ ...base, platform: "claude", relation: "none" })).error).not.toBeNull();
  });
});
