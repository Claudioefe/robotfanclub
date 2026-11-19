import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireStaffPage } from "@/lib/admin/guard";

const NAV = [
  ["/admin", "Clients"],
  ["/admin/costs", "Costs"],
  ["/portal", "Portal"],
] as const;

// Staff only. Pages also check on their own (layouts and pages render in parallel), and every server action checks too.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireStaffPage();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-side">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <span className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display text-[17px] font-bold tracking-tight">Robot Fan Club</span>
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">Admin</span>
          </span>
          <nav className="flex gap-1 text-sm font-medium">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-muted no-underline hover:bg-surface hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button type="submit" className="text-sm text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-8">{children}</main>
    </div>
  );
}
