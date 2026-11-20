// View logic for the ChatGPT page (D-048). Pure: no database, no framework. Informational module: nothing here counts toward
// the citation SLA. ChatGPT changes its answer from one run to the next, so the unit shown is "runs that cited the client",
// never a single run.

export type LlmRelation = "cited" | "consulted" | "none";

export interface LlmRunRow {
  query: string;
  runAt: string;
  runOn: string;
  relation: LlmRelation;
  sourceCount: number;
  clientSourceRank: number | null;
  clientUrl: string | null;
  otherDomains: string[];
  consultedCount: number;
  snapshotPath: string;
}

export interface LlmQueryRow {
  query: string;
  /** In the client's frozen list for the active window (the others were tested as extras). */
  frozen: boolean;
  /** Oldest first, so the dots read left to right like the day strip. */
  runs: LlmRunRow[];
  cited: number;
  consulted: number;
  none: number;
  lastRunOn: string | null;
  /** Domains cited next to the client, most frequent first, across this query's runs. */
  topOthers: { domain: string; runs: number }[];
}

export interface LlmData {
  rows: LlmQueryRow[];
  totals: {
    frozenQueries: number;
    measuredQueries: number; // frozen queries with at least one run
    queriesCited: number; // cited in at least one run
    queriesConsultedOnly: number; // never cited, consulted in at least one run
    runs: number;
    runsCited: number;
    runsConsulted: number;
  };
  /** Sites ChatGPT cites most across the measured queries: in how many queries each appeared as a source. */
  preferred: { domain: string; queries: number }[];
}

const tally = (items: string[]) => {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].map(([domain, n]) => ({ domain, n })).sort((a, b) => b.n - a.n || a.domain.localeCompare(b.domain));
};

export function buildLlmView(runs: LlmRunRow[], frozenQueries: string[], preferredLimit = 8): LlmData {
  const byQuery = new Map<string, LlmRunRow[]>();
  for (const r of runs) byQuery.set(r.query, [...(byQuery.get(r.query) ?? []), r]);

  const rowFor = (query: string, frozen: boolean): LlmQueryRow => {
    const list = (byQuery.get(query) ?? []).slice().sort((a, b) => a.runAt.localeCompare(b.runAt));
    return {
      query,
      frozen,
      runs: list,
      cited: list.filter((r) => r.relation === "cited").length,
      consulted: list.filter((r) => r.relation === "consulted").length,
      none: list.filter((r) => r.relation === "none").length,
      lastRunOn: list.at(-1)?.runOn ?? null,
      topOthers: tally(list.flatMap((r) => r.otherDomains)).slice(0, 5).map(({ domain, n }) => ({ domain, runs: n })),
    };
  };

  const frozenSet = new Set(frozenQueries);
  const extras = [...byQuery.keys()].filter((q) => !frozenSet.has(q)).sort();
  const rows = [...frozenQueries.map((q) => rowFor(q, true)), ...extras.map((q) => rowFor(q, false))];

  const measured = rows.filter((r) => r.frozen && r.runs.length);
  // For "sites ChatGPT prefers" each query counts once per domain, however many runs cited it.
  const preferred = tally(measured.flatMap((r) => [...new Set(r.runs.flatMap((run) => run.otherDomains))]))
    .slice(0, preferredLimit)
    .map(({ domain, n }) => ({ domain, queries: n }));

  return {
    rows,
    totals: {
      frozenQueries: frozenQueries.length,
      measuredQueries: measured.length,
      queriesCited: measured.filter((r) => r.cited > 0).length,
      queriesConsultedOnly: measured.filter((r) => r.cited === 0 && r.consulted > 0).length,
      runs: measured.reduce((n, r) => n + r.runs.length, 0),
      runsCited: measured.reduce((n, r) => n + r.cited, 0),
      runsConsulted: measured.reduce((n, r) => n + r.consulted, 0),
    },
    preferred,
  };
}
