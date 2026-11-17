import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getClient, isStaff } from "@/lib/portal/data";

export default async function ClientLayout({ children, params }: LayoutProps<"/portal/[clientId]">) {
  const { clientId } = await params;
  const [client, staff] = await Promise.all([getClient(clientId), isStaff()]);
  if (!client) notFound();

  return (
    <div className="grid min-h-screen md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-side px-3 py-2.5 md:h-screen md:flex-col md:items-stretch md:gap-7 md:self-start md:border-b-0 md:border-r md:px-4 md:py-7">
        <div className="px-1 text-lg font-bold leading-tight tracking-tight md:px-2.5 md:text-xl">
          Robot Fan Club
          <small className="mt-1 hidden text-[13.5px] font-medium tracking-normal text-muted md:block">{client.name}</small>
        </div>
        <Nav clientId={client.id} />
        <div className="hidden px-2.5 text-[13px] text-muted md:mt-auto md:block">
          {staff && (
            <p className="mb-2">
              <Link href="/portal">All clients</Link>
            </p>
          )}
          <form action="/auth/signout" method="post">
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="w-full min-w-0 max-w-[1080px] px-[clamp(18px,4vw,56px)] pb-20 pt-6 md:pt-10">{children}</main>
    </div>
  );
}
