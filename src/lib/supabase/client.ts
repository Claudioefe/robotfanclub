import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

// Browser client: publishable key only. Subject to RLS.
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient(url, publishableKey);
}
