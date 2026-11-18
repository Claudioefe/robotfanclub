import Link from "next/link";
import { createClientAction } from "./actions";
import { ActionForm, Field, inputClass } from "@/components/admin/forms";
import { Badge, Dim, PageHeader, Panel, Section, TableWrap, Td, Th } from "@/components/ui";
import { requireStaffPage } from "@/lib/admin/guard";
import { listClientsAdmin, listWindows } from "@/lib/admin/ops";
import { fmtDate } from "@/lib/format";
import { todayUtc } from "@/lib/sla";
import { createAdminClient } from "@/lib/supabase/admin";

const KIND_BADGE = { real: "off", demo: "top", sandbox: "bad" } as const;

export default async function AdminHome() {
  await requireStaffPage();
  const sb = createAdminClient();
  const clients = await listClientsAdmin(sb);
  const today = todayUtc();
  const windows = await Promise.all(clients.map((c) => listWindows(sb, c.id)));

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
