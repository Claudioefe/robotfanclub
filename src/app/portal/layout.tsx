import { redirect } from "next/navigation";
import { currentUser } from "@/lib/portal/data";

// Everything under /portal needs a signed-in user. The proxy checks optimistically; this is the real check.
// What each user may see is decided by RLS in the database.
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  if (!(await currentUser())) redirect("/login");
  return <>{children}</>;
}
