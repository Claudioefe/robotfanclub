import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Phase 1 placeholder. Proves RLS: it lists whatever clients the signed-in user may read.
// Phase 2 replaces this with the real portal (Overview, AI citations, Speed, Setup).
export default async function PortalPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("user_id").maybeSingle();
  // Explicit columns: the Slack webhook column is not readable by signed-in users.
  const { data: clients } = await supabase.from("clients").select("id, name, domain").order("name");

  return (
    <main style={{ padding: "4rem 1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Portal</h1>
      <p>
        Signed in as {auth.user.email} ({staffRow ? "staff" : "client"}).
      </p>
      <h2>Your clients</h2>
      {clients?.length ? (
        <ul>
          {clients.map((c) => (
            <li key={c.id}>
              {c.name} <small>({c.domain})</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>No clients are linked to this account yet.</p>
      )}
      <form action="/auth/signout" method="post">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
