import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff, listClients } from "@/lib/portal/data";
import { PageHeader, Panel } from "@/components/ui";

export default async function PortalHome() {
  const [clients, staff] = await Promise.all([listClients(), isStaff()]);

  // A client user with a single workspace goes straight to it.
  if (!staff && clients.length === 1) redirect(`/portal/${clients[0].id}`);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <PageHeader title="Robot Fan Club" sub={staff ? "Staff view: every client." : "Your workspaces."} />
      <div className="mt-8 grid gap-3">
        {clients.length ? (
          clients.map((c) => (
            <Panel key={c.id}>
              <Link href={`/portal/${c.id}`} className="font-semibold no-underline">
                {c.name}
              </Link>{" "}
              <span className="text-sm text-muted">{c.domain}</span>
            </Panel>
          ))
        ) : (
          <p className="text-muted">No clients are linked to this account yet.</p>
        )}
      </div>
      <form action="/auth/signout" method="post" className="mt-8">
        <button type="submit" className="text-sm text-muted underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
