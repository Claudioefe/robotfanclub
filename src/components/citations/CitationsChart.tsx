import { SLA } from "@/lib/sla";
import type { DayPoint } from "@/lib/portal/data";

// Citations over the window: the line is what the SLA counts (queries cited at least once so far), the bars are how many
// queries were cited on each single day. Plain SVG, no chart library. The x axis always spans the whole window, so the days
// that have not happened yet are visible as empty space.

const W = 960;
const H = 250;
const PAD = { l: 34, r: 92, t: 14, b: 30 };

export function CitationsChart({ daily, windowDays = SLA.windowDays }: { daily: DayPoint[]; windowDays?: number }) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxData = Math.max(0, ...daily.map((d) => d.cumulative), ...daily.map((d) => d.citedThatDay));
  const yMax = Math.max(SLA.bonus + 2, Math.ceil((maxData + 1) / 5) * 5);
  const step = plotW / windowDays;
  const x = (i: number) => PAD.l + (i + 0.5) * step;
  const y = (v: number) => PAD.t + plotH - (v / yMax) * plotH;

  const marks = [
    { value: SLA.floor, label: "floor" },
    { value: SLA.target, label: "target" },
    { value: SLA.bonus, label: "bonus" },
  ];
  const yTicks = Array.from({ length: Math.floor(yMax / 5) + 1 }, (_, i) => i * 5);
  const xTicks = [1, 10, 20, 30, 40, 50, 60].filter((d) => d <= windowDays);
  // Days with no stored check at all are left out: the line joins the days around a gap and stops at the last checked day.
  const points = daily.map((d, i) => ({ d, i })).filter((p) => p.d.checked);
  const line = points.map((p, n) => `${n === 0 ? "M" : "L"}${x(p.i).toFixed(1)} ${y(p.d.cumulative).toFixed(1)}`).join(" ");
  const lastPoint = points.at(-1)?.d;
  const lastIndex = points.at(-1)?.i ?? 0;
  const summary = lastPoint
    ? `Citations over the window. After day ${lastIndex + 1}: ${lastPoint.cumulative} queries cited at least once (the SLA count), ${lastPoint.citedThatDay} cited on the last day.`
    : "No checks stored yet.";

  return (
    <figure className="m-0">
      {/* On a phone the chart keeps a readable size and scrolls sideways instead of shrinking its labels. */}
      <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-auto w-full min-w-[640px]">
        <title>{summary}</title>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={t === 0 ? 1.5 : 1} opacity={t === 0 ? 1 : 0.5} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="var(--font-jbmono), monospace">
              {t}
            </text>
          </g>
        ))}
        {marks.map((m) => (
          <g key={m.label}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(m.value)} y2={y(m.value)} stroke="var(--ink)" strokeWidth="1" strokeDasharray="5 4" opacity="0.55" />
            <text x={W - PAD.r + 6} y={y(m.value) + 4} fontSize="11.5" fill="var(--ink)" fontFamily="var(--font-jbmono), monospace">
              {m.value} {m.label}
            </text>
          </g>
        ))}
        {daily.map((d, i) =>
          d.checked && d.citedThatDay ? (
            <rect key={d.day} x={x(i) - step * 0.3} y={y(d.citedThatDay)} width={step * 0.6} height={y(0) - y(d.citedThatDay)} fill="var(--cite)" opacity="0.55">
              <title>{`${d.day}: ${d.citedThatDay} queries cited that day, ${d.cumulative} so far`}</title>
            </rect>
          ) : null,
        )}
        {points.length > 0 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {lastPoint && <circle cx={x(lastIndex)} cy={y(lastPoint.cumulative)} r="4.5" fill="var(--accent)" />}
        {xTicks.map((d) => (
          <text key={d} x={x(d - 1)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="var(--font-jbmono), monospace">
            {d === 1 ? "day 1" : d}
          </text>
        ))}
      </svg>
      </div>
      <figcaption className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="block h-[3px] w-4 rounded bg-accent" aria-hidden="true" />
          Queries cited so far (what the SLA counts)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="block h-[9px] w-[9px] rounded-[1px] bg-cite/60" aria-hidden="true" />
          Queries cited on that day
        </span>
      </figcaption>
    </figure>
  );
}
