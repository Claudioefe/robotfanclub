// Builds the MCP server around a database client. Knows nothing about how it is connected (stdio now, HTTP later).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ZodError } from "zod";
import { DESCRIPTIONS, INSTRUCTIONS, SCHEMAS, ToolError, buildHandlers } from "./tools.ts";

const TITLES: Record<keyof typeof SCHEMAS, string> = {
  list_clients: "List clients",
  get_citations: "AI citations",
  get_gaps: "Citation gaps",
  get_evidence: "Evidence of a query",
  get_speed: "Speed (INP)",
  get_ai_visibility: "AI visibility",
  get_query_ideas: "Query ideas",
};

const text = (value: unknown, isError = false) => ({ content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) });

/** What the model gets when a tool fails: a short, safe sentence. Details go to the server log (stderr), never to the model. */
function failure(err: unknown, tool: string) {
  if (err instanceof ZodError) return text(`Invalid input: ${err.issues.map((i) => `${i.path.join(".") || "input"} ${i.message}`).join("; ")}`, true);
  if (err instanceof ToolError) return text(err.message, true);
  console.error(`[mcp] ${tool} failed:`, err instanceof Error ? err.message : "unknown error");
  return text("The data could not be read right now. Try again, or check the server log.", true);
}

export function createMcpServer(db: SupabaseClient): McpServer {
  const server = new McpServer({ name: "robot-fan-club", version: "0.1.0" }, { instructions: INSTRUCTIONS });
  const handlers = buildHandlers(db);
  for (const name of Object.keys(SCHEMAS) as (keyof typeof SCHEMAS)[]) {
    const config = { title: TITLES[name], description: DESCRIPTIONS[name], annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } };
    const run = async (args: Record<string, unknown>) => {
      try {
        return text(await handlers[name](args));
      } catch (err) {
        return failure(err, name);
      }
    };
    if (Object.keys(SCHEMAS[name]).length === 0) server.registerTool(name, config, () => run({}));
    else server.registerTool(name, { ...config, inputSchema: SCHEMAS[name] }, (args: Record<string, unknown>) => run(args));
  }
  return server;
}
