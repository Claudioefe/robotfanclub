import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffClient } from "./ops.ts";

// Two checks, both made against the database (never trusting the browser):
//  - requireStaffPage(): for pages and layouts. Sends signed-out visitors to /login and other users to /portal.
//  - assertStaff(): for server actions. It throws, so nothing after it runs. Every action calls it FIRST: a server
//    action is a public POST endpoint, so the page guard alone would not protect it.

export async function requireStaffPage(): Promise<void> {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");
  if (!(await isStaffClient(sb))) redirect("/portal");
}

export async function assertStaff(): Promise<void> {
  const sb = await createClient();
  if (!(await isStaffClient(sb))) throw new Error("Forbidden");
}
