import { notFound } from "next/navigation";
import { CruxTrend } from "@/components/CruxTrend";
import { TagBouncer } from "@/components/TagBouncer";
import { Trend } from "@/components/Trend";
import { Lede, Meter, PageHeader, Panel, Section, TableWrap, Td, Th } from "@/components/ui";
import { fmtDate, fmtInt, fmtPct } from "@/lib/format";
import { getClient, getSpeed } from "@/lib/portal/data";
import { MIN_INP_SAMPLE, SLA, cruxWindows } from "@/lib/sla";

export default async function Speed({ params }: PageProps<"/portal/[clientId]/speed">) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();
  const speed = await getSpeed(client);

  const cruxPoints = speed.crux.origin?.points ?? [];
  const cruxNow = cruxPoints.length ? cruxPoints[cruxPoints.length - 1] : null;
  // Real-visitor data wins. Without the snippet, Google's field data is the headline (and says so).
  const fromCrux = !speed.headline && cruxNow !== null;
  const now = speed.headline ? Math.round(speed.headline.p75) : (cruxNow?.inpMs ?? null);
  const windows = client.inp_sprint_deployed_on ? cruxWindows(client.inp_sprint_deployed_on) : [];

  let lede2: string | undefined;
  if (fromCrux && cruxNow) {
    lede2 = `From Google’s Chrome UX Report, 28 days to ${fmtDate(cruxNow.periodEnd)}. ${now! > SLA.inpGoalMs ? `${now! - SLA.inpGoalMs} ms left to reach the goal.` : "At or below the goal."}`;
  } else if (now !== null) {
    const before =
      client.inp_baseline_ms && client.inp_sprint_deployed_on
        ? `Down from ${client.inp_baseline_ms} ms before the sprint shipped on ${fmtDate(client.inp_sprint_deployed_on)}. `
        : "";
    lede2 = `${before}${now > SLA.inpGoalMs ? `${now - SLA.inpGoalMs} ms left to reach the goal.` : "At or below the goal."}`;
  }

  return (
    <>
      <PageHeader
        title="Speed: Interaction to Next Paint"
        sub={`${fromCrux ? "Google’s field data for mobile Chrome users" : "Real visitors on mobile"}, 75th percentile. Goal: ${SLA.inpGoalMs} ms or less.`}
      />
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
        note="Chrome UX Report: mobile Chrome users, 28-day windows, updated by Google every day. The SLA is judged on two full windows after the sprint ships, so a verdict takes about eight weeks. This data covers visitors worldwide, not only the US."
      >
        {cruxPoints.length > 0 ? (
          <>
            <CruxTrend points={cruxPoints} deployedOn={client.inp_sprint_deployed_on} />
            <p className="mt-2.5 text-sm text-muted">
              {speed.crux.origin!.target} · {cruxNow!.inpMs} ms
              {cruxNow!.goodShare !== null ? `, ${fmtPct(cruxNow!.goodShare)} of page loads at 200 ms or less` : ""} in the 28 days to {fmtDate(cruxNow!.periodEnd)}.
            </p>
          </>
        ) : (
          <p className="text-muted">No Chrome UX Report data yet. Google only publishes it for sites with enough Chrome traffic.</p>
        )}

        {speed.crux.urls.length > 0 && (
          <div className="mt-4">
            <TableWrap minWidth={560}>
              <thead>
                <tr>
                  <Th>Page</Th>
                  <Th>p75</Th>
                  <Th>At 200 ms or less</Th>
                  <Th>28 days to</Th>
                </tr>
              </thead>
              <tbody>
                {speed.crux.urls.map((u) => (
                  <tr key={u.target}>
                    <Td className="min-w-[220px] break-all font-medium">{u.target.replace(/^https?:\/\//, "")}</Td>
                    <Td>{u.inpMs} ms</Td>
                    <Td>{u.goodShare === null ? "—" : fmtPct(u.goodShare)}</Td>
                    <Td>{fmtDate(u.periodEnd)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        )}

        {windows.length ? (
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] gap-4">
            {windows.map((w) => {
              // Google's window ends two days behind, so the reading that closes our window carries its end date.
              const reading = cruxPoints.find((p) => p.periodEnd === w.end);
              return (
                <Panel key={w.index}>
                  <h3 className="text-[17px] font-semibold">Window {w.index}</h3>
                  <p className="mt-1.5">
                    {fmtDate(w.start)} to {fmtDate(w.end)}.{" "}
                    {w.state === "not_started" ? "Not started." : w.state === "closed" ? "Closed." : `${w.daysCollected} of 28 days collected.`}
                  </p>
                  <Meter value={(w.daysCollected / 28) * 100} tone="cite" />
                  {reading ? (
                    <p className={`text-sm font-medium ${reading.inpMs <= SLA.inpGoalMs ? "text-off" : "text-bad"}`}>
                      Google’s value: {reading.inpMs} ms. {reading.inpMs <= SLA.inpGoalMs ? "Meets the goal." : "Above the goal."}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">
                      {w.state === "closed"
                        ? "Google publishes the value about two days after the window closes."
                        : w.index === 1
                          ? "Google publishes the value after the window closes."
                          : `Both windows must be at ${SLA.inpGoalMs} ms or less for the SLA.`}
                    </p>
                  )}
                </Panel>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-muted">The sprint deploy date has not been set yet, so the CrUX windows are not counted.</p>
        )}
      </Section>

      <Section title="Tag Bouncer" note="Third-party scripts that block interactions. Choose what happens to each; the estimate below updates.">
        <TagBouncer scripts={speed.scripts} currentInpMs={now} />
      </Section>
    </>
  );
}
