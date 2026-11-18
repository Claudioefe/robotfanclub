import Link from "next/link";
import { notFound } from "next/navigation";
import { Ruler } from "@/components/Ruler";
import { ShareCard } from "@/components/ShareCard";
import { Lede, Meter, PageHeader, Panel, Section, Status } from "@/components/ui";
import { fmtDate, fmtPct } from "@/lib/format";
import { getCitations, getClient, getSpeed } from "@/lib/portal/data";
import { MIN_INP_SAMPLE, SLA, citationRate, cruxWindows, projectCitations, share, slaStatus } from "@/lib/sla";

export default async function Overview({ params }: PageProps<"/portal/[clientId]">) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();

  const [cit, speed] = await Promise.all([getCitations(client), getSpeed(client)]);

  if (!cit) {
    return (
      <>
        <PageHeader title={client.name} />
        <p className="mt-6 text-muted">No frozen query list yet. Once staff freezes one, citations show up here.</p>
      </>
    );
  }

  const projected = projectCitations(cit.cited, cit.day);
  const status = slaStatus({ cited: cit.cited, day: cit.day, feeUsd: client.service_fee_usd });
  const offShare = share(cit.offTop10, cit.cited);
  const meetsOff = offShare >= SLA.offTop10Share;
  const rate = citationRate(cit.rate.checksCited, cit.rate.checksWithAi);
  const win1 = client.inp_sprint_deployed_on ? cruxWindows(client.inp_sprint_deployed_on)[0] : null;

  return (
    <>
      <PageHeader
        title={client.name}
        sub={`AIO Pro and INP Sprint. Day ${cit.day} of ${SLA.windowDays}. Query list frozen until ${fmtDate(cit.frozenUntil)}.`}
      />
      <Lede
        big={`${cit.cited} citations in ${cit.day} days.`}
        small={`At this pace, about ${projected} by day ${SLA.windowDays}. Solid bar is confirmed, hatched is projected.`}
      />
      <Ruler cited={cit.cited} projected={projected} />
      <Status tone={status.tone}>{status.text}</Status>

      <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] gap-4">
        <Panel>
          <h2 className="text-[17px] font-semibold">Citations from pages outside the top 10</h2>
          <p className="mt-1.5">
            {cit.offTop10} of {cit.cited}, or {fmtPct(offShare)}. The SLA asks for at least {SLA.offTop10Share * 100}%.
          </p>
          <Meter value={offShare * 100} mark={SLA.offTop10Share * 100} />
          <Status tone={meetsOff ? "good" : "bad"} className="!text-sm">
            {meetsOff ? "Meeting the share goal." : "Below the share goal."}
          </Status>
        </Panel>

        <Panel>
          <h2 className="text-[17px] font-semibold">Citation rate</h2>
          <p className="mt-1.5">
            <strong>{fmtPct(rate)}</strong> of checks with an AI answer cited {client.name}.
          </p>
          <Meter value={rate * 100} tone="cite" />
          <p className="text-sm text-muted">
            {cit.rate.checksCited} of {cit.rate.checksWithAi} checks with an AI answer, across AI Overview and AI Mode.
          </p>
        </Panel>

        <Panel>
          <h2 className="text-[17px] font-semibold">Mobile INP, 75th percentile</h2>
          {speed.headline ? (
            <>
              <p className="mt-1.5">
                <strong>{Math.round(speed.headline.p75)} ms</strong> against a {SLA.inpGoalMs} ms goal
                {client.inp_baseline_ms ? `, down from ${client.inp_baseline_ms} ms before the sprint.` : "."}
              </p>
              {speed.headline.interactions < MIN_INP_SAMPLE && (
                <p className="mt-1.5 text-sm text-muted">Preview: only {speed.headline.interactions} interactions so far.</p>
              )}
              {win1 && (
                <>
                  <Meter value={(win1.daysCollected / 28) * 100} tone="cite" />
                  <p className="text-sm">
                    First Google field-data window: {win1.daysCollected} of 28 days. Closes {fmtDate(win1.end)}.
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-muted">No real-visitor data yet.</p>
          )}
          <p className="mt-1.5 text-sm">
            <Link href={`/portal/${client.id}/speed`}>See speed details</Link>
          </p>
        </Panel>
      </div>

      <Section title="Newest citations" note="Each card can be shared to your Slack channel as is.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3.5">
          {cit.newest.map((card) => (
            <div key={card.query} className="flex flex-col">
              <ShareCard showCard card={{ ...card, url: card.url, clientName: client.name }} />
            </div>
          ))}
          {!cit.newest.length && <p className="text-muted">No citations yet in this window.</p>}
        </div>
      </Section>
    </>
  );
}
