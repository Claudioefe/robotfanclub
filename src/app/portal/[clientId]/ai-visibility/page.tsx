import { notFound } from "next/navigation";
import { Badge, Dim, Lede, PageHeader, Panel, Section, TableWrap, Td, Th } from "@/components/ui";
import { PLATFORM_LABEL, competitors, coverage, daysAgo, freshness, questionRows, type QuestionRow } from "@/lib/ai-visibility";
import { fmtDate, fmtInt } from "@/lib/format";
import { getAiVisibility, getClient } from "@/lib/portal/data";
import { todayUtc } from "@/lib/sla";

function PlatformCell({ p }: { p: QuestionRow["platforms"][number] | undefined }) {
  if (!p) return <Dim>Not in this sample</Dim>;
  if (p.relation === "consulted") return <Badge kind="bad">Read, not cited</Badge>;
  return (
    <span className="whitespace-nowrap">
      <Badge kind="off">Cited</Badge> <Dim>{p.rank !== null ? `source ${p.rank} of ${p.sourceCount}` : ""}</Dim>
    </span>
  );
}

export default async function AiVisibility({ params }: PageProps<"/portal/[clientId]/ai-visibility">) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();
  const { runs, mentions } = await getAiVisibility(client.id);
  const today = todayUtc();

  if (!runs.length) {
    return (
      <>
        <PageHeader eyebrow="Informational" title="AI visibility" sub={`Where AI answers already mention ${client.domain}. Informational: it does not count toward the citation guarantee.`} />
        <Lede big="No data yet." small="The first read runs weekly. It will show up here as soon as it is stored." />
      </>
    );
  }

  const [google, chat] = coverage(runs, mentions);
  const rows = questionRows(mentions);
  const fresh = freshness(mentions);
  const captured = [google.capturedOn, chat.capturedOn].filter((d): d is string => Boolean(d)).sort().pop() as string;
  const rivals = competitors(mentions);

  return (
    <>
      <PageHeader
        eyebrow="Informational"
        title="AI visibility"
        sub={`Where AI answers already mention ${client.domain}. Informational: it does not count toward the citation guarantee.`}
      />
      <Lede
        big={`${fmtInt(google.total)} Google and ${fmtInt(chat.total)} ChatGPT answers mention ${client.domain}.`}
        small={`From DataForSEO’s database of recorded AI answers, read on ${fmtDate(captured)}.`}
      />
      <p className="mt-4 max-w-[64ch] rounded-lg border border-line bg-cite-soft px-3.5 py-2.5 text-sm">
        This is a snapshot, not a live measurement. {fresh.newest && fresh.oldest ? `The answers behind it were recorded between ${fmtDate(fresh.oldest)} and ${fmtDate(fresh.newest)} (the newest ${daysAgo(fresh.newest, today)} days ago). ` : ""}
        The citation guarantee is measured separately, daily, on Google only.
      </p>

      <Section title="By platform" note="How many recorded AI answers mention the domain, and how many of the top ones (by AI search volume) cite it.">
        <div className="grid gap-4 sm:grid-cols-2">
          {[google, chat].map((c) => (
            <Panel key={c.platform}>
              <h3 className="font-semibold">{PLATFORM_LABEL[c.platform]}</h3>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{fmtInt(c.total)}</p>
              <p className="text-sm text-muted">answers mention the domain</p>
              <p className="mt-3 text-sm">
                Top {c.shown} by search volume: <strong>{c.cited}</strong> cite it
                {c.consulted > 0 && (
                  <>
                    , <strong>{c.consulted}</strong> read a page of it without citing it
                  </>
                )}
                .
              </p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section title="Top questions" note="Ordered by monthly searches of the question in AI products, as estimated by DataForSEO.">
        <TableWrap minWidth={760}>
          <thead>
            <tr>
              <Th>Question</Th>
              <Th>AI searches / month</Th>
              <Th>Google AI Overview</Th>
              <Th>ChatGPT</Th>
              <Th>Last recorded</Th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 25).map((r) => {
              const last = r.platforms.map((p) => p.lastResponseAt).filter((d): d is string => Boolean(d)).sort().pop();
              return (
                <tr key={r.question}>
                  <Td className="min-w-[220px] font-medium">{r.question}</Td>
                  <Td>{r.volume === null ? "n/a" : fmtInt(r.volume)}</Td>
                  <Td>
                    <PlatformCell p={r.platforms.find((p) => p.platform === "google")} />
                  </Td>
                  <Td>
                    <PlatformCell p={r.platforms.find((p) => p.platform === "chat_gpt")} />
                  </Td>
                  <Td className="whitespace-nowrap">{last ? fmtDate(last) : "n/a"}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        {rows.length > 25 && <p className="mt-2 text-sm text-muted">Showing 25 of {rows.length} questions stored.</p>}
      </Section>

      {rivals.length > 0 && (
        <Section title="Cited next to you" note="Other sites that appear in the same recorded answers, by how many of them. Many are reference sites such as Wikipedia or YouTube, not competitors.">
          <TableWrap minWidth={420}>
            <thead>
              <tr>
                <Th>Site</Th>
                <Th>Answers</Th>
              </tr>
            </thead>
            <tbody>
              {rivals.map((c) => (
                <tr key={c.domain}>
                  <Td className="font-medium">{c.domain}</Td>
                  <Td>{c.answers}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Section>
      )}

      <Section title="How to read this">
        <ul className="max-w-[70ch] list-disc space-y-1.5 pl-5 text-[15px] text-muted">
          <li>
            <strong className="text-ink">Cited</strong> means the domain was among the sources of the recorded answer.{" "}
            <strong className="text-ink">Read, not cited</strong> means ChatGPT opened a page of the domain while answering but did not list it as a source.
          </li>
          <li>ChatGPT answers vary from one run to the next, and the sites it cites change a lot. One recorded answer is a sample, not a rate.</li>
          <li>These counts come from a database of answers recorded over time. They do not prove what a person sees today.</li>
        </ul>
      </Section>
    </>
  );
}
