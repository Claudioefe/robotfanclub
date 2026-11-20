import { fmtDate } from "@/lib/format";
import type { LlmRelation, LlmRunRow } from "@/lib/portal/data";

// One cell per ChatGPT run (D-048), oldest on the left. Unlike the Google day strip these are runs, not days: several runs can
// happen on the same day, and a query may have only one. Cited and consulted are different things and have different colours.

export const RELATION_LABEL: Record<LlmRelation, string> = {
  cited: "Cited",
  consulted: "Consulted, not cited",
  none: "Not mentioned",
};

const CELL: Record<LlmRelation, string> = {
  cited: "bg-accent",
  consulted: "bg-cite",
  none: "bg-line",
};

export function RunDots({ runs, summary }: { runs: LlmRunRow[]; summary: string }) {
  if (!runs.length) return <span className="text-muted">No runs yet</span>;
  return (
    <span role="img" aria-label={summary} className="flex flex-wrap gap-1">
      {runs.map((r, i) => (
        <i
          key={`${r.runAt}-${i}`}
          title={`${fmtDate(r.runOn)} · ${RELATION_LABEL[r.relation]}${r.relation === "cited" && r.clientSourceRank ? ` (source ${r.clientSourceRank} of ${r.sourceCount})` : ""}`}
          className={`block h-3 w-3 rounded-[3px] ${CELL[r.relation]}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function RunDotsLegend() {
  const order: LlmRelation[] = ["cited", "consulted", "none"];
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
      <span className="font-mono text-[11px] uppercase tracking-[0.06em]">One cell per run</span>
      {order.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <i className={`block h-[10px] w-[10px] rounded-[2px] ${CELL[s]}`} aria-hidden="true" />
          {RELATION_LABEL[s]}
        </span>
      ))}
    </p>
  );
}
