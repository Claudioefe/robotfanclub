import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/guard";

// Staff only. Pages also check on their own (layouts and pages render in parallel), and every server action checks too.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireStaffPage();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-side">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <span className="font-bold tracking-tight">Robot Fan Club · Admin</span>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/admin">Clients</Link>
            <Link href="/admin/costs">Costs</Link>
            <Link href="/portal">Portal</Link>
          </nav>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button type="submit" className="text-sm text-muted underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-8">{children}</main>
    </div>
  );
}
