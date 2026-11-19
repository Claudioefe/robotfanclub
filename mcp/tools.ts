// The MCP tools. Every handler is a plain async function over a (read-only) database client, so the same code serves the
// local stdio server today and a remote server later (D-044). Rules: read-only, nothing here calls DataForSEO, no cost or
// internal path ever leaves, and database errors are replaced by a plain message.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PLATFORM_LABEL, competitors, coverage, daysAgo, freshness, paginate, questionRows } from "../src/lib/ai-visibility.ts";
import { summarizeEvidence } from "../src/lib/data/evidence.ts";
import {
  SURFACES,
  SURFACE_LABEL,
  UUID,
  getAiVisibility,
  getCitations,
  getClient,
  getQueryIdeas,
  getSpeed,
  listClientsOverview,
  type QueryRow,
  type Surface,
} from "../src/lib/data/read.ts";
import { MIN_INP_SAMPLE, SLA, canProject, citationRate, cruxWindows, projectCitations, share, slaStatus, todayUtc } from "../src/lib/sla.ts";

/** A tool failure the model can read. Never carries a stack trace or a database message. */
export class ToolError extends Error {}

const clientId = z.string().regex(UUID, "client_id must be a UUID from list_clients").describe("Client id (UUID) from list_clients.");
const MAX_ROWS = 200;

export const SCHEMAS = {
  list_clients: {},
  get_citations: {
    client_id: clientId,
    filter: z.enum(["all", "cited", "off_top10", "gap"]).default("all").describe("all queries, only cited ones, only cited from outside the organic top 10, or only queries with an AI answer that did not cite the client."),
    surface: z.enum(["all", "ai_overview", "ai_mode"]).default("all"),
    limit: z.number().int().min(1).max(MAX_ROWS).default(100),
  },
  get_gaps: { client_id: clientId },
  get_evidence: {
    client_id: clientId,
    query: z.string().min(1).max(300).describe("One of the frozen queries, exactly as listed by get_citations."),
    surface: z.enum(["ai_overview", "ai_mode"]).optional().describe("Omit to get both surfaces."),
    which: z.enum(["latest", "first_citation"]).default("latest").describe("The latest check, or the check where the client was first cited (when there is one)."),
    raw: z.boolean().default(false).describe("true returns the complete raw JSON stored as evidence (large); false returns a readable summary."),
  },
  get_speed: { client_id: clientId },
  get_ai_visibility: {
    client_id: clientId,
    page: z.number().int().min(1).default(1),
    page_size: z.number().int().min(1).max(100).default(25),
  },
  get_query_ideas: { client_id: clientId },
} as const;

export const DESCRIPTIONS: Record<keyof typeof SCHEMAS, string> = {
  list_clients: "List the clients: id, name, domain, kind (real, demo or sandbox) and the frozen query window that is running.",
  get_citations:
    "AI citation results for a client over its running 60-day window: totals, share outside the organic top 10, citation rate, SLA status, and one row per frozen query (cited or not, where, from which page).",
  get_gaps: "Queries where Google's AI answered but did not cite the client, with the sites it cited instead and the ones that appear most.",
  get_evidence: "The stored evidence of one query: the AI answer text, its sources in order, and the organic top 10 of the same check. Use it to see why a query is or is not cited.",
  get_speed: "Mobile INP (p75) for a client: real-visitor data by page template and by day, Google's field data (CrUX), the two 28-day windows and the third-party scripts.",
  get_ai_visibility:
    "Informational module: how many recorded Google and ChatGPT answers mention the client's domain, the top questions (paginated) and the sites cited next to it. A database snapshot, not a live measurement, and outside the SLA.",
  get_query_ideas: "Questions Google's AI already cites the client for (from the AI visibility read), minus the ones already frozen. Nothing is frozen from here.",
};

export const INSTRUCTIONS = [
  "Robot Fan Club measures whether Google's AI Overviews and AI Mode cite a client's pages, and the site's mobile INP.",
  "A citation is one frozen query where a page of the client's domain appears among the AI answer's sources at least once in the 60-day window; seeing it again adds nothing.",
  `SLA: floor ${SLA.floor}, target ${SLA.target}, bonus ${SLA.bonus} citations; at least ${SLA.offTop10Share * 100}% must come from pages outside the same query's organic top 10 that day (compared by URL, not domain). Measurements are US, English, mobile, same hour daily.`,
  "AI visibility data is a database snapshot with its own dates; it is informational and not part of the SLA.",
  "These tools only read. They never call DataForSEO and never change data. Recommendations you make from this data are hypotheses: AI answers change from day to day.",
].join("\n");

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

export function buildHandlers(db: SupabaseClient): Record<keyof typeof SCHEMAS, Handler> {
  const need = async (id: string) => {
    const client = await getClient(db, id);
    if (!client) throw new ToolError("No client with that id.");
    return client;
  };
  const surfacesOf = (r: QueryRow) => SURFACES.filter((s) => r.surfaces[s].cited);
  const aiAnywhere = (r: QueryRow) => SURFACES.some((s) => r.surfaces[s].aiPresent);

  return {
    async list_clients() {
      return { clients: await listClientsOverview(db) };
    },

    async get_citations(args) {
      const a = z.object(SCHEMAS.get_citations).parse(args);
      const client = await need(a.client_id);
      const cit = await getCitations(db, client);
      if (!cit) return { client: { id: client.id, name: client.name, domain: client.domain }, window: null, note: "No frozen query list yet." };

      const list = a.surface === "all" ? SURFACES : [a.surface as Surface];
      const citedHere = (r: QueryRow) => list.some((s) => r.surfaces[s].cited);
      const aiHere = (r: QueryRow) => list.some((s) => r.surfaces[s].aiPresent);
      const test: Record<typeof a.filter, (r: QueryRow) => boolean> = {
        all: () => true,
        cited: citedHere,
        off_top10: (r) => citedHere(r) && r.offTop10,
        gap: (r) => aiHere(r) && !citedHere(r),
      };
      const rows = cit.rows.filter(test[a.filter]);
      const offShare = share(cit.offTop10, cit.cited);
      // The fee is never passed: the status text must not carry money.
      const status = slaStatus({ cited: cit.cited, day: cit.day, feeUsd: null });
      return {
        client: { id: client.id, name: client.name, domain: client.domain },
        window: { from: cit.frozenFrom, until: cit.frozenUntil, day: cit.day, days: SLA.windowDays, frozenQueries: cit.rows.length },
        summary: {
          citations: cit.cited,
          citationsOutsideTop10: cit.offTop10,
          shareOutsideTop10: Number(offShare.toFixed(3)),
          meetsOutsideTop10Goal: offShare >= SLA.offTop10Share,
          citationRate: { checksCited: cit.rate.checksCited, checksWithAi: cit.rate.checksWithAi, rate: Number(citationRate(cit.rate.checksCited, cit.rate.checksWithAi).toFixed(3)) },
          projectedByDay60: canProject(cit.day) ? projectCitations(cit.cited, cit.day) : null,
          sla: { floor: SLA.floor, target: SLA.target, bonus: SLA.bonus, status: status.text, tone: status.tone },
        },
        filter: a.filter,
        surface: a.surface,
        matching: rows.length,
        rows: rows.slice(0, a.limit).map((r) => ({
          query: r.query,
          cited: r.cited,
          citedOn: surfacesOf(r).map((s) => SURFACE_LABEL[s]),
          outsideTop10: r.cited ? r.offTop10 : null,
          firstSeen: r.firstSeen,
          citedUrl: r.citedUrl,
          sourcePosition: r.sourcePosition,
          sourceCount: r.sourceCount,
          organicRank: r.organicRank,
          aiAnswerOn: SURFACES.filter((s) => r.surfaces[s].aiPresent).map((s) => SURFACE_LABEL[s]),
          citationRate: (() => {
            const w = list.reduce((n, s) => n + r.surfaces[s].checksWithAi, 0);
            const c = list.reduce((n, s) => n + r.surfaces[s].checksCited, 0);
            return w ? Number((c / w).toFixed(3)) : null;
          })(),
        })),
        truncated: rows.length > a.limit,
      };
    },

    async get_gaps(args) {
      const a = z.object(SCHEMAS.get_gaps).parse(args);
      const client = await need(a.client_id);
      const cit = await getCitations(db, client);
      if (!cit) return { note: "No frozen query list yet.", gaps: [] };
      const gaps = cit.rows.filter((r) => !r.cited && aiAnywhere(r));
      const counts = new Map<string, number>();
      for (const g of gaps) for (const d of new Set(g.otherDomains)) if (d !== "google.com" && !d.endsWith(".google.com")) counts.set(d, (counts.get(d) ?? 0) + 1);
      return {
        client: { id: client.id, name: client.name, domain: client.domain },
        window: { from: cit.frozenFrom, until: cit.frozenUntil, day: cit.day },
        gapQueries: gaps.length,
        gaps: gaps.map((g) => ({ query: g.query, aiAnswerOn: SURFACES.filter((s) => g.surfaces[s].aiPresent).map((s) => SURFACE_LABEL[s]), citedInstead: g.otherDomains.filter((d) => d !== "google.com" && !d.endsWith(".google.com")) })),
        mostCitedInstead: [...counts.entries()].map(([domain, queries]) => ({ domain, queries })).sort((x, y) => y.queries - x.queries || x.domain.localeCompare(y.domain)).slice(0, 15),
      };
    },

    async get_evidence(args) {
      const a = z.object(SCHEMAS.get_evidence).parse(args);
      const client = await need(a.client_id);
      const cit = await getCitations(db, client);
      const row = cit?.rows.find((r) => r.query.toLowerCase() === a.query.trim().toLowerCase());
      if (!cit || !row) throw new ToolError("That query is not in the client's frozen list. Use get_citations to see the exact queries.");

      const wanted = a.surface ? [a.surface] : SURFACES;
      const out: Record<string, unknown> = {};
      for (const surface of wanted) {
        const path = a.which === "first_citation" ? (row.surfaces[surface].cited ? row.snapshotPath : null) : (row.evidence[surface] ?? null);
        if (!path) {
          out[surface] = { available: false, reason: a.which === "first_citation" ? "The client was not cited on this surface." : "No check stored yet." };
          continue;
        }
        const file = await db.storage.from("snapshots").download(path);
        if (file.error || !file.data) {
          out[surface] = { available: false, reason: "The stored file could not be read." };
          continue;
        }
        const text = await file.data.text();
        if (a.raw) {
          const LIMIT = 120_000;
          out[surface] = { available: true, rawJson: text.slice(0, LIMIT), truncated: text.length > LIMIT };
        } else {
          out[surface] = { available: true, ...summarizeEvidence(JSON.parse(text)) };
        }
      }
      return { client: { id: client.id, name: client.name, domain: client.domain }, query: row.query, which: a.which, cited: row.cited, evidence: out };
    },

    async get_speed(args) {
      const a = z.object(SCHEMAS.get_speed).parse(args);
      const client = await need(a.client_id);
      const sp = await getSpeed(db, client);
      const windows = client.inp_sprint_deployed_on ? cruxWindows(client.inp_sprint_deployed_on) : null;
      return {
        client: { id: client.id, name: client.name, domain: client.domain },
        goalMs: SLA.inpGoalMs,
        baselineMs: client.inp_baseline_ms,
        sprintDeployedOn: client.inp_sprint_deployed_on,
        realVisitors: sp.headline ? { p75Ms: Math.round(sp.headline.p75), interactions: sp.headline.interactions, preview: sp.headline.interactions < MIN_INP_SAMPLE } : null,
        byTemplate: sp.templates.slice(0, 20).map((t) => ({ template: t.template, p75Ms: Math.round(t.p75), interactions: t.interactions })),
        daily: sp.daily.slice(-28).map((d) => ({ day: d.day, p75Ms: Math.round(d.p75) })),
        crux: {
          origin: sp.crux.origin ? { target: sp.crux.origin.target, recent: sp.crux.origin.points.slice(-6) } : null,
          urls: sp.crux.urls,
          windows: windows ? windows.map((w) => ({ start: w.start, end: w.end, daysCollected: w.daysCollected })) : null,
        },
        thirdPartyScripts: sp.scripts.map((s) => ({ name: s.label, blockingMs: s.blockingMs, action: s.action, required: s.isRequired })),
      };
    },

    async get_ai_visibility(args) {
      const a = z.object(SCHEMAS.get_ai_visibility).parse(args);
      const client = await need(a.client_id);
      const { runs, mentions } = await getAiVisibility(db, client.id);
      if (!runs.length) return { client: { id: client.id, name: client.name, domain: client.domain }, note: "No AI visibility data yet." };
      const view = paginate(questionRows(mentions), String(a.page), a.page_size);
      const fresh = freshness(mentions);
      return {
        client: { id: client.id, name: client.name, domain: client.domain },
        note: "A snapshot of DataForSEO's database of recorded AI answers, not a live measurement. Informational: outside the SLA.",
        platforms: coverage(runs, mentions).map((c) => ({ platform: PLATFORM_LABEL[c.platform], answersMentioningDomain: c.total, capturedOn: c.capturedOn, topShown: c.shown, cited: c.cited, readNotCited: c.consulted })),
        recordedBetween: fresh.oldest && fresh.newest ? { oldest: fresh.oldest, newest: fresh.newest, newestDaysAgo: daysAgo(fresh.newest, todayUtc()) } : null,
        questions: view.items.map((q) => ({
          question: q.question,
          aiSearchesPerMonth: q.volume,
          platforms: q.platforms.map((p) => ({ platform: PLATFORM_LABEL[p.platform], relation: p.relation, sourceRank: p.rank, sourceCount: p.sourceCount, lastRecorded: p.lastResponseAt })),
        })),
        page: { page: view.page, pages: view.pages, from: view.from, to: view.to, total: view.total },
        citedNextToYou: competitors(mentions),
      };
    },

    async get_query_ideas(args) {
      const a = z.object(SCHEMAS.get_query_ideas).parse(args);
      const client = await need(a.client_id);
      const cit = await getCitations(db, client);
      const { ideas, capturedOn } = await getQueryIdeas(db, client.id, cit?.rows.map((r) => r.query) ?? []);
      return { client: { id: client.id, name: client.name, domain: client.domain }, capturedOn, alreadyFrozen: cit?.rows.length ?? 0, ideas, note: "Questions Google already cites this domain for, by AI search volume. A person decides what to freeze." };
    },
  };
}
