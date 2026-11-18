import { Dim, PageHeader, Panel, Section, TableWrap, Td, Th } from "@/components/ui";
import { requireStaffPage } from "@/lib/admin/guard";
import { getCosts } from "@/lib/admin/ops";
import { fmtDate, fmtInt } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;

export default async function Costs() {
  await requireStaffPage();
  const result = await getCosts(createAdminClient(), 30);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Costs" />
        <p className="mt-6 text-bad">{result.error}</p>
      </>
    );
  }
  const { total, byClient, byDay, runs } = result.data!;

  return (
    <>
      <PageHeader title="Costs" sub="What the AI citation checks cost in DataForSEO, as reported on every check. Last 30 days." />

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
        <Panel>
          <p className="text-sm text-muted">Total, 30 days</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{usd(total)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-muted">Checks</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{fmtInt(byClient.reduce((s, c) => s + c.checks, 0))}</p>
        </Panel>
      </div>

      <Section title="By client">
        {byClient.length ? (
          <TableWrap minWidth={480}>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Checks</Th>
                <Th>Cost</Th>
              </tr>
            </thead>
            <tbody>
              {byClient.map((c) => (
                <tr key={c.clientId}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{fmtInt(c.checks)}</Td>
                  <Td>{usd(c.cost)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <p className="text-muted">No checks with a cost yet.</p>
        )}
      </Section>

      <Section title="By day">
        {byDay.length ? (
          <TableWrap minWidth={420}>
            <thead>
              <tr>
                <Th>Day</Th>
                <Th>Checks</Th>
                <Th>Cost</Th>
              </tr>
            </thead>
            <tbody>
              {byDay.slice(0, 31).map((d) => (
                <tr key={d.day}>
                  <Td>{fmtDate(d.day)}</Td>
                  <Td>{fmtInt(d.checks)}</Td>
                  <Td>{usd(d.cost)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <p className="text-muted">Nothing yet.</p>
        )}
      </Section>

      <Section title="Latest watcher runs" note="One row per run. A run that stopped early or had failures shows its error count.">
        {runs.length ? (
          <TableWrap minWidth={640}>
            <thead>
              <tr>
                <Th>Started</Th>
                <Th>Mode</Th>
                <Th>Checks written</Th>
                <Th>Queries ok</Th>
                <Th>Failed</Th>
                <Th>Cost</Th>
                <Th>Errors</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <Td>{fmtDate(r.startedAt)}</Td>
                  <Td>{r.mode === "live" ? "live" : "dry-run"}</Td>
                  <Td>{r.checks}</Td>
                  <Td>{r.ok}</Td>
                  <Td>{r.failed || <Dim>0</Dim>}</Td>
                  <Td>{usd(r.cost)}</Td>
                  <Td>{r.errors || <Dim>0</Dim>}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <p className="text-muted">The watcher has not run yet.</p>
        )}
      </Section>
    </>
  );
}
