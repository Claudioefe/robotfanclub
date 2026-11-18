import { SLA } from "@/lib/sla";
import { fmtDate } from "@/lib/format";
import type { CruxPoint } from "@/lib/portal/data";

// INP p75 from Google's Chrome UX Report over time. Each point is a 28-day window, so neighbours overlap.
// Server-rendered SVG, no chart library.
export function CruxTrend({ points, deployedOn }: { points: CruxPoint[]; deployedOn: string | null }) {
  if (!points.length) return null;
  const W = 560;
  const H = 180;
  const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const first = t(points[0].periodEnd);
  const last = t(points[points.length - 1].periodEnd);
  const span = Math.max(last - first, 864e5);
  const x = (iso: string) => (points.length === 1 ? W / 2 : ((t(iso) - first) / span) * W);

  const values = points.map((p) => p.inpMs);
  const lo = Math.min(150, Math.floor(Math.min(...values) / 10) * 10 - 10);
  const hi = Math.max(Math.ceil(Math.max(...values) / 10) * 10 + 10, SLA.inpGoalMs + 30);
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const line = points.map((p) => `${x(p.periodEnd).toFixed(1)},${y(p.inpMs).toFixed(1)}`).join(" ");
  const shipped = deployedOn && t(deployedOn) >= first && t(deployedOn) <= last ? x(deployedOn) : null;
  const latest = points[points.length - 1];

  return (
    <div className="rounded-xl border border-line bg-surface px-[18px] pb-3 pt-[18px]">
      <div className="relative h-[180px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Mobile INP p75 from Google field data: ${points[0].inpMs} ms to ${latest.inpMs} ms over ${points.length} periods`}
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <line x1="0" x2={W} y1={y(SLA.inpGoalMs)} y2={y(SLA.inpGoalMs)} stroke="var(--off)" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          {shipped !== null && <line x1={shipped} x2={shipped} y1="0" y2={H} stroke="var(--muted)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          <polyline points={line} fill="none" stroke="var(--cite)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {points.map((p) => (
            <circle key={p.periodEnd} cx={x(p.periodEnd)} cy={y(p.inpMs)} r="3" fill="var(--cite)" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <span className="absolute right-0 -translate-y-[120%] whitespace-nowrap text-[12.5px] text-off" style={{ top: `${(y(SLA.inpGoalMs) / H) * 100}%` }}>
          200 ms goal
        </span>
        {shipped !== null && (
          <span className="absolute top-3.5 whitespace-nowrap text-[12.5px] text-muted" style={{ left: `calc(${(shipped / W) * 100}% + 6px)` }}>
            Sprint shipped
          </span>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[12.5px] text-muted">
        <span>28 days to {fmtDate(points[0].periodEnd)}</span>
        <span>28 days to {fmtDate(latest.periodEnd)}</span>
      </div>
    </div>
  );
}

