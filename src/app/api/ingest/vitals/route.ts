import { handleIngest, optionsResponse } from "@/lib/ingest/handle";
import { hashIp, supabaseIngestDeps } from "@/lib/ingest/deps";
import { createAdminClient } from "@/lib/supabase/admin";

// Receives INP, LCP and CLS from the speed snippet installed on a client's site. Public by design:
// protection is validation, an origin check against the client's domain, and a persisted rate limit.
export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  const ip =
    request.headers.get("x-nf-client-connection-ip") ?? // Netlify
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? // proxies and tunnels
    "unknown";
  return handleIngest(request, supabaseIngestDeps(createAdminClient(), process.env.INGEST_EXTRA_ORIGINS), hashIp(ip, secret));
}
