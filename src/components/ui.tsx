import type { ReactNode } from "react";
import type { Tone } from "@/lib/sla";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

/** Horizontal meter. `mark` draws a vertical line at a percentage (for example the 30% goal). */
export function Meter({ value, mark, tone = "off" }: { value: number; mark?: number; tone?: "off" | "cite" }) {
  return (
    <div className="relative my-4 h-2.5 rounded-full bg-line" aria-hidden="true">
      <i
        className={`absolute inset-y-0 left-0 rounded-full ${tone === "cite" ? "bg-cite" : "bg-off"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      {mark !== undefined && <b className="absolute -inset-y-1 border-l-2 border-ink" style={{ left: `${mark}%` }} />}
    </div>
  );
}

const TONE_CLASS: Record<Tone, string> = { good: "text-off", neutral: "text-ink", bad: "text-bad" };
export function Status({ tone, children, className = "" }: { tone: Tone; children: ReactNode; className?: string }) {
  return <p className={`max-w-[64ch] text-base ${TONE_CLASS[tone]} ${className}`}>{children}</p>;
}

type BadgeKind = "off" | "top" | "bad";
const BADGE_CLASS: Record<BadgeKind, string> = {
  off: "bg-off-soft text-off",
  top: "bg-cite-soft text-cite",
  bad: "bg-bad-soft text-bad",
};
export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-px text-[12.5px] font-semibold ${BADGE_CLASS[kind]}`}>
      {children}
    </span>
  );
}

export const Dim = ({ children }: { children: ReactNode }) => <span className="text-muted">{children}</span>;

export function PageHeader({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <header>
      <h1 className="text-[clamp(22px,2.4vw,28px)] font-semibold leading-tight tracking-tight">{title}</h1>
      {sub && <p className="mt-1 max-w-[68ch] text-muted">{sub}</p>}
    </header>
  );
}

export function Lede({ big, small }: { big: ReactNode; small?: ReactNode }) {
  return (
    <>
      <p className="mb-2.5 mt-10 max-w-[20ch] text-[clamp(32px,5.4vw,56px)] font-semibold leading-[1.04] tracking-tighter">{big}</p>
      {small && <p className="max-w-[38ch] text-[clamp(18px,2.2vw,24px)] font-medium leading-snug text-muted">{small}</p>}
    </>
  );
}

export function TableWrap({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}
export const Th = ({ children }: { children?: ReactNode }) => (
  <th className="whitespace-nowrap border-b border-line px-3.5 py-2.5 text-left text-[13px] font-semibold text-muted">{children}</th>
);
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`border-b border-line px-3.5 py-2.5 align-middle ${className}`}>{children}</td>
);

export const Section = ({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) => (
  <section className="mt-12">
    <h2 className="text-[17px] font-semibold leading-snug">{title}</h2>
    {note && <p className="mb-3.5 mt-0.5 max-w-[70ch] text-[13.5px] text-muted">{note}</p>}
    {children}
  </section>
);

export const buttonClass = (ghost = false, small = false) =>
  `inline-flex cursor-pointer items-center rounded-lg border border-cite font-semibold leading-snug ${
    small ? "px-2.5 py-1 text-[13px]" : "px-4 py-2 text-sm"
  } ${ghost ? "bg-transparent text-cite" : "bg-cite text-on-cite"}`;
