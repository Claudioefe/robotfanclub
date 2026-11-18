import Link from "next/link";
import { createClientAction } from "./actions";
import { ActionForm, Field, inputClass } from "@/components/admin/forms";
import { Badge, Dim, PageHeader, Panel, Section, TableWrap, Td, Th } from "@/components/ui";
import { requireStaffPage } from "@/lib/admin/guard";
import { listClientsAdmin, listWindows } from "@/lib/admin/ops";
import { fmtDate } from "@/lib/format";
import { WEEKLY_SCAN_CAP, scanMode } from "@/lib/miniscan/core";
import { listRecentScans } from "@/lib/miniscan/ops";
import { todayUtc } from "@/lib/sla";
import { createAdminClient } from "@/lib/supabase/admin";

const KIND_BADGE = { real: "off", demo: "top", sandbox: "bad" } as const;

export default async function AdminHome() {
  await requireStaffPage();
  const sb = createAdminClient();
  const clients = await listClientsAdmin(sb);
  const today = todayUtc();
  const windows = await Promise.all(clients.map((c) => listWindows(sb, c.id)));
  const scans = await listRecentScans(sb);
  const mode = scanMode(process.env.MINI_SCAN_MODE);

  return (
    <>
      <PageHeader title="Clients" sub="Everything here is staff only. Clients see their own portal, read-only." />

      <Section title="All clients">
        <TableWrap minWidth={720}>
          <thead>
            <tr>
              <Th>Client</Th>
              <Th>Kind</Th>
              <Th>Fee</Th>
              <Th>Query window</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => {
              const active = windows[i].find((w) => w.from <= today && today <= w.until);
              const upcoming = windows[i].find((w) => w.from > today);
              return (
                <tr key={c.id}>
                  <Td className="min-w-[220px] font-medium">
                    <Link href={`/admin/clients/${c.id}`}>{c.name}</Link> <span className="text-sm font-normal text-muted">{c.domain}</span>
                  </Td>
                  <Td>
                    <Badge kind={KIND_BADGE[c.kind]}>{c.kind}</Badge>
                  </Td>
                  <Td>{c.serviceFeeUsd ? `$${c.serviceFeeUsd.toLocaleString("en-US")}` : <Dim>—</Dim>}</Td>
                  <Td>
                    {active ? (
                      `${active.queries.length} queries, ${fmtDate(active.from)} to ${fmtDate(active.until)}`
                    ) : upcoming ? (
                      `Starts ${fmtDate(upcoming.from)}`
                    ) : (
                      <Dim>No active window</Dim>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Section>

      <Section
        title="Mini-Scan"
        note="The public lead-gen scan. It is switched with MINI_SCAN_MODE: off (default, the page says coming soon), simulated (fake results, for testing) or live (real DataForSEO spend, needs the owner's authorization)."
      >
        <p className="mb-3 text-sm">
          Mode: <Badge kind={mode === "live" ? "off" : mode === "simulated" ? "bad" : "top"}>{mode}</Badge> · Real scans this week: {scans.realThisWeek} of {WEEKLY_SCAN_CAP}
        </p>
        {scans.rows.length > 0 ? (
          <TableWrap minWidth={600}>
            <thead>
              <tr>
                <Th>Domain</Th>
                <Th>Status</Th>
                <Th>Queries</Th>
                <Th>Cost</Th>
                <Th>Requested</Th>
              </tr>
            </thead>
            <tbody>
              {scans.rows.map((s) => (
                <tr key={s.id}>
                  <Td className="font-medium">
                    {s.domain} {s.simulated && <Badge kind="bad">simulated</Badge>}
                  </Td>
                  <Td>{s.status}</Td>
                  <Td>{s.queries}</Td>
                  <Td>${s.costUsd.toFixed(4)}</Td>
                  <Td>{fmtDate(s.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <p className="text-muted">No scans yet.</p>
        )}
      </Section>

      <Section title="Add a client" note="The kind decides which jobs may touch the client and cannot be left blank.">
        <Panel className="max-w-xl">
          <ActionForm action={createClientAction} submit="Create client">
            <Field label="Name">
              <input name="name" required maxLength={120} className={inputClass} />
            </Field>
            <Field label="Domain" hint="Without www, for example example.com.">
              <input name="domain" required autoComplete="off" spellCheck={false} className={inputClass} />
            </Field>
            <Field label="Kind">
              <select name="kind" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choose...
                </option>
                <option value="real">real: measured by live jobs (costs money once live is on)</option>
                <option value="demo">demo: never touched by any job (your own sites, tests, prospects)</option>
                <option value="sandbox">sandbox: dry-run with fixtures only</option>
              </select>
            </Field>
            <Field label="Fee in USD (optional)" hint="The base of the 20% clawback credit.">
              <input name="feeUsd" inputMode="decimal" className={inputClass} />
            </Field>
          </ActionForm>
        </Panel>
      </Section>
    </>
  );
}
