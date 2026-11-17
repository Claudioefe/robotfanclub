import { NextResponse, type NextRequest } from "next/server";
import { UUID } from "@/lib/portal/data";
import { createClient } from "@/lib/supabase/server";

// Opens the raw JSON snapshot of a check (the SLA evidence). The signed link is created as the signed-in
// user, so the Storage policy decides whether they may read it.
export async function GET(request: NextRequest, { params }: RouteContext<"/portal/[clientId]/snapshot">) {
  const { clientId } = await params;
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!UUID.test(clientId) || !path.startsWith(`${clientId}/`) || path.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("snapshots").createSignedUrl(path, 60);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
