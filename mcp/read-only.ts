// A database client that can only read. The MCP server never needs to write, so it never gets a client that could:
// from(table) offers select() and nothing else, storage offers download() and nothing else, and there is no rpc(), auth
// or realtime. Any attempt to insert, update, delete, upload or call a function fails because the method does not exist.
import type { SupabaseClient } from "@supabase/supabase-js";

type SelectOptions = { head?: boolean; count?: "exact" | "planned" | "estimated" };

export function readOnly(sb: SupabaseClient): SupabaseClient {
  const facade = {
    from: (table: string) => ({ select: (columns?: string, options?: SelectOptions) => sb.from(table).select(columns, options) }),
    storage: { from: (bucket: string) => ({ download: (path: string) => sb.storage.from(bucket).download(path) }) },
  };
  return facade as unknown as SupabaseClient;
}
