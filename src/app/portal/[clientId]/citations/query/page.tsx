import Link from "next/link";
import { notFound } from "next/navigation";
import { STATE_LABEL } from "@/components/citations/Strip";
import { Badge, Dim, Eyebrow, PageHeader, Panel, TableWrap, Td, Th } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { SURFACES, SURFACE_LABEL, getCitations, getClient, getQueryHistory, type DayDetail, type SurfaceDay } from "@/lib/portal/data";

// One frozen query, day by day: what each AI surface showed, who else was cited, and the raw evidence of every check.

function SurfaceCell({ clientId, d }: { clientId: string; d: SurfaceDay }) {
  if (d.state === "unchecked") return <Dim>Not checked</Dim>;
  if (d.state === "no_ai") return <Dim>No AI answer</Dim>;
  return (
    <div className="flex flex-col items-start gap-1">
      {d.state === "cited" ? (
        d.offTop10 ? <Badge kind="off">Cited · outside top 10</Badge> : <Badge kind="top">Cited · top 10 page</Badge>
      ) : (
        <Badge kind="bad">{STATE_LABEL.gap}</Badge>
      )}
      {d.state === "cited" && d.position !== null && (
        <span className="text-[13px] text-muted">
          source {d.position} of {d.sourceCount ?? "?"}
          {d.organicRank !== null && <> · organic rank {d.organicRank}</>}
        </span>
      )}
      {d.snapshotPath && (
        <a href={`/portal/${clientId}/snapshot?path=${encodeURIComponent(d.snapshotPath)}`} target="_blank" rel="noreferrer" className="text-[13px]">
          Evidence
        </a>
      )}
    </div>
  );
}

export default async function QueryHistoryPage({ params, searchParams }: PageProps<"/portal/[clientId]/citations/query">) {
  const [{ clientId }, sp] = await Promise.all([params, searchParams]);
  const client = await getClient(clientId);
  if (!client) notFound();
  const query = typeof sp.q === "string" ? sp.q : "";
  const cit = await getCitations(client);
  const row = cit?.rows.find((r) => r.query === query);
  if (!cit || !row) notFound();

  const days: DayDetail[] = await getQueryHistory(client, query, cit);
  const withAi = days.filter((d) => d.state === "cited" || d.state === "gap").length;
  const cited = days.filter((d) => d.state === "cited").length;
  const checked = days.filter((d) => d.state !== "unchecked").length;

  return (
    <div data-wide>
      <p className="mb-4 text-sm">
        <Link href={`/portal/${client.id}/citations`}>← AI citations</Link>
      </p>
      <PageHeader
        eyebrow="AI citations · one query"
        title={query}
        sub={`Frozen query, checked daily in Google AI Overviews and AI Mode (US, English, mobile). Window: ${fmtDate(cit.frozenFrom)} to ${fmtDate(cit.frozenUntil)}.`}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Panel>
          <Eyebrow>Days cited</Eyebrow>
          <p className="mt-2 font-display text-[34px] font-bold leading-none">
            {cited}
            <span className="ml-1.5 text-base font-medium text-muted">of {withAi} days with an AI answer</span>
          </p>
        </Panel>
        <Panel>
          <Eyebrow>Counts for the SLA</Eyebrow>
          <p className="mt-2 font-display text-[34px] font-bold leading-none">{row.cited ? "Yes" : "Not yet"}</p>
          <p className="mt-2 text-sm text-muted">{row.firstSeen ? `First cited ${fmtDate(row.firstSeen)}` : "Needs one citation in the window"}</p>
        </Panel>
        <Panel>
          <Eyebrow>Days checked</Eyebrow>
          <p className="mt-2 font-display text-[34px] font-bold leading-none">
            {checked}
            <span className="ml-1.5 text-base font-medium text-muted">of {days.length}</span>
          </p>
        </Panel>
      </div>

      <div className="mt-6">
        <TableWrap minWidth={900}>
          <thead>
            <tr>
              <Th>Day</Th>
              {SURFACES.map((s) => (
                <Th key={s}>{SURFACE_LABEL[s]}</Th>
              ))}
              <Th>Other sources cited</Th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const others = [...new Set(SURFACES.flatMap((s) => d.surfaces[s].otherDomains))];
              return (
                <tr key={d.day} className={d.state === "unchecked" ? "opacity-60" : ""}>
                  <Td className="whitespace-nowrap font-medium">{fmtDate(d.day)}</Td>
                  {SURFACES.map((s) => (
                    <Td key={s}>
                      <SurfaceCell clientId={client.id} d={d.surfaces[s]} />
                    </Td>
                  ))}
                  <Td>{others.length ? others.join(", ") : <Dim>None</Dim>}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </div>
      <p className="mt-3.5 max-w-[70ch] text-[13.5px] text-muted">
        Each “Evidence” link opens the raw response stored for that check, including that day’s organic top 10. A day with no AI answer is not a lost
        citation: Google simply showed none. A day with no stored check shows as “Not checked”.
      </p>
    </div>
  );
}
