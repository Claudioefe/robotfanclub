import Link from "next/link";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/sla";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

/** Small mono label above a block (landing style, kept quiet). */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-mono text-xs uppercase tracking-[0.08em] text-muted ${className}`}>{children}</p>;
}

/** One key figure: label, big value, a line of context, and optionally a meter or link underneath. */
export function Stat({ label, value, unit, note, children }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; children?: ReactNode }) {
  return (
    <Panel className="flex flex-col">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-3 font-display text-[40px] font-bold leading-none tracking-tight">
        {value}
        {unit && <span className="ml-1.5 text-base font-medium tracking-normal text-muted">{unit}</span>}
      </p>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
      {children}
    </Panel>
  );
}

/** Horizontal meter. `mark` draws a vertical line at a percentage (for example the 30% goal). */
export function Meter({ value, mark, tone = "off" }: { value: number; mark?: number; tone?: "off" | "cite" }) {
  return (
    <div className="relative my-4 h-2 rounded-full bg-line" aria-hidden="true">
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

export function PageHeader({ title, sub, eyebrow }: { title: string; sub?: ReactNode; eyebrow?: string }) {
  return (
    <header className="border-b border-line pb-6">
      {eyebrow && <p className="mb-2 font-mono text-xs uppercase tracking-[0.08em] text-accent">{eyebrow}</p>}
      <h1 className="text-[clamp(26px,3vw,34px)] font-bold leading-tight tracking-tight">{title}</h1>
      {sub && <p className="mt-1.5 max-w-[68ch] text-muted">{sub}</p>}
    </header>
  );
}

export function Lede({ big, small }: { big: ReactNode; small?: ReactNode }) {
  return (
    <>
      <p className="mb-2 mt-7 max-w-[24ch] font-display text-[clamp(30px,4.4vw,46px)] font-bold leading-[1.05] tracking-tighter">{big}</p>
      {small && <p className="max-w-[52ch] text-base leading-snug text-muted">{small}</p>}
    </>
  );
}

export function TableWrap({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full border-collapse text-sm [&_tbody_tr:hover]:bg-[rgba(242,240,234,0.03)] [&_tbody_tr:last-child_td]:border-b-0" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}
export const Th = ({ children }: { children?: ReactNode }) => (
  <th className="whitespace-nowrap border-b border-line px-3.5 py-3 text-left font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted">{children}</th>
);
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`border-b border-line px-3.5 py-2.5 align-middle ${className}`}>{children}</td>
);

export const Section = ({ title, note, children, id }: { title: string; note?: ReactNode; children: ReactNode; id?: string }) => (
  <section id={id} className="mt-12 scroll-mt-6">
    <h2 className="text-xl font-bold leading-snug tracking-tight">{title}</h2>
    {note && <p className="mb-3.5 mt-0.5 max-w-[70ch] text-[13.5px] text-muted">{note}</p>}
    {children}
  </section>
);

export const buttonClass = (ghost = false, small = false) =>
  `inline-flex cursor-pointer items-center rounded-full border font-semibold leading-snug ${
    small ? "px-2.5 py-1 text-[13px]" : "px-4 py-2 text-sm"
  } ${ghost ? "bg-transparent text-ink border-line hover:border-muted" : "border-accent bg-accent text-on-accent"}`;

/** "Showing 26 to 50 of 80" with previous / next and a way to see everything. `href` builds the link for a page ("all" included). */
export function Pager({ from, to, total, page, pages, all, href }: { from: number; to: number; total: number; page: number; pages: number; all: boolean; href: (p: number | "all") => string }) {
  if (total === 0) return null;
  const link = "rounded-full border border-line px-3 py-1 font-mono text-[12.5px] no-underline hover:border-muted";
  const off = "rounded-full border border-line px-3 py-1 font-mono text-[12.5px] text-muted opacity-40";
  return (
    <nav aria-label="Pages" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
      <span className="mr-2">
        Showing {from} to {to} of {total}
      </span>
      {!all && pages > 1 && (
        <>
          {page > 1 ? (
            <Link href={href(page - 1)} className={link} scroll={false}>
              ← Previous
            </Link>
          ) : (
            <span className={off}>← Previous</span>
          )}
          <span className="font-mono text-[12.5px]">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1)} className={link} scroll={false}>
              Next →
            </Link>
          ) : (
            <span className={off}>Next →</span>
          )}
        </>
      )}
      {pages > 1 && !all && (
        <Link href={href("all")} className={`${link} ml-auto`} scroll={false}>
          Show all
        </Link>
      )}
      {all && total > 25 && (
        <Link href={href(1)} className={link} scroll={false}>
          Back to pages
        </Link>
      )}
    </nav>
  );
}
