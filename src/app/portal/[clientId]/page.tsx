import Link from "next/link";
import { notFound } from "next/navigation";
import { Ruler } from "@/components/Ruler";
import { ShareCard } from "@/components/ShareCard";
import { Eyebrow, Lede, Meter, PageHeader, Panel, Section, Stat, Status } from "@/components/ui";
import { fmtDate, fmtPct } from "@/lib/format";
import { getCitations, getClient, getSpeed } from "@/lib/portal/data";
import { MIN_INP_SAMPLE, SLA, canProject, citationRate, cruxWindows, projectCitations, share, slaStatus } from "@/lib/sla";

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

  const early = !canProject(cit.day); // first week: no projection yet
  const projected = early ? cit.cited : projectCitations(cit.cited, cit.day);
  const status = slaStatus({ cited: cit.cited, day: cit.day, feeUsd: client.service_fee_usd });
  const offShare = share(cit.offTop10, cit.cited);
  const meetsOff = offShare >= SLA.offTop10Share;
  const rate = citationRate(cit.rate.checksCited, cit.rate.checksWithAi);
  const win1 = client.inp_sprint_deployed_on ? cruxWindows(client.inp_sprint_deployed_on)[0] : null;

  const lastCrux = speed.crux.origin?.points[speed.crux.origin.points.length - 1];

  return (
    <>
      <PageHeader
        eyebrow="AIO Pro + INP Sprint"
        title={client.name}
        sub={`Day ${cit.day} of ${SLA.windowDays}. Query list frozen until ${fmtDate(cit.frozenUntil)}.`}
      />

      <Panel className="mt-6 pb-6">
        <Eyebrow>Citations so far</Eyebrow>
        <div className="-mt-4">
          <Lede
            big={`${cit.cited} ${cit.cited === 1 ? "citation" : "citations"} in ${cit.day} ${cit.day === 1 ? "day" : "days"}.`}
            small={
              early
                ? "The first week is too short to project from. The projection appears from day 7."
                : `At this pace, about ${projected} by day ${SLA.windowDays}. Solid bar is confirmed, hatched is projected.`
            }
          />
        </div>
        <Ruler cited={cit.cited} projected={projected} />
        <Status tone={status.tone}>{status.text}</Status>
      </Panel>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] gap-4">
        <Stat
          label="Outside the top 10"
          value={fmtPct(offShare)}
          note={`${cit.offTop10} of ${cit.cited} citations come from pages outside the top 10. The SLA asks for at least ${SLA.offTop10Share * 100}%.`}
        >
          <Meter value={offShare * 100} mark={SLA.offTop10Share * 100} />
          <Status tone={meetsOff ? "good" : "bad"} className="!text-sm">
            {meetsOff ? "Meeting the share goal." : "Below the share goal."}
          </Status>
        </Stat>

        <Stat
          label="Citation rate"
          value={fmtPct(rate)}
          note={`${cit.rate.checksCited} of ${cit.rate.checksWithAi} checks with an AI answer cited ${client.name}, across AI Overview and AI Mode.`}
        >
          <Meter value={rate * 100} tone="cite" />
        </Stat>

        {speed.headline ? (
          <Stat
            label="Mobile INP · 75th percentile"
            value={Math.round(speed.headline.p75)}
            unit="ms"
            note={`Against a ${SLA.inpGoalMs} ms goal${client.inp_baseline_ms ? `, down from ${client.inp_baseline_ms} ms before the sprint.` : "."}${
              speed.headline.interactions < MIN_INP_SAMPLE ? ` Preview: only ${speed.headline.interactions} interactions so far.` : ""
            }`}
          >
            {win1 && (
              <>
                <Meter value={(win1.daysCollected / 28) * 100} tone="cite" />
                <p className="text-sm text-muted">
                  First Google field-data window: {win1.daysCollected} of 28 days. Closes {fmtDate(win1.end)}.
                </p>
              </>
            )}
            <p className="mt-auto pt-3 text-sm">
              <Link href={`/portal/${client.id}/speed`}>See speed details →</Link>
            </p>
          </Stat>
        ) : lastCrux ? (
          <Stat
            label="Mobile INP · 75th percentile"
            value={lastCrux.inpMs}
            unit="ms"
            note={`Against a ${SLA.inpGoalMs} ms goal, from Google’s field data (28 days to ${fmtDate(lastCrux.periodEnd)}).`}
          >
            <p className="mt-auto pt-3 text-sm">
              <Link href={`/portal/${client.id}/speed`}>See speed details →</Link>
            </p>
          </Stat>
        ) : (
          <Stat label="Mobile INP · 75th percentile" value="—" note="No speed data yet." />
        )}
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
