import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareCard } from "@/components/ShareCard";
import { Badge, Dim, PageHeader, TableWrap, Td, Th } from "@/components/ui";
import { fmtDate, fmtPct } from "@/lib/format";
import { SURFACES, SURFACE_LABEL, getCitations, getClient, type QueryRow, type Surface } from "@/lib/portal/data";
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
  `rounded-full border px-3 py-1.5 text-[13.5px] font-medium no-underline ${
    active ? "border-cite bg-cite-soft text-cite" : "border-line bg-surface text-muted"
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
        <PageHeader title="AI citations" />
        <p className="mt-6 text-muted">No frozen query list yet.</p>
      </>
    );
  }

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
    <>
      <PageHeader
        title="AI citations"
        sub={`${cit.rows.length} frozen queries, checked daily in Google AI Overviews and AI Mode (US). Window: ${fmtDate(cit.frozenFrom)} to ${fmtDate(cit.frozenUntil)}.`}
      />

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

      <TableWrap minWidth={980}>
        <thead>
          <tr>
            <Th>Query</Th>
            <Th>AI answer</Th>
            <Th>{client.name} cited</Th>
            <Th>Surfaces</Th>
            <Th>Organic rank</Th>
            <Th>Citation rate</Th>
            <Th>Other sources</Th>
            <Th>First seen</Th>
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
              return (
                <tr key={r.query}>
                  <Td className="min-w-[220px] font-medium">{r.query}</Td>
                  <Td>{ai ? "Yes" : <Dim>No</Dim>}</Td>
                  <Td>
                    {here ? (
                      r.offTop10 ? <Badge kind="off">Outside top 10</Badge> : <Badge kind="top">Top 10 page</Badge>
                    ) : ai ? (
                      <Badge kind="bad">Not cited</Badge>
                    ) : (
                      <Dim>No AI answer</Dim>
                    )}
                  </Td>
                  <Td>
                    {SURFACES.filter((s) => r.surfaces[s].cited).map((s) => SURFACE_LABEL[s]).join(", ") || <Dim>None</Dim>}
                  </Td>
                  <Td>{r.cited ? (r.organicRank ?? <Dim>Not in top 10</Dim>) : <Dim>—</Dim>}</Td>
                  <Td>{rate === null ? <Dim>—</Dim> : fmtPct(rate)}</Td>
                  <Td>{r.otherDomains.length ? r.otherDomains.join(", ") : <Dim>None</Dim>}</Td>
                  <Td>{r.firstSeen ? fmtDate(r.firstSeen) : ""}</Td>
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
        60-day window, on AI Overview or AI Mode. Seeing the same query again does not add to the count. Organic rank is recorded only
        for cited queries.
      </p>
    </>
  );
}
