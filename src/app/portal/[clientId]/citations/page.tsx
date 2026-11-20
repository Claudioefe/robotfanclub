import Link from "next/link";
import { notFound } from "next/navigation";
import { CitationsChart } from "@/components/citations/CitationsChart";
import { Strip, StripLegend } from "@/components/citations/Strip";
import { ShareCard } from "@/components/ShareCard";
import { Badge, Dim, Eyebrow, PageHeader, Panel, TableWrap, Td, Th } from "@/components/ui";
import { fmtDate, fmtPct } from "@/lib/format";
import { SURFACES, SURFACE_LABEL, getCitations, getClient, getHistory, type DayState, type QueryRow, type Surface } from "@/lib/portal/data";
import { citationRate } from "@/lib/sla";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "cited", label: "Cited" },
  { key: "off", label: "Cited from outside top 10" },
  { key: "gap", label: "AI answer without us" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];
type SurfaceKey = "all" | Surface;

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 font-mono text-[12.5px] font-medium no-underline ${
    active ? "border-accent/60 bg-accent/10 text-accent" : "border-line bg-surface text-muted hover:text-ink"
  }`;

export default async function Citations({ params, searchParams }: PageProps<"/portal/[clientId]/citations">) {
  const [{ clientId }, sp] = await Promise.all([params, searchParams]);
  const client = await getClient(clientId);
  if (!client) notFound();

  const filter = (FILTERS.find((f) => f.key === sp.f)?.key ?? "all") as FilterKey;
  const surface = (SURFACES.find((s) => s === sp.s) ?? "all") as SurfaceKey;
  const cit = await getCitations(client);
  if (!cit) {
    return (
      <>
        <PageHeader eyebrow="AIO Pro" title="AI citations" />
        <p className="mt-6 text-muted">No frozen query list yet.</p>
      </>
    );
  }

  const history = await getHistory(client, cit);
  const historyBy = new Map(history.queries.map((h) => [h.query, h]));
  const daysOf = (states: DayState[]) => ({ cited: states.filter((x) => x === "cited").length, withAi: states.filter((x) => x === "cited" || x === "gap").length });

  const surfaceList = surface === "all" ? SURFACES : [surface];
  const aiPresent = (r: QueryRow) => surfaceList.some((s) => r.surfaces[s].aiPresent);
  const citedHere = (r: QueryRow) => (surface === "all" ? r.cited : r.surfaces[surface].cited);
  const rateOf = (r: QueryRow) => {
    const withAi = surfaceList.reduce((n, s) => n + r.surfaces[s].checksWithAi, 0);
    const cited = surfaceList.reduce((n, s) => n + r.surfaces[s].checksCited, 0);
    return withAi ? citationRate(cited, withAi) : null;
  };

  const test: Record<FilterKey, (r: QueryRow) => boolean> = {
    all: () => true,
    cited: citedHere,
    off: (r) => citedHere(r) && r.offTop10,
    gap: (r) => aiPresent(r) && !citedHere(r),
  };
  const rows = cit.rows.filter(test[filter]);
  const href = (f: FilterKey, s: SurfaceKey) => {
    const q = new URLSearchParams();
    if (f !== "all") q.set("f", f);
    if (s !== "all") q.set("s", s);
    return `/portal/${client.id}/citations${q.size ? `?${q}` : ""}`;
  };

  return (
    // data-wide: the portal layout lets this page use the full width of the screen (the table needs it).
    <div data-wide>
      <PageHeader
        eyebrow="AIO Pro"
        title="AI citations"
        sub={`${cit.rows.length} frozen queries, checked daily in Google AI Overviews and AI Mode (US). Window: ${fmtDate(cit.frozenFrom)} to ${fmtDate(cit.frozenUntil)}.`}
      />

      <Panel className="mt-6">
        <Eyebrow>Citations over the window</Eyebrow>
        <div className="mt-3">
          <CitationsChart daily={history.daily} />
        </div>
        <p className="mt-3 max-w-[90ch] text-[13.5px] text-muted">
          The line is the number the SLA counts: a query counts once it has been cited at least once in the window, and seeing it again does not add to it, so
          the line never goes down. The bars show how many queries were cited on each single day. That number goes up and down, because Google’s AI answers
          change from one day to the next, and it is normal.
        </p>
      </Panel>

      <div role="group" aria-label="Filter queries" className="mb-2 mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link key={f.key} href={href(f.key, surface)} aria-current={f.key === filter} className={chip(f.key === filter)}>
            {f.label}
          </Link>
        ))}
      </div>
      <div role="group" aria-label="Filter by surface" className="mb-3.5 flex flex-wrap gap-1.5">
        {(["all", ...SURFACES] as SurfaceKey[]).map((s) => (
          <Link key={s} href={href(filter, s)} aria-current={s === surface} className={chip(s === surface)}>
            {s === "all" ? "Both surfaces" : SURFACE_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="mb-2.5">
        <StripLegend />
      </div>
      <TableWrap minWidth={1180}>
        <thead>
          <tr>
            <Th>Query</Th>
            <Th>{client.name} cited</Th>
            <Th>Day by day (latest on the right)</Th>
            <Th>Days cited · rate</Th>
            <Th>Organic rank</Th>
            <Th>Other sources</Th>
            <Th>Evidence</Th>
            <Th>
              <Dim>Card</Dim>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => {
              const here = citedHere(r);
              const ai = aiPresent(r);
              const rate = rateOf(r);
              const h = historyBy.get(r.query);
              const shown = h ? (surface === "all" ? h.combined : h.surfaces[surface]) : [];
              const counts = daysOf(shown);
              const perSurface = h ? SURFACES.map((s) => `${SURFACE_LABEL[s]}: cited ${daysOf(h.surfaces[s]).cited} of ${daysOf(h.surfaces[s]).withAi} days with an AI answer`).join(". ") : "";
              return (
                <tr key={r.query}>
                  <Td className="min-w-[220px] font-medium">
                    <Link href={`/portal/${client.id}/citations/query?q=${encodeURIComponent(r.query)}`} className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                      {r.query}
                    </Link>
                  </Td>
                  <Td>
                    {here ? (
                      r.offTop10 ? <Badge kind="off">Outside top 10</Badge> : <Badge kind="top">Top 10 page</Badge>
                    ) : ai ? (
                      <Badge kind="bad">Not cited</Badge>
                    ) : (
                      <Dim>No AI answer</Dim>
                    )}
                    {r.firstSeen && <p className="mt-1 whitespace-nowrap text-[12.5px] text-muted">first seen {fmtDate(r.firstSeen)}</p>}
                  </Td>
                  <Td>{h ? <Strip days={history.days} surfaces={h.surfaces} summary={perSurface} /> : <Dim>—</Dim>}</Td>
                  <Td className="whitespace-nowrap">
                    {counts.withAi ? <>{counts.cited} of {counts.withAi} days</> : <Dim>No AI answer yet</Dim>}
                    <p className="mt-0.5 text-[12.5px] text-muted">{rate === null ? "no rate yet" : `${fmtPct(rate)} citation rate`}</p>
                  </Td>
                  <Td>{r.cited ? (r.organicRank ?? <Dim>Not in top 10</Dim>) : <Dim>—</Dim>}</Td>
                  <Td>{r.otherDomains.length ? r.otherDomains.join(", ") : <Dim>None</Dim>}</Td>
                  <Td>
                    {/* Evidence of the latest check on each surface, also when we were NOT cited: that is what proves a gap. */}
                    <div className="flex flex-col gap-0.5">
                      {SURFACES.filter((s) => r.evidence[s]).map((s) => (
                        <a key={s} href={`/portal/${client.id}/snapshot?path=${encodeURIComponent(r.evidence[s]!)}`} target="_blank" rel="noreferrer">
                          {SURFACE_LABEL[s]}
                        </a>
                      ))}
                      {r.snapshotPath && (
                        <a href={`/portal/${client.id}/snapshot?path=${encodeURIComponent(r.snapshotPath)}`} target="_blank" rel="noreferrer">
                          First citation
                        </a>
                      )}
                    </div>
                    {!r.snapshotPath && !SURFACES.some((s) => r.evidence[s]) && <Dim>—</Dim>}
                  </Td>
                  <Td>
                    {r.cited && r.firstSeen ? (
                      <ShareCard
                        label="Card"
                        card={{
                          clientName: client.name,
                          query: r.query,
                          url: r.citedUrl,
                          position: r.sourcePosition,
                          total: r.sourceCount,
                          organicRank: r.organicRank,
                          offTop10: r.offTop10,
                          firstSeen: r.firstSeen,
                        }}
                      />
                    ) : null}
                  </Td>
                </tr>
              );
            })
          ) : (
            <tr>
              <Td className="text-muted">No queries match this filter.</Td>
            </tr>
          )}
        </tbody>
      </TableWrap>
      <p className="mt-3.5 max-w-[70ch] text-[13.5px] text-muted">
        How a citation counts: one frozen query where a {client.name} page appears among the AI answer’s sources at least once during the
        60-day window, on AI Overview or AI Mode. Seeing the same query again does not add to the count. “Days cited: N of M” counts the days
        on which that query had an AI answer; days with no AI answer are not a lost citation and are left out of M. Organic rank is recorded only
        for cited queries. Click a query to see it day by day.
      </p>
    </div>
  );
}
