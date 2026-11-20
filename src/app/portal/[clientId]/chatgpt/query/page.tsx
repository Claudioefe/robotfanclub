import Link from "next/link";
import { notFound } from "next/navigation";
import { RELATION_LABEL } from "@/components/citations/RunDots";
import { Badge, Dim, PageHeader, TableWrap, Td, Th } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { getCitations, getClient, getLlmRuns } from "@/lib/portal/data";

// One query, run by run: what ChatGPT answered each time, which client page it cited or read, and who else it cited.

export default async function ChatGptQueryPage({ params, searchParams }: PageProps<"/portal/[clientId]/chatgpt/query">) {
  const [{ clientId }, sp] = await Promise.all([params, searchParams]);
  const client = await getClient(clientId);
  if (!client) notFound();
  const query = typeof sp.q === "string" ? sp.q : "";
  const cit = await getCitations(client);
  const data = await getLlmRuns(client, cit?.rows.map((r) => r.query) ?? []);
  const row = data?.rows.find((r) => r.query === query);
  if (!row || !row.runs.length) notFound();

  const runs = row.runs.slice().reverse(); // newest first
  return (
    <div data-wide>
      <p className="mb-4 text-sm">
        <Link href={`/portal/${client.id}/chatgpt`}>← ChatGPT</Link>
      </p>
      <PageHeader
        eyebrow="ChatGPT · one query · informational"
        title={query}
        sub={`${row.cited} of ${row.runs.length} ${row.runs.length === 1 ? "run" : "runs"} cited ${client.name}${row.consulted ? `, ${row.consulted} more read a page without citing it` : ""}. Web search on, US, English. Not part of the SLA.`}
      />
      <div className="mt-6">
        <TableWrap minWidth={980}>
          <thead>
            <tr>
              <Th>Run</Th>
              <Th>Result</Th>
              <Th>Client page</Th>
              <Th>Sources cited · pages read</Th>
              <Th>Other sources cited</Th>
              <Th>Evidence</Th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.snapshotPath}>
                <Td className="whitespace-nowrap font-medium">
                  {fmtDate(r.runOn)}
                  <p className="mt-0.5 text-[12.5px] font-normal text-muted">{r.runAt.slice(11, 16)} UTC</p>
                </Td>
                <Td>
                  {r.relation === "cited" ? <Badge kind="top">Cited · source {r.clientSourceRank} of {r.sourceCount}</Badge> : r.relation === "consulted" ? <Badge kind="off">{RELATION_LABEL.consulted}</Badge> : <Dim>{RELATION_LABEL.none}</Dim>}
                </Td>
                <Td className="max-w-[280px] break-words">
                  {r.clientUrl ? (
                    <a href={r.clientUrl} target="_blank" rel="noreferrer">
                      {r.clientUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
                    </a>
                  ) : (
                    <Dim>—</Dim>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{r.sourceCount} · {r.consultedCount}</Td>
                <Td>{r.otherDomains.length ? r.otherDomains.join(", ") : <Dim>None</Dim>}</Td>
                <Td>
                  <a href={`/portal/${client.id}/snapshot?path=${encodeURIComponent(r.snapshotPath)}`} target="_blank" rel="noreferrer">
                    Raw answer
                  </a>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>
      <p className="mt-3.5 max-w-[70ch] text-[13.5px] text-muted">
        “Raw answer” opens the full response stored for that run: the answer text, every source it cited and every page it read. ChatGPT answers differently each time, so
        compare runs rather than reading one.
      </p>
    </div>
  );
}
