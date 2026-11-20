import { fmtDate } from "@/lib/format";
import type { DayState, Surface } from "@/lib/portal/data";

// The day strip: one small cell per day of the window, one row per surface. A server component with no script: the
// cells are plain elements with a tooltip. On a phone only the last 14 days show (the rest hides with CSS).

export const STATE_LABEL: Record<DayState, string> = {
  cited: "Cited",
  gap: "AI answer without us",
  no_ai: "No AI answer",
  unchecked: "Not checked",
};

const CELL: Record<DayState, string> = {
  cited: "bg-accent",
  gap: "bg-bad/70",
  no_ai: "bg-line",
  unchecked: "border border-dashed border-line",
};

const SURFACE_SHORT: Record<Surface, string> = { ai_overview: "AIO", ai_mode: "AI Mode" };
const PHONE_DAYS = 14;

export function Strip({ days, surfaces, summary }: { days: string[]; surfaces: Record<Surface, DayState[]>; summary: string }) {
  return (
    <div role="img" aria-label={summary} className="flex flex-col gap-[3px]">
      {(Object.keys(SURFACE_SHORT) as Surface[]).map((s) => (
        <div key={s} className="flex items-center gap-2" aria-hidden="true">
          <span className="w-[54px] shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-wide text-muted">{SURFACE_SHORT[s]}</span>
          <span className="flex gap-px">
            {days.map((day, i) => (
              <i
                key={day}
                title={`${fmtDate(day)} · ${SURFACE_SHORT[s]} · ${STATE_LABEL[surfaces[s][i]]}`}
                className={`block h-[9px] w-[5px] rounded-[1px] ${CELL[surfaces[s][i]]} ${i < days.length - PHONE_DAYS ? "max-md:hidden" : ""}`}
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** What each cell colour means. Shown once above the table. */
export function StripLegend() {
  const order: DayState[] = ["cited", "gap", "no_ai", "unchecked"];
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
      <span className="font-mono text-[11px] uppercase tracking-[0.06em]">One cell per day</span>
      {order.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <i className={`block h-[9px] w-[9px] rounded-[1px] ${CELL[s]}`} aria-hidden="true" />
          {STATE_LABEL[s]}
        </span>
      ))}
    </p>
  );
}
