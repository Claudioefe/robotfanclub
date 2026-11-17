import { SLA, addDays, todayUtc } from "@/lib/sla";
import { fmtDate } from "@/lib/format";

// Daily INP p75 for the last 28 days. Server-rendered SVG, no chart library.
export function Trend({ daily, deployedOn, today = todayUtc() }: { daily: { day: string; p75: number }[]; deployedOn: string | null; today?: string }) {
  const W = 560;
  const H = 180;
  const start = addDays(today, -27);
  const dayIndex = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 864e5);
  const x = (i: number) => (i / 27) * W;

  const points = daily.map((d) => ({ i: dayIndex(d.day), v: d.p75 })).filter((p) => p.i >= 0 && p.i <= 27);
  if (!points.length) return <p className="text-muted">No real-visitor data in the last 28 days yet.</p>;

  const values = points.map((p) => p.v);
  const lo = Math.min(150, Math.floor(Math.min(...values) / 10) * 10 - 10);
  const hi = Math.max(Math.ceil(Math.max(...values) / 10) * 10 + 10, SLA.inpGoalMs + 30);
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const line = points.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const shipped = deployedOn ? dayIndex(deployedOn) : null;
  const showShipped = shipped !== null && shipped >= 0 && shipped <= 27;
  const first = points[0].v;
  const last = points[points.length - 1].v;

  return (
    <div className="rounded-xl border border-line bg-surface px-[18px] pb-3 pt-[18px]">
      <div className="relative h-[180px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Daily mobile INP p75 from ${Math.round(first)} ms to ${Math.round(last)} ms over 28 days`}
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <line x1="0" x2={W} y1={y(SLA.inpGoalMs)} y2={y(SLA.inpGoalMs)} stroke="var(--off)" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          {showShipped && <line x1={x(shipped)} x2={x(shipped)} y1="0" y2={H} stroke="var(--muted)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          <polyline points={line} fill="none" stroke="var(--cite)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute right-0 -translate-y-[120%] whitespace-nowrap text-[12.5px] text-off" style={{ top: `${(y(SLA.inpGoalMs) / H) * 100}%` }}>
          200 ms goal
        </span>
        {showShipped && (
          <span className="absolute top-3.5 whitespace-nowrap text-[12.5px] text-muted" style={{ left: `calc(${(x(shipped) / W) * 100}% + 6px)` }}>
            Sprint shipped
          </span>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[12.5px] text-muted">
        <span>{fmtDate(start)}</span>
        <span>{fmtDate(today)}</span>
      </div>
    </div>
  );
}
