# MCP: querying the data from Claude (phase 1, local)

An MCP server lets Claude read Robot Fan Club's data and analyze it in a chat. Decision: D-044. This is **phase 1: local and read-only**.

## Where it works
| | Phase 1 (local) |
|---|---|
| Claude Desktop (the desktop chat app) | Yes |
| Claude Code (terminal and VS Code) | Yes |
| claude.ai in the browser and on the phone | **No**: needs the remote version (phase 2) |
| Other people | No: it runs on your machine |

## What can be asked
Seven tools, all read-only:
| Tool | What it returns |
|---|---|
| `list_clients` | Clients, kind (`real`, `demo`, `sandbox`) and the running query window |
| `get_citations` | The window's citations: totals, % outside the top 10, citation rate, SLA status and one row per query. Filters: `all`, `cited`, `off_top10`, `gap`; surface; limit |
| `get_gaps` | Queries with an AI answer that did not cite the client, and whom it cited instead |
| `get_evidence` | The evidence of one query: AI answer text, sources in order and the organic top 10. With `raw: true` it returns the complete raw JSON |
| `get_speed` | INP by template and by day, CrUX, windows and third-party scripts |
| `get_ai_visibility` | Informational module: Google and ChatGPT mentions, questions (paginated) and sites cited next to it |
| `get_query_ideas` | Questions Google already cites for the domain, minus the ones already frozen |

Example questions: "Which queries of the Bauman pilot are not cited, and whom does the AI cite?", "Show me why 'books worth money' does cite Bauman", "What is missing for 'how to sell rare books'?".

## How to connect it
You need `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` (already there). The key **stays on your machine**: it never travels through the MCP.

Replace `<PROJECT>` with the project path and `<NODE>` with the output of `which node` (Claude Desktop starts with a minimal `PATH`, so the full path is safer).

**Claude Desktop.** Open Settings → Developer → Edit Config (file `claude_desktop_config.json`) and add:
```json
{
  "mcpServers": {
    "robot-fan-club": {
      "command": "<NODE>",
      "args": ["--no-warnings", "--env-file=<PROJECT>/.env.local", "<PROJECT>/mcp/server.ts"]
    }
  }
}
```
Restart Claude Desktop. `robot-fan-club` should appear with 7 tools.

**Claude Code.**
```
claude mcp add robot-fan-club -- <NODE> --no-warnings --env-file=<PROJECT>/.env.local <PROJECT>/mcp/server.ts
```

To try it without Claude: `npm run mcp` starts it (it waits for input; that is normal) and `npx vitest run tests/mcp.test.ts` tests it end to end.

## Safety rules
- **Read-only, enforced.** The server gets a database client that only has `select` and `download`: there is no way to insert, update, delete or upload. A test checks it.
- **Nothing calls DataForSEO.** No tool spends money.
- **No sensitive data leaves:** no costs, no client fees, no internal Storage paths, no keys. A test searches every output for those words.
- **Short errors.** On bad input or a failure, Claude gets one short sentence, never a stack trace or a database message.
- **Limits:** at most 200 rows per query and 120,000 characters of raw JSON.

## What to expect (and what not)
- Recommendations Claude makes from this data are **hypotheses**: AI answers change from one day to the next.
- This local server uses the service key, which bypasses the access rules (RLS): **it is for the owner and the agency's team**, who already see everything. Do not set it up for other people.
- The remote version (phase 2) will use each person's session, with RLS, and depends on D-045 (agency layer) and the deploy.

## How it is built
The queries live in a shared core (`src/lib/data/read.ts`) that receives the database client as a parameter: the portal calls it with the user's session and the MCP with the read-only client. Phase 2 reuses the same code. The tools are in `mcp/tools.ts`, the transport-independent server in `mcp/create.ts` and the stdio entry in `mcp/server.ts`.

Spanish version: [`../es/mcp.md`](../es/mcp.md).
