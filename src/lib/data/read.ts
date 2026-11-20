import type { SupabaseClient } from "@supabase/supabase-js";
import { queryIdeas, type MentionView, type Platform, type QueryIdea, type RunView } from "../ai-visibility.ts";
import { buildLlmView, type LlmData, type LlmRunRow } from "./llm.ts";
import { buildHistory, checkState, combine, daysBetween, type CheckRow, type DayState, type HistoryData } from "./history.ts";
import { todayUtc, windowDay, windowEnd } from "../sla.ts";

// The data core: every read the portal and the MCP server make. Each function receives the database client, so the same
// code runs as the signed-in user (portal, RLS decides what comes back) or with the local read-only client (MCP).
// Plain relative imports, no "server-only" and no Next.js: this file also runs under plain Node.
// Columns are always listed explicitly: some columns (cost, Slack webhook) are not readable by users, and none of them
// should ever leave through an MCP tool either.

export type Surface = "ai_overview" | "ai_mode";
export const SURFACES: Surface[] = ["ai_overview", "ai_mode"];
export const SURFACE_LABEL: Record<Surface, string> = { ai_overview: "AI Overview", ai_mode: "AI Mode" };

export interface ClientRow {
  id: string;
  name: string;
  domain: string;
  service_fee_usd: number | null;
  inp_sprint_deployed_on: string | null;
  inp_baseline_ms: number | null;
}

const CLIENT_COLUMNS = "id, name, domain, service_fee_usd, inp_sprint_deployed_on, inp_baseline_ms";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listClients(sb: SupabaseClient): Promise<Pick<ClientRow, "id" | "name" | "domain">[]> {
  const { data } = await sb.from("clients").select("id, name, domain").order("name");
  return data ?? [];
}

export async function getClient(sb: SupabaseClient, id: string): Promise<ClientRow | null> {
  if (!UUID.test(id)) return null;
  const { data } = await sb.from("clients").select(CLIENT_COLUMNS).eq("id", id).maybeSingle();
  return (data as ClientRow | null) ?? null;
}

// AI citations ---------------------------------------------------------------

export interface SurfaceState {
  aiPresent: boolean;
  cited: boolean; // cited at least once in the window on this surface
  checksCited: number;
  checksWithAi: number;
}

export interface QueryRow {
  query: string;
  cited: boolean; // counts for the SLA (any surface)
  offTop10: boolean; // judged on the first citation (D-019)
  firstSeen: string | null;
  citedUrl: string | null;
  sourcePosition: number | null;
  sourceCount: number | null;
  organicRank: number | null;
  otherDomains: string[];
  snapshotPath: string | null; // evidence of the first citation
  evidence: Partial<Record<Surface, string>>; // evidence (raw JSON) of the latest check on each surface, cited or not
  surfaces: Record<Surface, SurfaceState>;
}

export interface CardData {
  query: string;
  url: string | null;
  position: number | null;
  total: number | null;
  organicRank: number | null;
  offTop10: boolean;
  firstSeen: string;
}

export interface CitationsData {
  client: ClientRow;
  frozenFrom: string;
  frozenUntil: string;
  day: number;
  rows: QueryRow[];
  cited: number;
  offTop10: number;
  rate: { checksCited: number; checksWithAi: number };
  newest: CardData[];
}

const emptySurface = (): SurfaceState => ({ aiPresent: false, cited: false, checksCited: 0, checksWithAi: 0 });

export async function getCitations(sb: SupabaseClient, client: ClientRow): Promise<CitationsData | null> {
  const today = todayUtc();

  const { data: sets } = await sb
    .from("query_sets")
    .select("id, query, frozen_from")
    .eq("client_id", client.id)
    .order("frozen_from", { ascending: false })
    .order("id", { ascending: true });
  if (!sets?.length) return null;

  // Active window: the most recent one that has already started; otherwise the newest.
  const frozenFrom = (sets.find((s) => s.frozen_from <= today) ?? sets[0]).frozen_from as string;
  const queries = sets.filter((s) => s.frozen_from === frozenFrom).map((s) => s.query as string);

  const [sla, firsts, latest, rates] = await Promise.all([
    sb.from("sla_citations").select("query, first_seen, first_off_top10, surfaces").eq("client_id", client.id).eq("frozen_from", frozenFrom),
    sb
      .from("citation_first_checks")
      .select("query, checked_at, cited_url, source_position, source_count, organic_rank, off_top10, other_domains, snapshot_path")
      .eq("client_id", client.id)
      .eq("frozen_from", frozenFrom),
    sb.from("latest_checks").select("query, surface, aio_present, other_domains, snapshot_path").eq("client_id", client.id),
    sb.from("citation_rate").select("query, surface, checks_with_ai, checks_cited").eq("client_id", client.id).eq("frozen_from", frozenFrom),
  ]);

  const slaBy = new Map((sla.data ?? []).map((r) => [r.query as string, r]));
  const firstBy = new Map((firsts.data ?? []).map((r) => [r.query as string, r]));

  const rows: QueryRow[] = queries.map((query) => {
    const surfaces: Record<Surface, SurfaceState> = { ai_overview: emptySurface(), ai_mode: emptySurface() };
    const s = slaBy.get(query);
    const f = firstBy.get(query);
    for (const surface of (s?.surfaces ?? []) as Surface[]) surfaces[surface].cited = true;
    // Other sources are the union over both surfaces: AI Overview and AI Mode usually cite different sites.
    const otherDomains = new Set<string>();
    const evidence: QueryRow["evidence"] = {};
    for (const l of latest.data ?? []) {
      if (l.query !== query) continue;
      surfaces[l.surface as Surface].aiPresent = Boolean(l.aio_present);
      if (l.aio_present) for (const d of (l.other_domains as string[] | null) ?? []) otherDomains.add(d);
      if (l.snapshot_path) evidence[l.surface as Surface] = l.snapshot_path as string;
    }
    for (const d of (f?.other_domains as string[] | null) ?? []) otherDomains.add(d);
    for (const r of rates.data ?? []) {
      if (r.query !== query) continue;
      surfaces[r.surface as Surface].checksCited = Number(r.checks_cited);
      surfaces[r.surface as Surface].checksWithAi = Number(r.checks_with_ai);
    }
    return {
      query,
      cited: Boolean(s),
      offTop10: Boolean(s?.first_off_top10),
      firstSeen: (s?.first_seen as string | undefined) ?? null,
      citedUrl: (f?.cited_url as string | undefined) ?? null,
      sourcePosition: (f?.source_position as number | undefined) ?? null,
      sourceCount: (f?.source_count as number | undefined) ?? null,
      organicRank: (f?.organic_rank as number | undefined) ?? null,
      otherDomains: [...otherDomains],
      snapshotPath: (f?.snapshot_path as string | undefined) ?? null,
      evidence,
      surfaces,
    };
  });

  const cited = rows.filter((r) => r.cited);
  const rate = rows.reduce(
    (acc, r) => {
      for (const surface of SURFACES) {
        acc.checksCited += r.surfaces[surface].checksCited;
        acc.checksWithAi += r.surfaces[surface].checksWithAi;
      }
      return acc;
    },
    { checksCited: 0, checksWithAi: 0 },
  );

  const newest: CardData[] = cited
    .filter((r) => r.firstSeen)
    .sort((a, b) => (b.firstSeen as string).localeCompare(a.firstSeen as string))
    .slice(0, 3)
    .map((r) => ({
      query: r.query,
      url: r.citedUrl,
      position: r.sourcePosition,
      total: r.sourceCount,
      organicRank: r.organicRank,
      offTop10: r.offTop10,
      firstSeen: r.firstSeen as string,
    }));

  return {
    client,
    frozenFrom,
    frozenUntil: windowEnd(frozenFrom),
    day: windowDay(frozenFrom, today),
    rows,
    cited: cited.length,
    offTop10: cited.filter((r) => r.offTop10).length,
    rate,
    newest,
  };
}

// AI citations, day by day (D-047) ---------------------------------------------

export type { DayPoint, DayState, HistoryData, QueryHistory } from "./history.ts";

const HISTORY_PAGE = 1000; // PostgREST returns at most 1000 rows per request: a 60-day window holds thousands of checks
const HISTORY_MAX_PAGES = 60;

/**
 * The stored checks of the active window, as slim rows (no sources, no evidence paths), turned into the day-by-day history
 * of every frozen query. Read in pages: dropping rows silently would make the strip lie about the evidence.
 */
export async function getHistory(sb: SupabaseClient, clientId: string, window: Pick<CitationsData, "frozenFrom" | "frozenUntil" | "rows">): Promise<HistoryData> {
  const checks: CheckRow[] = [];
  for (let page = 0; page < HISTORY_MAX_PAGES; page++) {
    const { data, error } = await sb
      .from("aio_checks")
      .select("query, surface, checked_on, aio_present, cited")
      .eq("client_id", clientId)
      .gte("checked_on", window.frozenFrom)
      .lte("checked_on", window.frozenUntil)
      .order("checked_on", { ascending: true })
      .order("id", { ascending: true })
      .range(page * HISTORY_PAGE, (page + 1) * HISTORY_PAGE - 1);
    if (error) throw new Error(`history: ${error.message}`);
    checks.push(...(data as CheckRow[]));
    if (data.length < HISTORY_PAGE) break;
  }
  return buildHistory({
    frozenFrom: window.frozenFrom,
    frozenUntil: window.frozenUntil,
    today: todayUtc(),
    queries: window.rows.map((r) => r.query),
    checks,
  });
}

/** What one surface showed on one day, with the evidence behind it. */
export interface SurfaceDay {
  state: DayState;
  position: number | null;
  sourceCount: number | null;
  citedUrl: string | null;
  organicRank: number | null;
  offTop10: boolean;
  otherDomains: string[];
  snapshotPath: string | null;
}
export interface DayDetail {
  day: string;
  state: DayState; // combined over both surfaces
  surfaces: Record<Surface, SurfaceDay>;
}

const noDay = (): SurfaceDay => ({ state: "unchecked", position: null, sourceCount: null, citedUrl: null, organicRank: null, offTop10: false, otherDomains: [], snapshotPath: null });

/** Every day of the window for one frozen query, newest first, with who else was cited and the link to the raw JSON. */
export async function getQueryHistory(sb: SupabaseClient, clientId: string, query: string, window: Pick<CitationsData, "frozenFrom" | "frozenUntil">): Promise<DayDetail[]> {
  const { data, error } = await sb
    .from("aio_checks")
    .select("surface, checked_on, aio_present, cited, cited_url, source_position, source_count, organic_rank, off_top10, other_domains, snapshot_path")
    .eq("client_id", clientId)
    .eq("query", query)
    .gte("checked_on", window.frozenFrom)
    .lte("checked_on", window.frozenUntil)
    .order("checked_on", { ascending: false })
    .limit(500); // 60 days x 2 surfaces = 120 rows; the cap only guards against a malformed window
  if (error) throw new Error(`query history: ${error.message}`);

  const last = todayUtc() < window.frozenUntil ? todayUtc() : window.frozenUntil;
  const days = new Map<string, Record<Surface, SurfaceDay>>();
  for (const day of daysBetween(window.frozenFrom, last)) days.set(day, { ai_overview: noDay(), ai_mode: noDay() });
  for (const r of data ?? []) {
    const entry = days.get(r.checked_on as string);
    if (!entry) continue;
    entry[r.surface as Surface] = {
      state: checkState(r),
      position: (r.source_position as number | null) ?? null,
      sourceCount: (r.source_count as number | null) ?? null,
      citedUrl: (r.cited_url as string | null) ?? null,
      organicRank: (r.organic_rank as number | null) ?? null,
      offTop10: Boolean(r.off_top10),
      otherDomains: ((r.other_domains as string[] | null) ?? []).slice(),
      snapshotPath: (r.snapshot_path as string | null) ?? null,
    };
  }
  return [...days.entries()]
    .map(([day, surfaces]) => ({ day, state: combine(SURFACES.map((s) => surfaces[s].state)), surfaces }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

// ChatGPT runs (D-048) ---------------------------------------------------------

export type { LlmData, LlmQueryRow, LlmRelation, LlmRunRow } from "./llm.ts";

/** Every stored ChatGPT run of the client, shaped for the ChatGPT page. Null when the table does not exist yet (migration pending). */
export async function getLlmRuns(sb: SupabaseClient, clientId: string, frozenQueries: string[]): Promise<LlmData | null> {
  const runs: LlmRunRow[] = [];
  for (let page = 0; page < HISTORY_MAX_PAGES; page++) {
    const { data, error } = await sb
      .from("llm_runs")
      .select("query, run_at, run_on, relation, source_count, client_source_rank, client_url, other_domains, consulted_count, snapshot_path")
      .eq("client_id", clientId)
      .eq("platform", "chat_gpt")
      .order("run_at", { ascending: true })
      .order("id", { ascending: true })
      .range(page * HISTORY_PAGE, (page + 1) * HISTORY_PAGE - 1);
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") return null; // table not there yet
      throw new Error(`llm runs: ${error.message}`);
    }
    for (const r of data) {
      runs.push({
        query: r.query as string,
        runAt: r.run_at as string,
        runOn: r.run_on as string,
        relation: r.relation as LlmRunRow["relation"],
        sourceCount: Number(r.source_count),
        clientSourceRank: (r.client_source_rank as number | null) ?? null,
        clientUrl: (r.client_url as string | null) ?? null,
        otherDomains: ((r.other_domains as string[] | null) ?? []).slice(),
        consultedCount: Number(r.consulted_count),
        snapshotPath: r.snapshot_path as string,
      });
    }
    if (data.length < HISTORY_PAGE) break;
  }
  return buildLlmView(runs, frozenQueries);
}

// Speed ---------------------------------------------------------------------

export interface TagScript {
  id: number;
  label: string;
  blockingMs: number;
  action: "keep" | "load_on_first_interaction" | "move_server_side" | "remove";
  isRequired: boolean;
}

export interface CruxPoint {
  periodEnd: string;
  inpMs: number;
  goodShare: number | null;
}

/** Google's field data (CrUX): the origin's history, and the latest reading of each URL we track. */
export interface CruxData {
  origin: { target: string; points: CruxPoint[] } | null;
  urls: { target: string; periodEnd: string; inpMs: number; goodShare: number | null }[];
}

export interface SpeedData {
  client: ClientRow;
  headline: { p75: number; interactions: number } | null;
  templates: { template: string; p75: number; interactions: number }[];
  daily: { day: string; p75: number }[];
  crux: CruxData;
  scripts: TagScript[];
}

function buildCrux(rows: { scope: string; target: string; period_end: string; inp_p75_ms: number | null; inp_good_share: number | null }[]): CruxData {
  const byTarget = new Map<string, CruxPoint[]>();
  const urls = new Map<string, CruxData["urls"][number]>();
  for (const r of rows) {
    if (r.inp_p75_ms === null) continue;
    const point = { periodEnd: r.period_end, inpMs: r.inp_p75_ms, goodShare: r.inp_good_share === null ? null : Number(r.inp_good_share) };
    if (r.scope === "origin") byTarget.set(r.target, [...(byTarget.get(r.target) ?? []), point]);
    else if (!urls.has(r.target) || urls.get(r.target)!.periodEnd < r.period_end) urls.set(r.target, { target: r.target, ...point });
  }
  // If several origins are tracked (www and apex), show the one with the most recent data.
  let origin: CruxData["origin"] = null;
  for (const [target, pts] of byTarget) {
    const points = pts.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    if (!origin || points[points.length - 1].periodEnd > origin.points[origin.points.length - 1].periodEnd) origin = { target, points };
  }
  return { origin, urls: [...urls.values()].sort((a, b) => a.target.localeCompare(b.target)) };
}

export async function getSpeed(sb: SupabaseClient, client: ClientRow): Promise<SpeedData> {
  const [overall, templates, daily, crux, tags] = await Promise.all([
    sb.from("inp_p75_overall").select("p75, interactions").eq("client_id", client.id).maybeSingle(),
    sb.from("inp_p75").select("url_template, p75, interactions").eq("client_id", client.id).order("p75", { ascending: false }),
    sb.from("inp_p75_daily").select("day, p75").eq("client_id", client.id).order("day", { ascending: true }),
    sb
      .from("crux_history")
      .select("scope, target, period_end, inp_p75_ms, inp_good_share")
      .eq("client_id", client.id)
      .eq("form_factor", "PHONE")
      .order("period_end", { ascending: false })
      .limit(400),
    sb.from("tag_bouncer_scripts").select("id, label, script_host, blocking_ms, action, is_required").eq("client_id", client.id).order("blocking_ms", { ascending: false }),
  ]);

  return {
    client,
    headline: overall.data ? { p75: Number(overall.data.p75), interactions: Number(overall.data.interactions) } : null,
    templates: (templates.data ?? []).map((t) => ({ template: t.url_template as string, p75: Number(t.p75), interactions: Number(t.interactions) })),
    daily: (daily.data ?? []).map((d) => ({ day: d.day as string, p75: Number(d.p75) })),
    crux: buildCrux((crux.data ?? []) as Parameters<typeof buildCrux>[0]),
    scripts: (tags.data ?? []).map((t) => ({
      id: t.id as number,
      label: (t.label as string | null) ?? (t.script_host as string),
      blockingMs: (t.blocking_ms as number | null) ?? 0,
      action: t.action as TagScript["action"],
      isRequired: Boolean(t.is_required),
    })),
  };
}

// AI visibility (D-040) -------------------------------------------------------

export interface AiVisibilityData {
  runs: RunView[];
  mentions: MentionView[];
}

/**
 * The latest capture of each platform. Empty (not an error) until the first run, and also while the Phase 8 migration is
 * not applied yet, so the page can say "no data yet" instead of breaking.
 */
export async function getAiVisibility(sb: SupabaseClient, clientId: string): Promise<AiVisibilityData> {
  const runsRes = await sb
    .from("ai_mention_runs")
    .select("platform, captured_on, total_count, rows_stored")
    .eq("client_id", clientId)
    .order("captured_on", { ascending: false })
    .limit(20);
  if (runsRes.error || !runsRes.data?.length) return { runs: [], mentions: [] };

  const runs: RunView[] = runsRes.data.map((r) => ({ platform: r.platform as Platform, capturedOn: r.captured_on as string, totalCount: r.total_count as number, rowsStored: r.rows_stored as number }));
  const latest = new Map<Platform, string>();
  for (const r of runs) if (!latest.has(r.platform)) latest.set(r.platform, r.capturedOn);

  const mentions: MentionView[] = [];
  for (const [platform, day] of latest) {
    const { data } = await sb
      .from("ai_mentions")
      .select("question, ai_search_volume, first_response_at, last_response_at, relation, source_count, client_source_rank, client_url, other_domains")
      .eq("client_id", clientId)
      .eq("platform", platform)
      .eq("captured_on", day)
      .order("ai_search_volume", { ascending: false, nullsFirst: false })
      .limit(200);
    for (const m of data ?? []) {
      mentions.push({
        platform,
        question: m.question as string,
        aiSearchVolume: (m.ai_search_volume as number | null) ?? null,
        firstResponseAt: (m.first_response_at as string | null) ?? null,
        lastResponseAt: (m.last_response_at as string | null) ?? null,
        relation: m.relation as "cited" | "consulted",
        sourceCount: m.source_count as number,
        clientSourceRank: (m.client_source_rank as number | null) ?? null,
        clientUrl: (m.client_url as string | null) ?? null,
        otherDomains: (m.other_domains as string[] | null) ?? [],
      });
    }
  }
  return { runs: runs.filter((r) => latest.get(r.platform) === r.capturedOn), mentions };
}

// Query ideas (D-040) --------------------------------------------------------

/**
 * Questions Google's AI already cites the client for, from the latest AI visibility read, minus what is already frozen.
 * Read-only: staff copy them into the freeze form. Nothing is frozen automatically (a frozen list cannot be edited).
 */
export async function getQueryIdeas(sb: SupabaseClient, clientId: string, frozen: string[]): Promise<{ ideas: QueryIdea[]; capturedOn: string | null }> {
  const run = await sb
    .from("ai_mention_runs")
    .select("captured_on")
    .eq("client_id", clientId)
    .eq("platform", "google")
    .order("captured_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (run.error || !run.data) return { ideas: [], capturedOn: null }; // no read yet, or the migration is not applied
  const { data, error } = await sb
    .from("ai_mentions")
    .select("question, ai_search_volume, relation")
    .eq("client_id", clientId)
    .eq("platform", "google")
    .eq("captured_on", run.data.captured_on)
    .order("ai_search_volume", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw new Error(`ai_mentions: ${error.message}`);
  const mentions = (data ?? []).map((m) => ({
    platform: "google" as const,
    question: m.question as string,
    aiSearchVolume: (m.ai_search_volume as number | null) ?? null,
    firstResponseAt: null,
    lastResponseAt: null,
    relation: m.relation as "cited" | "consulted",
    sourceCount: 0,
    clientSourceRank: null,
    clientUrl: null,
    otherDomains: [],
  }));
  return { ideas: queryIdeas(mentions, frozen, 25), capturedOn: run.data.captured_on as string };
}

// Overview of every client (MCP) -------------------------------------------------

export interface ClientOverview {
  id: string;
  name: string;
  domain: string;
  kind: string;
  window: { from: string; until: string; queries: number } | null;
}

/** All clients with their kind and the query window that is running (or the newest one). No fees, no webhooks. */
export async function listClientsOverview(sb: SupabaseClient): Promise<ClientOverview[]> {
  const [clients, sets] = await Promise.all([
    sb.from("clients").select("id, name, domain, kind").order("name"),
    sb.from("query_sets").select("client_id, frozen_from, frozen_until").limit(5000),
  ]);
  if (clients.error) throw new Error("Could not read clients.");
  const today = todayUtc();
  const byClient = new Map<string, Map<string, { until: string; n: number }>>();
  for (const s of sets.data ?? []) {
    const m = byClient.get(s.client_id as string) ?? new Map();
    const cur = m.get(s.frozen_from as string) ?? { until: s.frozen_until as string, n: 0 };
    cur.n += 1;
    m.set(s.frozen_from as string, cur);
    byClient.set(s.client_id as string, m);
  }
  return (clients.data ?? []).map((c) => {
    const windows = [...(byClient.get(c.id as string) ?? new Map<string, { until: string; n: number }>())].sort((a, b) => b[0].localeCompare(a[0]));
    const active = windows.find(([from]) => from <= today) ?? windows[0];
    return {
      id: c.id as string,
      name: c.name as string,
      domain: c.domain as string,
      kind: c.kind as string,
      window: active ? { from: active[0], until: active[1].until, queries: active[1].n } : null,
    };
  });
}
