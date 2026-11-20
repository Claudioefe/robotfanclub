import Link from "next/link";
import { notFound } from "next/navigation";
import { RunDots, RunDotsLegend } from "@/components/citations/RunDots";
import { Badge, Dim, Eyebrow, PageHeader, Panel, Stat, TableWrap, Td, Th } from "@/components/ui";
import { fmtDate, fmtPct } from "@/lib/format";
import { SURFACES, getCitations, getClient, getLlmRuns } from "@/lib/portal/data";

// ChatGPT, informational (D-048). Not part of the citation SLA: ChatGPT changes its answer from one run to the next, so one run
// is never evidence. The page shows how many runs cited the client and puts Google's SLA reading next to it.

export default async function ChatGptPage({ params }: PageProps<"/portal/[clientId]/chatgpt">) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();
  const cit = await getCitations(client);
  const frozen = cit?.rows.map((r) => r.query) ?? [];
  const data = await getLlmRuns(client, frozen);
  const googleBy = new Map((cit?.rows ?? []).map((r) => [r.query, r]));

  const header = (
    <PageHeader
      eyebrow="Informational · not part of the SLA"
      title="ChatGPT"
      sub={`How ChatGPT answers the frozen queries with web search on (US, English). ChatGPT changes its answer from one run to the next, so each query shows how many runs cited ${client.name}. None of this counts toward the citation SLA.`}
    />
  );

  if (!data || !data.rows.some((r) => r.runs.length)) {
    return (
      <>
        {header}
        <p className="mt-6 max-w-[60ch] text-muted">No ChatGPT runs stored for this client yet.</p>
      </>
    );
  }

  const { totals, preferred } = data;
  return (
    <div data-wide>
      {header}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Queries where ChatGPT cited you" value={totals.queriesCited} unit={`of ${totals.measuredQueries} measured`} note={`${totals.frozenQueries} frozen queries in total`} />
        <Stat label="Only consulted, not cited" value={totals.queriesConsultedOnly} unit="queries" note="ChatGPT read a page of yours but did not list it as a source" />
        <Stat label="Runs that cited you" value={totals.runsCited} unit={`of ${totals.runs}`} note={totals.runs ? `${fmtPct(totals.runsCited / totals.runs)} of all runs` : undefined} />
      </div>

      {preferred.length > 0 && (
        <Panel className="mt-3">
          <Eyebrow>Sites ChatGPT cites most</Eyebrow>
          <p className="mt-2 flex flex-wrap gap-2">
            {preferred.map((p) => (
              <span key={p.domain} className="rounded-full border border-line px-3 py-1 text-[13px]">
                {p.domain} <span className="text-muted">· {p.queries} of {totals.measuredQueries} queries</span>
              </span>
            ))}
          </p>
        </Panel>
      )}

      <div className="mb-2.5 mt-6">
        <RunDotsLegend />
      </div>
      <TableWrap minWidth={1080}>
        <thead>
          <tr>
            <Th>Query</Th>
            <Th>Runs</Th>
            <Th>ChatGPT</Th>
            <Th>Google (SLA)</Th>
            <Th>ChatGPT cites instead</Th>
            <Th>Last run</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => {
            const g = googleBy.get(r.query);
            const rate = g ? SURFACES.reduce((n, s) => n + g.surfaces[s].checksCited, 0) / (SURFACES.reduce((n, s) => n + g.surfaces[s].checksWithAi, 0) || NaN) : NaN;
            return (
              <tr key={r.query}>
                <Td className="min-w-[220px] font-medium">
                  {r.runs.length ? (
                    <Link href={`/portal/${client.id}/chatgpt/query?q=${encodeURIComponent(r.query)}`} className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                      {r.query}
                    </Link>
                  ) : (
                    r.query
                  )}
                  {!r.frozen && <p className="mt-0.5 text-[12.5px] font-normal text-muted">extra query, not in the frozen list</p>}
                </Td>
                <Td>
                  <RunDots runs={r.runs} summary={`${r.cited} of ${r.runs.length} runs cited, ${r.consulted} consulted only`} />
                </Td>
                <Td className="whitespace-nowrap">
                  {r.runs.length ? (
                    <>
                      <span className={r.cited ? "font-semibold text-accent" : ""}>{r.cited} of {r.runs.length} {r.runs.length === 1 ? "run" : "runs"}</span>
                      {r.consulted > 0 && <p className="mt-0.5 text-[12.5px] text-muted">+ {r.consulted} consulted only</p>}
                    </>
                  ) : (
                    <Dim>Not measured</Dim>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {g ? (
                    <>
                      {g.cited ? <Badge kind={g.offTop10 ? "off" : "top"}>Cited</Badge> : <Badge kind="bad">Not cited</Badge>}
                      <p className="mt-1 text-[12.5px] text-muted">{Number.isNaN(rate) ? "no AI answer yet" : `${fmtPct(rate)} citation rate`}</p>
                    </>
                  ) : (
                    <Dim>—</Dim>
                  )}
                </Td>
                <Td>{r.topOthers.length ? r.topOthers.map((o) => o.domain).join(", ") : <Dim>—</Dim>}</Td>
                <Td className="whitespace-nowrap">{r.lastRunOn ? fmtDate(r.lastRunOn) : <Dim>—</Dim>}</Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      <p className="mt-3.5 max-w-[70ch] text-[13.5px] text-muted">
        “Cited” means {client.name} is among the sources ChatGPT lists in its answer. “Consulted” means ChatGPT read one of its pages while searching but did not list
        it. A run is one answer; with only one or two runs per query these numbers show where something appears, not a rate. Click a query to see every run.
      </p>
    </div>
  );
}
