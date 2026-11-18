import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addCruxTargetAction,
  freezeQueriesAction,
  grantMemberAction,
  removeCruxTargetAction,
  removeMemberAction,
  removeTagScriptAction,
  saveTagScriptAction,
  setSprintAction,
} from "../../actions";
import { ActionForm, Field, inputClass } from "@/components/admin/forms";
import { CopyButton } from "@/components/CopyButton";
import { Badge, Dim, PageHeader, Panel, Section, TableWrap, Td, Th } from "@/components/ui";
import { requireStaffPage } from "@/lib/admin/guard";
import { getClientAdmin, listCruxTargets, listMembers, listQueryIdeas, listTagScripts, listWindows } from "@/lib/admin/ops";
import { MAX_QUERIES, TAG_ACTION_VALUES } from "@/lib/admin/validate";
import { fmtDate } from "@/lib/format";
import { TAG_ACTIONS, todayUtc } from "@/lib/sla";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KIND_BADGE = { real: "off", demo: "top", sandbox: "bad" } as const;

export default async function AdminClient({ params }: PageProps<"/admin/clients/[clientId]">) {
  await requireStaffPage();
  const { clientId } = await params;
  if (!UUID.test(clientId)) notFound();

  const sb = createAdminClient();
  const client = await getClientAdmin(sb, clientId);
  if (!client) notFound();
  const [windows, targets, scripts, members] = await Promise.all([listWindows(sb, clientId), listCruxTargets(sb, clientId), listTagScripts(sb, clientId), listMembers(sb, clientId)]);
  const today = todayUtc();
  const { ideas, capturedOn } = await listQueryIdeas(sb, clientId, windows.flatMap((w) => w.queries));

  return (
    <>
      <p className="text-sm">
        <Link href="/admin">← All clients</Link>
      </p>
      <PageHeader
        title={client.name}
        sub={
          <>
            {client.domain} · <Badge kind={KIND_BADGE[client.kind]}>{client.kind}</Badge> ·{" "}
            <Link href={`/portal/${client.id}`}>Open the portal as this client sees it</Link>
          </>
        }
      />

      <Section
        title="Frozen query list"
        note={`Up to ${MAX_QUERIES} queries, one per line. Freezing starts a 60-day window; a frozen list is never edited. To change it, freeze a new list: it starts the day after the running window ends.`}
      >
        {windows.length > 0 && (
          <div className="mb-4">
            <TableWrap minWidth={520}>
              <thead>
                <tr>
                  <Th>Window</Th>
                  <Th>Queries</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {windows.map((w) => (
                  <tr key={w.from}>
                    <Td>
                      {fmtDate(w.from)} to {fmtDate(w.until)}
                    </Td>
                    <Td>
                      <details>
                        <summary className="cursor-pointer">{w.queries.length} queries</summary>
                        <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                          {w.queries.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </details>
                    </Td>
                    <Td>{w.until < today ? <Dim>Ended</Dim> : w.from > today ? "Upcoming" : <Badge kind="off">Running</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        )}
        <Panel className="max-w-2xl">
          <ActionForm action={freezeQueriesAction} submit="Freeze list" resetOnSuccess>
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Queries" hint="Buying-intent searches a customer would type. Duplicates are removed.">
              <textarea name="queries" required rows={8} spellCheck={false} className={`${inputClass} font-mono`} />
            </Field>
          </ActionForm>
        </Panel>
      </Section>

      {ideas.length > 0 && (
        <Section
          title="Query ideas from AI visibility"
          note={`Questions Google’s AI already cites ${client.domain} for (read on ${capturedOn ? fmtDate(capturedOn) : "n/a"}), by AI search volume, minus what is already frozen. Copy the ones you want into the form above. Nothing is frozen from here.`}
        >
          <Panel className="max-w-2xl">
            <ul className="space-y-1 text-sm">
              {ideas.map((i) => (
                <li key={i.query} className="flex justify-between gap-4">
                  <span>{i.query}</span>
                  <Dim>{i.volume === null ? "n/a" : `${i.volume.toLocaleString("en-US")} / month`}</Dim>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <CopyButton text={ideas.map((i) => i.query).join("\n")} label="Copy all as a list" />
            </div>
          </Panel>
        </Section>
      )}

      <Section title="Speed: sprint details" note="The INP SLA counts its two 28-day Chrome windows from the day after the sprint deploy.">
        <Panel className="max-w-xl">
          <ActionForm action={setSprintAction} submit="Save">
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Sprint deploy date" hint="YYYY-MM-DD. Leave empty if the sprint has not shipped.">
              <input name="deployedOn" defaultValue={client.inpSprintDeployedOn ?? ""} placeholder="2026-10-26" className={inputClass} />
            </Field>
            <Field label="INP before the sprint, in ms" hint="The p75 on mobile before any work.">
              <input name="baselineMs" inputMode="numeric" defaultValue={client.inpBaselineMs ?? ""} className={inputClass} />
            </Field>
          </ActionForm>
        </Panel>
      </Section>

      <Section
        title="Chrome UX Report targets"
        note="What the nightly CrUX job reads. CrUX treats https://www.x.com and https://x.com as different origins: use the one real visitors land on."
      >
        {targets.length > 0 && (
          <div className="mb-4">
            <TableWrap minWidth={520}>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.id}>
                    <Td className="w-24">
                      <Badge kind="top">{t.scope}</Badge>
                    </Td>
                    <Td className="break-all">{t.target}</Td>
                    <Td className="w-28">
                      <ActionForm action={removeCruxTargetAction} submit="Remove" ghost small className="grid">
                        <input type="hidden" name="clientId" value={client.id} />
                        <input type="hidden" name="targetId" value={t.id} />
                      </ActionForm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        )}
        <Panel className="max-w-2xl">
          <ActionForm action={addCruxTargetAction} submit="Add target" resetOnSuccess>
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Type">
              <select name="scope" defaultValue="origin" className={inputClass}>
                <option value="origin">origin: the whole site</option>
                <option value="url">url: one page</option>
              </select>
            </Field>
            <Field label="Address" hint="Full address, for example https://www.example.com">
              <input name="target" required className={inputClass} />
            </Field>
          </ActionForm>
        </Panel>
      </Section>

      <Section
        title="Tag Bouncer scripts"
        note="Third-party scripts that block interactions, and what to do with each. The client sees this plan and can try what-ifs, but only staff change it."
      >
        {scripts.length > 0 && (
          <div className="mb-4 grid gap-3">
            {scripts.map((s) => (
              <Panel key={s.id}>
                <ActionForm action={saveTagScriptAction} submit="Save" small className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="clientId" value={client.id} />
                  <input type="hidden" name="scriptId" value={s.id} />
                  <Field label="Name">
                    <input name="label" defaultValue={s.label} required className={inputClass} />
                  </Field>
                  <Field label="Script address">
                    <input name="scriptUrl" defaultValue={s.scriptUrl} required className={inputClass} />
                  </Field>
                  <Field label="Blocking at p75, ms">
                    <input name="blockingMs" inputMode="numeric" defaultValue={s.blockingMs} required className={inputClass} />
                  </Field>
                  <Field label="Action">
                    <select name="action" defaultValue={s.action} className={inputClass}>
                      {TAG_ACTION_VALUES.map((a) => (
                        <option key={a} value={a}>
                          {TAG_ACTIONS[a].label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" name="isRequired" defaultChecked={s.isRequired} /> Required (for example a consent banner): cannot be removed and is outside the SLA
                  </label>
                </ActionForm>
                <div className="mt-2">
                  <ActionForm action={removeTagScriptAction} submit="Remove script" ghost small className="grid" confirm={`Remove ${s.label}?`}>
                    <input type="hidden" name="clientId" value={client.id} />
                    <input type="hidden" name="scriptId" value={s.id} />
                  </ActionForm>
                </div>
              </Panel>
            ))}
          </div>
        )}
        <Panel className="max-w-2xl">
          <h3 className="mb-3 text-[15px] font-semibold">Add a script</h3>
          <ActionForm action={saveTagScriptAction} submit="Add script" resetOnSuccess className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="scriptId" value="" />
            <Field label="Name">
              <input name="label" required className={inputClass} />
            </Field>
            <Field label="Script address">
              <input name="scriptUrl" required placeholder="https://" className={inputClass} />
            </Field>
            <Field label="Blocking at p75, ms">
              <input name="blockingMs" inputMode="numeric" required className={inputClass} />
            </Field>
            <Field label="Action">
              <select name="action" defaultValue="keep" className={inputClass}>
                {TAG_ACTION_VALUES.map((a) => (
                  <option key={a} value={a}>
                    {TAG_ACTIONS[a].label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isRequired" /> Required (cannot be removed, outside the SLA)
            </label>
          </ActionForm>
        </Panel>
      </Section>

      <Section
        title="Access"
        note="People who can see this client's portal, read-only. Adding someone creates their account without sending any email: they open /login and ask for their own sign-in link."
      >
        {members.length > 0 ? (
          <div className="mb-4">
            <TableWrap minWidth={420}>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId}>
                    <Td className="break-all">{m.email}</Td>
                    <Td className="w-28">
                      <ActionForm action={removeMemberAction} submit="Remove" ghost small className="grid" confirm={`Remove access for ${m.email}?`}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <input type="hidden" name="userId" value={m.userId} />
                      </ActionForm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        ) : (
          <p className="mb-4 text-muted">Nobody outside the staff can see this client yet.</p>
        )}
        <Panel className="max-w-xl">
          <ActionForm action={grantMemberAction} submit="Give access" resetOnSuccess>
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Email">
              <input name="email" type="email" required autoComplete="off" className={inputClass} />
            </Field>
          </ActionForm>
        </Panel>
      </Section>
    </>
  );
}
