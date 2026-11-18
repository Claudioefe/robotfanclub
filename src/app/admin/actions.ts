"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertStaff } from "@/lib/admin/guard";
import {
  addCruxTargetOp,
  createClientOp,
  freezeQueriesOp,
  grantMemberOp,
  removeCruxTargetOp,
  removeMemberOp,
  removeTagScriptOp,
  saveTagScriptOp,
  setSprintOp,
  type OpResult,
} from "@/lib/admin/ops";
import { createAdminClient } from "@/lib/supabase/admin";

// Server actions of the staff Admin. Each one checks the caller is staff BEFORE doing anything, then runs the
// operation with the secret-key client. Results go back to the form as { ok, message }.

export type ActionState = { ok: boolean; message: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const toState = (r: OpResult<unknown>): ActionState => (r.ok ? { ok: true, message: r.message } : { ok: false, message: r.error });
const bad = (message: string): ActionState => ({ ok: false, message });

/** Runs `fn` as staff on the client named in the form. */
async function onClient(fd: FormData, fn: (sb: ReturnType<typeof createAdminClient>, clientId: string) => Promise<OpResult<unknown>>): Promise<ActionState> {
  await assertStaff();
  const clientId = text(fd, "clientId");
  if (!UUID.test(clientId)) return bad("Unknown client.");
  const result = await fn(createAdminClient(), clientId);
  if (result.ok) revalidatePath(`/admin/clients/${clientId}`);
  return toState(result);
}

export async function createClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertStaff();
  const r = await createClientOp(createAdminClient(), {
    name: text(fd, "name"),
    domain: text(fd, "domain"),
    kind: text(fd, "kind"),
    feeUsd: text(fd, "feeUsd"),
  });
  if (!r.ok) return bad(r.error);
  revalidatePath("/admin");
  redirect(`/admin/clients/${r.data!.id}`);
}

export async function freezeQueriesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return onClient(fd, (sb, id) => freezeQueriesOp(sb, id, text(fd, "queries")));
}

export async function addCruxTargetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return onClient(fd, (sb, id) => addCruxTargetOp(sb, id, { scope: text(fd, "scope"), target: text(fd, "target") }));
}

export async function removeCruxTargetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return onClient(fd, (sb, id) => removeCruxTargetOp(sb, id, Number(text(fd, "targetId"))));
}

export async function setSprintAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return onClient(fd, (sb, id) => setSprintOp(sb, id, { deployedOn: text(fd, "deployedOn"), baselineMs: text(fd, "baselineMs") }));
}

export async function saveTagScriptAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const rawId = text(fd, "scriptId");
  return onClient(fd, (sb, id) =>
    saveTagScriptOp(sb, id, rawId === "" ? null : Number(rawId), {
      label: text(fd, "label"),
      scriptUrl: text(fd, "scriptUrl"),
      blockingMs: text(fd, "blockingMs"),
      action: text(fd, "action"),
      isRequired: fd.get("isRequired") === "on",
    }),
  );
}

export async function removeTagScriptAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return onClient(fd, (sb, id) => removeTagScriptOp(sb, id, Number(text(fd, "scriptId"))));
}

export async function grantMemberAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return onClient(fd, (sb, id) => grantMemberOp(sb, id, text(fd, "email")));
}

export async function removeMemberAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return onClient(fd, (sb, id) => removeMemberOp(sb, id, text(fd, "userId")));
}
