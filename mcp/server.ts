// Local MCP server (stdio), read-only. Started by Claude Desktop or Claude Code, never by hand:
//   node --env-file=.env.local mcp/server.ts
// Needs SUPABASE_URL and SUPABASE_SECRET_KEY (the secret key stays on this machine and never travels through the MCP).
// Only stderr may be written to: stdout is the protocol.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { createMcpServer } from "./create.ts";
import { readOnly } from "./read-only.ts";

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Start this server with: node --env-file=.env.local mcp/server.ts");
  process.exit(2);
}

const db = readOnly(createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } }));
await createMcpServer(db).connect(new StdioServerTransport());
console.error("[mcp] robot-fan-club ready (read-only, 7 tools).");
