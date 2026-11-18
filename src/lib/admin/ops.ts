// Operations of the staff Admin. They take a Supabase client as a parameter and import nothing from Next.js, so they
// can be tested against the real database. The server actions (src/app/admin/actions.ts) are thin wrappers that first
// check the caller is staff, then call these with the secret-key client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayUtc } from "../sla.ts";
import {
  isEmail,
  nextWindowStart,
  parseClient,
  parseCruxTarget,
  parseQueryList,
  parseSprint,
  parseTagScript,
  windowFrom,
  type ClientKind,
} from "./validate.ts";

export type OpResult<T = undefined> = { ok: true; message: string; data?: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const done = <T = undefined>(message: string, data?: T): OpResult<T> => ({ ok: true, message, data });

/**
 * True if the signed-in user is staff. Takes the client that acts AS THE USER (publishable key + session): RLS lets a
 * user read only their own row in `staff`, so a row coming back means "this user is staff". Never pass the secret key here.
 */
export async function isStaffClient(userClient: SupabaseClient): Promise<boolean> {
  const { data: auth } = await userClient.auth.getUser();
  if (!auth.user) return false;
  const { data } = await userClient.from("staff").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  return Boolean(data);
}

// Clients --------------------------------------------------------------------

export async function createClientOp(sb: SupabaseClient, raw: { name: string; domain: string; kind: string; feeUsd: string }): Promise<OpResult<{ id: string }>> {
  const p = parseClient(raw);
  if (!p.ok) return fail(p.error);
  const existing = await sb.from("clients").select("id").eq("domain", p.value.domain).maybeSingle();
  if (existing.error) return fail(existing.error.message);
  if (existing.data) return fail(`A client with the domain ${p.value.domain} already exists.`);
  const { data, error } = await sb
    .from("clients")
    .insert({ name: p.value.name, domain: p.value.domain, kind: p.value.kind, service_fee_usd: p.value.feeUsd })
    .select("id")
    .single();
  if (error) return fail(error.message);
  return done(`Created ${p.value.name} (${p.value.kind}).`, { id: data.id as string });
}

export interface AdminClientRow {
  id: string;
  name: string;
  domain: string;
  kind: ClientKind;
  serviceFeeUsd: number | null;
  inpSprintDeployedOn: string | null;
  inpBaselineMs: number | null;
}

const CLIENT_COLUMNS = "id, name, domain, kind, service_fee_usd, inp_sprint_deployed_on, inp_baseline_ms";
const toClient = (r: Record<string, unknown>): AdminClientRow => ({
  id: r.id as string,
  name: r.name as string,
  domain: r.domain as string,
  kind: r.kind as ClientKind,
  serviceFeeUsd: (r.service_fee_usd as number | null) ?? null,
  inpSprintDeployedOn: (r.inp_sprint_deployed_on as string | null) ?? null,
  inpBaselineMs: (r.inp_baseline_ms as number | null) ?? null,
});

export async function listClientsAdmin(sb: SupabaseClient): Promise<AdminClientRow[]> {
  const { data } = await sb.from("clients").select(CLIENT_COLUMNS).order("name");
  return (data ?? []).map(toClient);
}

export async function getClientAdmin(sb: SupabaseClient, id: string): Promise<AdminClientRow | null> {
  const { data } = await sb.from("clients").select(CLIENT_COLUMNS).eq("id", id).maybeSingle();
  return data ? toClient(data) : null;
}

// Query windows -------------------------------------------------------------------

export interface WindowSummary {
  from: string;
  until: string;
  queries: string[];
}

export async function listWindows(sb: SupabaseClient, clientId: string): Promise<WindowSummary[]> {
  const { data } = await sb.from("query_sets").select("query, frozen_from, frozen_until").eq("client_id", clientId).order("id");
  const byFrom = new Map<string, WindowSummary>();
  for (const r of data ?? []) {
    const w = byFrom.get(r.frozen_from as string) ?? { from: r.frozen_from as string, until: r.frozen_until as string, queries: [] };
    w.queries.push(r.query as string);
    byFrom.set(w.from, w);
  }
  return [...byFrom.values()].sort((a, b) => b.from.localeCompare(a.from));
}

/**
 * Freezes a list of up to 60 queries into a new 60-day window. A frozen list is never edited (the database blocks
 * updates): to change it, a new window is created, starting the day after the running one ends so they never overlap.
 */
export async function freezeQueriesOp(sb: SupabaseClient, clientId: string, text: string, today: string = todayUtc()): Promise<OpResult<{ from: string; until: string; count: number }>> {
  const list = parseQueryList(text);
  if (!list.ok) return fail(list.error);
  const client = await getClientAdmin(sb, clientId);
  if (!client) return fail("Client not found.");

  const windows = await listWindows(sb, clientId);
  const start = nextWindowStart(today, windows.map((w) => w.until));
  const w = windowFrom(start);

  const { error } = await sb.from("query_sets").insert(list.value.queries.map((query) => ({ client_id: clientId, query, frozen_from: w.from, frozen_until: w.until })));
  if (error) {
    if (/overlapping/i.test(error.message)) return fail("These queries overlap a window that already exists for this client.");
    return fail(error.message);
  }
  const notes = [
    `Frozen ${list.value.queries.length} queries from ${w.from} to ${w.until}.`,
    start > today ? `A window is still running, so this one starts on ${start}.` : "",
    list.value.duplicatesRemoved ? `${list.value.duplicatesRemoved} duplicate(s) removed.` : "",
  ].filter(Boolean);
  return done(notes.join(" "), { from: w.from, until: w.until, count: list.value.queries.length });
}

// CrUX targets ------------------------------------------------------------------

export interface CruxTargetRow {
  id: number;
  scope: "origin" | "url";
  target: string;
}

export async function listCruxTargets(sb: SupabaseClient, clientId: string): Promise<CruxTargetRow[]> {
  const { data } = await sb.from("crux_targets").select("id, scope, target").eq("client_id", clientId).order("id");
  return (data ?? []) as CruxTargetRow[];
}

export async function addCruxTargetOp(sb: SupabaseClient, clientId: string, raw: { scope: string; target: string }): Promise<OpResult> {
  const p = parseCruxTarget(raw.scope, raw.target);
  if (!p.ok) return fail(p.error);
  const { error } = await sb.from("crux_targets").insert({ client_id: clientId, ...p.value });
  if (error) return fail(error.code === "23505" ? "That address is already tracked." : error.message);
  return done(`Tracking ${p.value.target}. Run the CrUX job to load its data.`);
}

export async function removeCruxTargetOp(sb: SupabaseClient, clientId: string, targetId: number): Promise<OpResult> {
  const { error } = await sb.from("crux_targets").delete().eq("id", targetId).eq("client_id", clientId);
  return error ? fail(error.message) : done("Target removed. Its stored history is kept.");
}

// Sprint ------------------------------------------------------------------------

export async function setSprintOp(sb: SupabaseClient, clientId: string, raw: { deployedOn: string; baselineMs: string }): Promise<OpResult> {
  const p = parseSprint(raw);
  if (!p.ok) return fail(p.error);
  const { error } = await sb.from("clients").update({ inp_sprint_deployed_on: p.value.deployedOn, inp_baseline_ms: p.value.baselineMs }).eq("id", clientId);
  return error ? fail(error.message) : done("Sprint details saved.");
}

// Tag Bouncer scripts -------------------------------------------------------------

export interface TagScriptRow {
  id: number;
  label: string;
  scriptUrl: string;
  blockingMs: number;
  action: string;
  isRequired: boolean;
}

export async function listTagScripts(sb: SupabaseClient, clientId: string): Promise<TagScriptRow[]> {
  const { data } = await sb.from("tag_bouncer_scripts").select("id, label, script_url, script_host, blocking_ms, action, is_required").eq("client_id", clientId).order("blocking_ms", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id as number,
    label: (r.label as string | null) ?? (r.script_host as string),
    scriptUrl: r.script_url as string,
    blockingMs: (r.blocking_ms as number | null) ?? 0,
    action: r.action as string,
    isRequired: Boolean(r.is_required),
  }));
}

export async function saveTagScriptOp(
  sb: SupabaseClient,
  clientId: string,
  id: number | null,
  raw: { label: string; scriptUrl: string; blockingMs: string; action: string; isRequired: boolean },
): Promise<OpResult> {
  const p = parseTagScript(raw);
  if (!p.ok) return fail(p.error);
  const row = {
    label: p.value.label,
    script_url: p.value.scriptUrl,
    script_host: p.value.scriptHost,
    blocking_ms: p.value.blockingMs,
    action: p.value.action,
    is_required: p.value.isRequired,
    excluded_from_sla: p.value.isRequired, // a required script the client keeps is outside the INP SLA
    updated_at: new Date().toISOString(),
  };
  const { error } = id === null ? await sb.from("tag_bouncer_scripts").insert({ client_id: clientId, ...row }) : await sb.from("tag_bouncer_scripts").update(row).eq("id", id).eq("client_id", clientId);
  if (error) return fail(error.code === "23505" ? "That script is already listed." : error.message);
  return done(id === null ? "Script added." : "Script saved.");
}

export async function removeTagScriptOp(sb: SupabaseClient, clientId: string, id: number): Promise<OpResult> {
  const { error } = await sb.from("tag_bouncer_scripts").delete().eq("id", id).eq("client_id", clientId);
  return error ? fail(error.message) : done("Script removed.");
}

// Access -------------------------------------------------------------------------

export interface MemberRow {
  userId: string;
  email: string;
}

async function findUserByEmail(sb: SupabaseClient, email: string): Promise<{ id: string } | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return { id: hit.id };
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function listMembers(sb: SupabaseClient, clientId: string): Promise<MemberRow[]> {
  const { data } = await sb.from("client_members").select("user_id").eq("client_id", clientId);
  const members: MemberRow[] = [];
  for (const m of data ?? []) {
    const { data: user } = await sb.auth.admin.getUserById(m.user_id as string);
    members.push({ userId: m.user_id as string, email: user.user?.email ?? "(unknown)" });
  }
  return members.sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Gives a person read-only access to one client. Creates the account if needed WITHOUT sending any email: the person
 * then signs in at /login and asks for their own link (sign-up stays closed, D-016).
 */
export async function grantMemberOp(sb: SupabaseClient, clientId: string, rawEmail: string): Promise<OpResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) return fail("Enter a valid email address.");
  const client = await getClientAdmin(sb, clientId);
  if (!client) return fail("Client not found.");

  let user = await findUserByEmail(sb, email);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true });
    if (error) return fail(error.message);
    user = { id: data.user.id };
  }
  const { error } = await sb.from("client_members").upsert({ client_id: clientId, user_id: user.id }, { onConflict: "client_id,user_id", ignoreDuplicates: true });
  if (error) return fail(error.message);
  return done(`${email} can now see ${client.name}. They sign in at /login with that email.`);
}

export async function removeMemberOp(sb: SupabaseClient, clientId: string, userId: string): Promise<OpResult> {
  const { error } = await sb.from("client_members").delete().eq("client_id", clientId).eq("user_id", userId);
  return error ? fail(error.message) : done("Access removed. The account is kept.");
}

// Costs ----------------------------------------------------------------------------

export interface CostsData {
  total: number;
  byClient: { clientId: string; name: string; checks: number; cost: number }[];
  byDay: { day: string; checks: number; cost: number }[];
  runs: { id: number; mode: string; startedAt: string; checks: number; ok: number; failed: number; cost: number; errors: number }[];
}

export async function getCosts(sb: SupabaseClient, days = 30): Promise<OpResult<CostsData>> {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const [rows, clients, runs] = await Promise.all([
    sb.from("cost_by_client_day").select("client_id, day, checks, cost_usd").gte("day", since),
    sb.from("clients").select("id, name"),
    sb.from("watcher_runs").select("id, mode, started_at, checks_written, queries_ok, queries_failed, cost_usd, errors").order("id", { ascending: false }).limit(15),
  ]);
  if (rows.error) return fail(`Could not read costs: ${rows.error.message}. Has the latest migration been applied?`);

  const names = new Map((clients.data ?? []).map((c) => [c.id as string, c.name as string]));
  const byClient = new Map<string, { clientId: string; name: string; checks: number; cost: number }>();
  const byDay = new Map<string, { day: string; checks: number; cost: number }>();
  for (const r of rows.data ?? []) {
    const cost = Number(r.cost_usd ?? 0);
    const checks = Number(r.checks ?? 0);
    const c = byClient.get(r.client_id as string) ?? { clientId: r.client_id as string, name: names.get(r.client_id as string) ?? "(deleted)", checks: 0, cost: 0 };
    c.checks += checks;
    c.cost += cost;
    byClient.set(c.clientId, c);
    const d = byDay.get(r.day as string) ?? { day: r.day as string, checks: 0, cost: 0 };
    d.checks += checks;
    d.cost += cost;
    byDay.set(d.day, d);
  }
  const total = [...byClient.values()].reduce((s, c) => s + c.cost, 0);
  return done("ok", {
    total,
    byClient: [...byClient.values()].sort((a, b) => b.cost - a.cost),
    byDay: [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)),
    runs: (runs.data ?? []).map((r) => ({
      id: r.id as number,
      mode: r.mode as string,
      startedAt: r.started_at as string,
      checks: Number(r.checks_written ?? 0),
      ok: Number(r.queries_ok ?? 0),
      failed: Number(r.queries_failed ?? 0),
      cost: Number(r.cost_usd ?? 0),
      errors: Array.isArray(r.errors) ? r.errors.length : 0,
    })),
  });
}
