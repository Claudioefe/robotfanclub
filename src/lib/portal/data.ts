import "server-only";
import { createClient } from "@/lib/supabase/server";
import * as core from "@/lib/data/read";

// The portal reads as the signed-in user, so RLS decides what comes back. The queries themselves live in the data core
// (src/lib/data/read.ts), shared with the MCP server; these wrappers only supply the user's database client.
export { SURFACES, SURFACE_LABEL, UUID } from "@/lib/data/read";
export type { AiVisibilityData, CardData, CitationsData, ClientRow, CruxData, CruxPoint, DayDetail, DayPoint, DayState, HistoryData, QueryHistory, QueryRow, SpeedData, Surface, SurfaceDay, SurfaceState, TagScript } from "@/lib/data/read";
type ClientRow = core.ClientRow;

export async function currentUser() {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function isStaff(): Promise<boolean> {
  const sb = await createClient();
  const { data } = await sb.from("staff").select("user_id").maybeSingle();
  return Boolean(data);
}

export async function listClients() {
  return core.listClients(await createClient());
}
export async function getClient(id: string) {
  return core.getClient(await createClient(), id);
}
export async function getCitations(client: ClientRow) {
  return core.getCitations(await createClient(), client);
}
export async function getHistory(client: ClientRow, window: Parameters<typeof core.getHistory>[2]) {
  return core.getHistory(await createClient(), client.id, window);
}
export async function getQueryHistory(client: ClientRow, query: string, window: Parameters<typeof core.getQueryHistory>[3]) {
  return core.getQueryHistory(await createClient(), client.id, query, window);
}
export async function getSpeed(client: ClientRow) {
  return core.getSpeed(await createClient(), client);
}
export async function getAiVisibility(clientId: string) {
  return core.getAiVisibility(await createClient(), clientId);
}
