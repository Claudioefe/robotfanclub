import { SLA, rulerPct } from "@/lib/sla";

// The citation ruler: solid bar = confirmed citations, hatched = projection to day 60.
export function Ruler({ cited, projected }: { cited: number; projected: number }) {
  const c = rulerPct(cited);
  const p = rulerPct(projected);
  const marks = [
    { value: SLA.floor, label: "floor", cls: "" },
    { value: SLA.target, label: "target", cls: "max-[560px]:!-top-[58px]" },
    { value: SLA.bonus, label: "bonus", cls: "border-l-0 border-r-2 !pl-0 pr-1.5 -translate-x-full" },
  ];
  const ticks = [0, 5, 10, 15, 20, 25, 30];

  return (
    <div className="relative mb-10 mt-16 h-[22px] max-[560px]:mt-[84px]" aria-hidden="true">
      <div className="absolute inset-0 overflow-hidden rounded bg-line">
        <i className="absolute inset-y-0 left-0 bg-cite" style={{ width: `${c}%` }} />
        <i
          className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,var(--cite)_0_2px,transparent_2px_7px)] opacity-60"
          style={{ left: `${c}%`, width: `${Math.max(0, p - c)}%` }}
        />
      </div>
      {marks.map((m) => (
        <span
          key={m.label}
          className={`absolute -bottom-1.5 -top-9 whitespace-nowrap border-l-2 border-ink pl-1.5 text-[13px] leading-tight text-muted ${m.cls}`}
          style={{ left: `${rulerPct(m.value)}%` }}
        >
          <em className="font-bold not-italic text-ink">{m.value}</em> {m.label}
        </span>
      ))}
      {ticks.map((t, i) => (
        <span
          key={t}
          className={`absolute top-[calc(100%+8px)] text-xs text-muted ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: `${rulerPct(t)}%` }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
