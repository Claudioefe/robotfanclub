// Simulated SERP source for Mini-Scan dry-runs: plausible but FAKE results, deterministic per domain and query
// (same shape as DataForSEO's, so the real parser runs on it). Scans made with it are flagged `simulated` and the
// result page says so. It never calls any API and costs nothing.
import type { SerpSource, SerpTask } from "../watcher/dataforseo.ts";

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const POOL = ["competitor-a.com", "competitor-b.com", "reviewsite.com", "industry-blog.net", "forum.example.org"];

export class SimulatedSource implements SerpSource {
  readonly name = "fixture";
  private domain: string;
  constructor(domain: string) {
    this.domain = domain;
  }

  async organic(keyword: string): Promise<SerpTask> {
    const r = mulberry32(hash(`${this.domain.toLowerCase()}|${keyword.toLowerCase()}`));
    const hasAi = r() < 0.64;
    const result: Record<string, unknown> = { keyword, items: [{ type: "organic", rank_group: 1, url: "https://simulated.example/1" }] };
    if (hasAi) {
      const refs = POOL.filter(() => r() < 0.4).slice(0, 3).map((d) => ({ type: "ai_overview_reference", domain: d, url: `https://${d}/${encodeURIComponent(keyword.slice(0, 20))}` }));
      if (!refs.length) refs.push({ type: "ai_overview_reference", domain: POOL[0], url: `https://${POOL[0]}/p` });
      if (r() < 0.18) refs.splice(Math.floor(r() * (refs.length + 1)), 0, { type: "ai_overview_reference", domain: this.domain, url: `https://${this.domain}/simulated` });
      (result.items as unknown[]).unshift({ type: "ai_overview", items: [{ type: "ai_overview_element", references: refs }] });
    }
    return { cost: 0, result: result as SerpTask["result"] };
  }

  async aiMode(): Promise<SerpTask> {
    throw new Error("The Mini-Scan does not use AI Mode");
  }
}
