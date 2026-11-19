import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { getClient, isStaff } from "@/lib/portal/data";

export default async function ClientLayout({ children, params }: LayoutProps<"/portal/[clientId]">) {
  const { clientId } = await params;
  const [client, staff] = await Promise.all([getClient(clientId), isStaff()]);
  if (!client) notFound();

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-side px-3 py-2.5 md:h-screen md:flex-col md:items-stretch md:gap-6 md:self-start md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="flex items-center gap-2.5 px-1 md:px-2">
          <Logo />
          <span className="hidden whitespace-nowrap font-display text-[17px] font-bold leading-tight tracking-tight sm:inline">Robot Fan Club</span>
        </div>
        <div className="hidden rounded-xl border border-line bg-surface px-3 py-2.5 md:block">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Client</p>
          <p className="mt-0.5 truncate font-semibold leading-snug">{client.name}</p>
        </div>
        <Nav clientId={client.id} />
        <div className="hidden px-2 text-[13px] text-muted md:mt-auto md:block">
          {staff && (
            <p className="mb-2">
              <Link href="/portal" className="text-muted hover:text-ink">
                ← All clients
              </Link>
            </p>
          )}
          <form action="/auth/signout" method="post">
            <button type="submit" className="hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="w-full min-w-0 max-w-[1120px] px-[clamp(18px,4vw,56px)] pb-20 pt-6 md:pt-9">{children}</main>
    </div>
  );
}
