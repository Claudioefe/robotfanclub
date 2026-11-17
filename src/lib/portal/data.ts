import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayUtc, windowDay, windowEnd } from "@/lib/sla";

// All reads run as the signed-in user, so RLS decides what comes back.
// Columns are always listed explicitly: some columns (cost, Slack webhook) are not readable by users.

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

export async function currentUser() {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function isStaff(): Promise<boolean> {
  const sb = await createClient();
  const { data } = await sb.from("staff").select("user_id").maybeSingle();
  return Boolean(data);
}

export async function listClients(): Promise<Pick<ClientRow, "id" | "name" | "domain">[]> {
  const sb = await createClient();
  const { data } = await sb.from("clients").select("id, name, domain").order("name");
  return data ?? [];
}

export async function getClient(id: string): Promise<ClientRow | null> {
  if (!UUID.test(id)) return null;
  const sb = await createClient();
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
  snapshotPath: string | null;
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

export async function getCitations(client: ClientRow): Promise<CitationsData | null> {
  const sb = await createClient();
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
    sb.from("latest_checks").select("query, surface, aio_present, other_domains").eq("client_id", client.id),
    sb.from("citation_rate").select("query, surface, checks_with_ai, checks_cited").eq("client_id", client.id).eq("frozen_from", frozenFrom),
  ]);

  const slaBy = new Map((sla.data ?? []).map((r) => [r.query as string, r]));
  const firstBy = new Map((firsts.data ?? []).map((r) => [r.query as string, r]));

  const rows: QueryRow[] = queries.map((query) => {
    const surfaces: Record<Surface, SurfaceState> = { ai_overview: emptySurface(), ai_mode: emptySurface() };
    const s = slaBy.get(query);
    const f = firstBy.get(query);
    for (const surface of (s?.surfaces ?? []) as Surface[]) surfaces[surface].cited = true;
    let otherDomains: string[] = [];
    for (const l of latest.data ?? []) {
      if (l.query !== query) continue;
      surfaces[l.surface as Surface].aiPresent = Boolean(l.aio_present);
      if (l.aio_present && !otherDomains.length) otherDomains = (l.other_domains as string[] | null) ?? [];
    }
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
      otherDomains: f?.other_domains && otherDomains.length === 0 ? ((f.other_domains as string[]) ?? []) : otherDomains,
      snapshotPath: (f?.snapshot_path as string | undefined) ?? null,
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

// Speed ---------------------------------------------------------------------

export interface TagScript {
  id: number;
  label: string;
  blockingMs: number;
  action: "keep" | "load_on_first_interaction" | "move_server_side" | "remove";
  isRequired: boolean;
}

export interface SpeedData {
  client: ClientRow;
  headline: { p75: number; interactions: number } | null;
  templates: { template: string; p75: number; interactions: number }[];
  daily: { day: string; p75: number }[];
  cruxReadings: { periodEnd: string; inpMs: number | null }[];
  scripts: TagScript[];
}

export async function getSpeed(client: ClientRow): Promise<SpeedData> {
  const sb = await createClient();
  const [overall, templates, daily, crux, tags] = await Promise.all([
    sb.from("inp_p75_overall").select("p75, interactions").eq("client_id", client.id).maybeSingle(),
    sb.from("inp_p75").select("url_template, p75, interactions").eq("client_id", client.id).order("p75", { ascending: false }),
    sb.from("inp_p75_daily").select("day, p75").eq("client_id", client.id).order("day", { ascending: true }),
    sb
      .from("crux_history")
      .select("period_end, inp_p75_ms")
      .eq("client_id", client.id)
      .eq("scope", "origin")
      .order("period_end", { ascending: false })
      .limit(4),
    sb.from("tag_bouncer_scripts").select("id, label, script_host, blocking_ms, action, is_required").eq("client_id", client.id).order("blocking_ms", { ascending: false }),
  ]);

  return {
    client,
    headline: overall.data ? { p75: Number(overall.data.p75), interactions: Number(overall.data.interactions) } : null,
    templates: (templates.data ?? []).map((t) => ({ template: t.url_template as string, p75: Number(t.p75), interactions: Number(t.interactions) })),
    daily: (daily.data ?? []).map((d) => ({ day: d.day as string, p75: Number(d.p75) })),
    cruxReadings: (crux.data ?? []).map((c) => ({ periodEnd: c.period_end as string, inpMs: c.inp_p75_ms as number | null })),
    scripts: (tags.data ?? []).map((t) => ({
      id: t.id as number,
      label: (t.label as string | null) ?? (t.script_host as string),
      blockingMs: (t.blocking_ms as number | null) ?? 0,
      action: t.action as TagScript["action"],
      isRequired: Boolean(t.is_required),
    })),
  };
}
