import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service client: uses the secret key and BYPASSES RLS.
// Server only (jobs, ingest endpoint, admin actions). Never import this from client code.
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
