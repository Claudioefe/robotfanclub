import { notFound } from "next/navigation";
import { TagBouncer } from "@/components/TagBouncer";
import { Trend } from "@/components/Trend";
import { Lede, Meter, PageHeader, Panel, Section, TableWrap, Td, Th } from "@/components/ui";
import { fmtDate, fmtInt } from "@/lib/format";
import { getClient, getSpeed } from "@/lib/portal/data";
import { MIN_INP_SAMPLE, SLA, cruxWindows } from "@/lib/sla";

export default async function Speed({ params }: PageProps<"/portal/[clientId]/speed">) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();
  const speed = await getSpeed(client);

  const now = speed.headline ? Math.round(speed.headline.p75) : null;
  const windows = client.inp_sprint_deployed_on ? cruxWindows(client.inp_sprint_deployed_on) : [];

  let lede2: string | undefined;
  if (now !== null) {
    const before =
      client.inp_baseline_ms && client.inp_sprint_deployed_on
        ? `Down from ${client.inp_baseline_ms} ms before the sprint shipped on ${fmtDate(client.inp_sprint_deployed_on)}. `
        : "";
    lede2 = `${before}${now > SLA.inpGoalMs ? `${now - SLA.inpGoalMs} ms left to reach the goal.` : "At or below the goal."}`;
  }

  return (
    <>
      <PageHeader title="Speed: Interaction to Next Paint" sub={`Real visitors on mobile, 75th percentile. Goal: ${SLA.inpGoalMs} ms or less.`} />
      <Lede big={now === null ? "No data yet." : `${now} ms on mobile.`} small={lede2} />
      {speed.headline && speed.headline.interactions < MIN_INP_SAMPLE && (
        <p className="mt-4 max-w-[64ch] rounded-lg border border-line bg-cite-soft px-3.5 py-2.5 text-sm">
          Based on only {speed.headline.interactions} {speed.headline.interactions === 1 ? "interaction" : "interactions"} in the last 28 days.
          A 75th percentile needs many more to be reliable, so treat this number as a preview.
        </p>
      )}

      <Section title="By page template" note="Red bars are over the 200 ms goal. Last 28 days.">
        {speed.templates.length ? (
          <TableWrap minWidth={640}>
            <thead>
              <tr>
                <Th>Template</Th>
                <Th>p75</Th>
                <Th>Interactions, 28 days</Th>
                <Th>0 to 400 ms, dashed line at 200</Th>
              </tr>
            </thead>
            <tbody>
              {speed.templates.map((t) => (
                <tr key={t.template}>
                  <Td className="min-w-[160px] font-medium">{t.template}</Td>
                  <Td>{Math.round(t.p75)} ms</Td>
                  <Td>{fmtInt(t.interactions)}</Td>
                  <Td className="w-[44%]">
                    <div className="relative h-3 min-w-40 rounded-sm border border-line bg-code" aria-hidden="true">
                      <i
                        className={`absolute inset-y-0 left-0 rounded-sm ${t.p75 > SLA.inpGoalMs ? "bg-bad" : "bg-off"}`}
                        style={{ width: `${Math.min(100, (t.p75 / 400) * 100)}%` }}
                      />
                      <b className="absolute -inset-y-1 left-1/2 border-l-2 border-dashed border-ink" />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <p className="text-muted">No real-visitor data yet. Install the snippet from Setup.</p>
        )}
      </Section>

      <Section title="Last 28 days" note="Daily p75 from real visitors.">
        <Trend daily={speed.daily} deployedOn={client.inp_sprint_deployed_on} />
      </Section>

      <Section
        title="Google’s field data"
        note="The SLA is judged on two full 28-day Chrome UX Report windows after the sprint ships, so a verdict takes about eight weeks."
      >
        {windows.length ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] gap-4">
            {windows.map((w) => (
              <Panel key={w.index}>
                <h3 className="text-[17px] font-semibold">Window {w.index}</h3>
                <p className="mt-1.5">
                  {fmtDate(w.start)} to {fmtDate(w.end)}.{" "}
                  {w.state === "not_started" ? "Not started." : w.state === "closed" ? "Closed." : `${w.daysCollected} of 28 days collected.`}
                </p>
                <Meter value={(w.daysCollected / 28) * 100} tone="cite" />
                <p className="text-sm text-muted">
                  {w.index === 1 ? "Google publishes the value after the window closes." : `Both windows must be at ${SLA.inpGoalMs} ms or less for the SLA.`}
                </p>
              </Panel>
            ))}
          </div>
        ) : (
          <p className="text-muted">The sprint deploy date has not been set yet, so the CrUX windows are not counted.</p>
        )}
        {speed.cruxReadings.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Latest published CrUX reading:{" "}
            {speed.cruxReadings.map((c) => `${c.inpMs ?? "n/a"} ms (28 days to ${fmtDate(c.periodEnd)})`)[0]}.
          </p>
        )}
      </Section>

      <Section title="Tag Bouncer" note="Third-party scripts that block interactions. Choose what happens to each; the estimate below updates.">
        <TagBouncer scripts={speed.scripts} currentInpMs={now} />
      </Section>
    </>
  );
}
