// The MCP server (D-044): read-only facade, evidence summary on the real pilot responses, tool contract, and the tools
// against the development database through an in-memory client plus the real stdio entry point. DB tests skip without keys.
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMcpServer } from "../mcp/create.ts";
import { readOnly } from "../mcp/read-only.ts";
import { DESCRIPTIONS, SCHEMAS } from "../mcp/tools.ts";
import { summarizeEvidence } from "../src/lib/data/evidence.ts";

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && secret);
const PILOT = "78457094-1c2c-487b-b612-24f647e2d69b";
const NORTH = "00000000-0000-4000-8000-000000000001";
const TOOLS = ["list_clients", "get_citations", "get_gaps", "get_evidence", "get_speed", "get_ai_visibility", "get_query_ideas"];

describe("read-only database client", () => {
  const sb = createClient("http://localhost:1", "k", { auth: { persistSession: false } });
  const db = readOnly(sb) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  it("offers select and download, and nothing that writes", () => {
    const table = db.from("clients");
    expect(typeof table.select).toBe("function");
    for (const write of ["insert", "update", "upsert", "delete"]) expect(table[write]).toBeUndefined();
    const bucket = db.storage.from("snapshots");
    expect(typeof bucket.download).toBe("function");
    for (const write of ["upload", "remove", "move", "copy", "update", "createSignedUrl", "getPublicUrl"]) expect(bucket[write]).toBeUndefined();
    for (const other of ["rpc", "auth", "functions", "realtime", "channel"]) expect(db[other]).toBeUndefined();
  });
});

describe("evidence summary on the real pilot responses", () => {
  const dir = new URL("./fixtures/real/watcher-bauman-pilot-2026-11-19/", import.meta.url);
  const file = (surface: string, q: string) => readdirSync(dir).find((f) => f.startsWith(`${surface}-${q.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-`))!;
  const summary = (surface: string, q: string) => summarizeEvidence(JSON.parse(readFileSync(new URL(file(surface, q), dir), "utf8")));

  it("lists the sources in order, with the client at position 2, and an organic top 10 without the client", () => {
    const s = summary("ai_overview", "books worth money");
    expect(s.aiAnswer.present).toBe(true);
    expect(s.aiAnswer.sources[1]).toMatchObject({ position: 2, domain: "baumanrarebooks.com" });
    expect(s.aiAnswer.sources.some((x) => x.googleOwnLink)).toBe(true);
    expect(s.organicTop10!.length).toBeGreaterThan(5);
    expect(s.organicTop10!.some((o) => o.domain.includes("baumanrarebooks"))).toBe(false);
    expect(s.itemTypes).toContain("ai_overview");
  });

  it("reads the AI answer text and shortens it when asked", () => {
    const s = summary("ai_overview", "how to sell rare books");
    expect(s.aiAnswer.text).toMatch(/identify the exact edition/i);
    const short = summarizeEvidence(JSON.parse(readFileSync(new URL(file("ai_overview", "how to sell rare books"), dir), "utf8")), 100);
    expect(short.aiAnswer.text!.length).toBe(100);
    expect(short.aiAnswer.textTruncated).toBe(true);
    expect(s.peopleAlsoAsk.length).toBeGreaterThan(0);
  });

  it("says so when there is no AI answer", () => {
    const s = summary("ai_overview", "rare books for sale");
    expect(s.aiAnswer).toMatchObject({ present: false, text: null, sources: [] });
    expect(s.organicTop10!.find((o) => o.domain.includes("baumanrarebooks"))!.rank).toBe(3);
  });
});

describe("tool contract", () => {
  it("has the seven tools, each with a description", () => {
    expect(Object.keys(SCHEMAS)).toEqual(TOOLS);
    for (const t of TOOLS) expect(DESCRIPTIONS[t as keyof typeof DESCRIPTIONS].length).toBeGreaterThan(30);
  });
});

describe.skipIf(!hasEnv)("tools against the development database", () => {
  let client: Client;
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await client.callTool({ name, arguments: args });
    const text = (r.content as { type: string; text: string }[])[0].text;
    return { isError: Boolean(r.isError), text, json: r.isError ? null : JSON.parse(text) };
  };

  beforeAll(async () => {
    const db = readOnly(createClient(url!, secret!, { auth: { persistSession: false, autoRefreshToken: false } }));
    const server = createMcpServer(db);
    const [a, b] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test", version: "0" });
    await Promise.all([server.connect(a), client.connect(b)]);
  });
  afterAll(async () => {
    await client.close();
  });

  it("registers the seven tools, all marked read-only", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOLS].sort());
    for (const t of tools) expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false });
    expect(client.getInstructions()).toMatch(/never call DataForSEO/i);
  });

  it("lists clients with their kind and window, and no money", async () => {
    const { json, text } = await call("list_clients");
    const pilot = json.clients.find((c: { id: string }) => c.id === PILOT);
    expect(pilot).toMatchObject({ name: "Bauman Rare Books (pilot)", kind: "real", window: { from: "2026-11-19", until: "2027-01-17", queries: 15 } });
    expect(text).not.toMatch(/fee|cost/i);
  });

  it("gives the pilot's day-1 citations, with the SLA reading but no fee", async () => {
    const { json } = await call("get_citations", { client_id: PILOT });
    expect(json.summary).toMatchObject({ citations: 11, citationsOutsideTop10: 11, shareOutsideTop10: 1, meetsOutsideTop10Goal: true });
    expect(json.summary.citationRate).toMatchObject({ checksCited: 13, checksWithAi: 27 });
    expect(json.window).toMatchObject({ frozenQueries: 15, days: 60 });
    expect(json.rows).toHaveLength(15);
    const gap = await call("get_citations", { client_id: PILOT, filter: "gap" });
    expect(gap.json.matching).toBe(4);
    const limited = await call("get_citations", { client_id: PILOT, limit: 3 });
    expect(limited.json.rows).toHaveLength(3);
    expect(limited.json.truncated).toBe(true);
  });

  it("lists the gap and who was cited instead", async () => {
    const { json } = await call("get_gaps", { client_id: PILOT });
    expect(json.gaps.map((g: { query: string }) => g.query).sort()).toEqual(["gifts for a book lover", "how to sell rare books", "most valuable stephen king books", "where to sell first edition books"]);
    expect(json.mostCitedInstead.map((d: { domain: string }) => d.domain)).toContain("reddit.com");
    expect(JSON.stringify(json)).not.toContain("google.com");
  });

  it("returns the evidence of a query as a summary, or the raw JSON on request", async () => {
    const { json } = await call("get_evidence", { client_id: PILOT, query: "Books Worth Money", surface: "ai_overview" });
    expect(json.cited).toBe(true);
    expect(json.evidence.ai_overview).toMatchObject({ available: true });
    expect(json.evidence.ai_overview.aiAnswer.sources[1].domain).toBe("baumanrarebooks.com");
    const raw = await call("get_evidence", { client_id: PILOT, query: "books worth money", surface: "ai_mode", raw: true });
    expect(JSON.parse(raw.json.evidence.ai_mode.rawJson).keyword).toBe("books worth money");
    const first = await call("get_evidence", { client_id: PILOT, query: "gifts for a book lover", which: "first_citation" });
    expect(first.json.evidence.ai_overview).toMatchObject({ available: false });
  });

  it("refuses bad input with a short sentence, never a stack trace or a database message", async () => {
    for (const args of [{ client_id: "nope" }, { client_id: "00000000-0000-4000-8000-0000000000aa" }]) {
      const r = await call("get_citations", args);
      expect(r.isError).toBe(true);
      expect(r.text.length).toBeLessThan(200);
      expect(r.text).not.toMatch(/\n\s+at |\.ts:\d+|supabase|postgres|node_modules/i); // no stack trace, file name or database message
    }
    const q = await call("get_evidence", { client_id: PILOT, query: "not a frozen query" });
    expect(q.isError).toBe(true);
    expect(q.text).toMatch(/not in the client's frozen list/);
    const limit = await call("get_citations", { client_id: PILOT, limit: 5000 });
    expect(limit.isError).toBe(true);
  });

  it("reads speed and AI visibility", async () => {
    const speed = await call("get_speed", { client_id: NORTH });
    expect(speed.json.goalMs).toBe(200);
    expect(speed.json.realVisitors.p75Ms).toBeGreaterThan(0);
    expect(speed.json.byTemplate.length).toBeGreaterThan(0);
    const v = await call("get_ai_visibility", { client_id: PILOT, page: 2 });
    expect(v.json.page).toMatchObject({ page: 2, pages: 4, from: 26, to: 50, total: 80 });
    expect(v.json.platforms.map((p: { platform: string }) => p.platform)).toEqual(["Google AI Overview", "ChatGPT"]);
    expect(v.json.note).toMatch(/snapshot/i);
  });

  it("suggests ideas without the questions that are already frozen", async () => {
    const { json } = await call("get_query_ideas", { client_id: PILOT });
    expect(json.alreadyFrozen).toBe(15);
    expect(json.ideas.length).toBeGreaterThan(5);
    expect(JSON.stringify(json.ideas)).not.toContain("gifts for a book lover");
  });

  it("never lets a cost, a fee, an internal path or a key out", async () => {
    const outputs: string[] = [];
    for (const [name, args] of [["list_clients", {}], ["get_citations", { client_id: PILOT }], ["get_citations", { client_id: NORTH }], ["get_gaps", { client_id: PILOT }], ["get_speed", { client_id: NORTH }], ["get_ai_visibility", { client_id: PILOT }], ["get_query_ideas", { client_id: PILOT }], ["get_evidence", { client_id: PILOT, query: "books worth money" }]] as const) {
      outputs.push((await call(name, args)).text);
    }
    const all = outputs.join("\n");
    expect(all).not.toMatch(/cost_usd|service_fee|snapshot_path|snapshots\/|sb_secret|SUPABASE|eyJ[A-Za-z0-9_-]{20,}|webhook/i);
    expect(all).not.toMatch(/14,500|14500/); // Northwind's fee
  });
});

describe.skipIf(!hasEnv)("the real stdio entry point", () => {
  it("starts as Claude Desktop would, lists its tools, and answers a call", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--no-warnings", "mcp/server.ts"],
      env: { PATH: process.env.PATH ?? "", SUPABASE_URL: url!, SUPABASE_SECRET_KEY: secret! },
      stderr: "ignore",
    });
    const c = new Client({ name: "stdio-test", version: "0" });
    await c.connect(transport);
    try {
      expect((await c.listTools()).tools).toHaveLength(7);
      const r = await c.callTool({ name: "list_clients", arguments: {} });
      expect(JSON.parse((r.content as { text: string }[])[0].text).clients.length).toBeGreaterThan(0);
    } finally {
      await c.close();
    }
  }, 30_000);

  it("refuses to start without the database keys", async () => {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(process.execPath, ["--no-warnings", "mcp/server.ts"], { env: { PATH: process.env.PATH ?? "" } as unknown as NodeJS.ProcessEnv, encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Missing SUPABASE_URL/);
  });
});
