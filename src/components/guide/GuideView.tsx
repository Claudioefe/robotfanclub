import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import "@/components/landing/landing.css";
import { COPY, LANGS, type Lang } from "./copy";

const grot = { fontFamily: "var(--font-grotesk), sans-serif" } as const;
const mono = { fontFamily: "var(--font-jbmono), monospace" } as const;

/** Text with light markup: **bold**, [[pink]], ~~lime italic~~. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*.+?\*\*|\[\[.+?\]\]|~~.+?~~)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i} className="text-[#F2F0EA]">{part.slice(2, -2)}</strong>;
    if (part.startsWith("[[")) return <span key={i} className="text-[#FF5FA2]">{part.slice(2, -2)}</span>;
    if (part.startsWith("~~")) return <span key={i} className="italic text-[#D7FF3A]">{part.slice(2, -2)}</span>;
    return part;
  });
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-sm uppercase tracking-[0.08em] text-[#D7FF3A]" style={mono}>
      {children}
    </p>
  );
}
function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="m-0 text-[clamp(32px,4vw,52px)] font-bold leading-none tracking-[-0.035em] text-balance" style={grot}>
      {children}
    </h2>
  );
}
function P({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`m-0 max-w-[68ch] text-[18px] leading-[1.6] text-[#C9CCD6] ${className}`}>{children}</p>;
}
function Card({ children, className = "", shadow }: { children: ReactNode; className?: string; shadow?: string }) {
  return (
    <div className={`rounded-3xl border border-[#2A2D3A] bg-[#171922] p-7 ${className}`} style={shadow ? { boxShadow: `12px 12px 0 ${shadow}` } : undefined}>
      {children}
    </div>
  );
}
function Label({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[13px] uppercase tracking-[0.08em] text-[#A5A9B8]" style={mono}>
      {children}
    </p>
  );
}
function Block({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-6 pt-24">
      <div className="flex flex-col gap-4">
        <Eyebrow>{eyebrow}</Eyebrow>
        <H2>{title}</H2>
      </div>
      {children}
    </section>
  );
}
function Bullets({ items, color = "#3A56F0" }: { items: string[]; color?: string }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[17px] leading-[1.55] text-[#C9CCD6]">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span aria-hidden="true" className="mt-2 block size-2.5 flex-none rounded-[3px]" style={{ background: color }} />
          <span>{rich(t)}</span>
        </li>
      ))}
    </ul>
  );
}

const WHO_COLORS = ["#3A56F0", "#FF5FA2", "#D7FF3A"];

/** The public explanation page. `fontClass` carries the next/font variables (set by the route, so this stays testable). */
export function GuideView({ lang, fontClass = "" }: { lang: Lang; fontClass?: string }) {
  const t = COPY[lang];
  return (
    <div lang={t.htmlLang} className={`landing ${fontClass}`} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div className="arena">
        <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-8 py-6">
          <Link href="/" className="flex items-center gap-3 no-underline" style={{ color: "#F2F0EA" }}>
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <line x1="20" y1="2" x2="20" y2="9" stroke="#D7FF3A" strokeWidth="3" strokeLinecap="round" />
              <circle className="pulse" cx="20" cy="3" r="3" fill="#FF5FA2" />
              <rect x="4" y="9" width="32" height="27" rx="9" fill="#3A56F0" />
              <rect x="9" y="15" width="22" height="14" rx="5" fill="#0E0F13" />
              <g className="blink">
                <circle cx="15" cy="22" r="2.6" fill="#D7FF3A" />
                <circle cx="25" cy="22" r="2.6" fill="#D7FF3A" />
              </g>
            </svg>
            <span className="text-xl font-bold tracking-[-0.01em]" style={grot}>
              {BRAND.name}
            </span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-6 text-[15px] font-medium">
            <Link className="navlink" href="/">
              {t.home}
            </Link>
            <Link className="navlink" href="/login">
              {t.signIn}
            </Link>
            <div role="group" aria-label={t.langLabel} className="flex overflow-hidden rounded-full border border-[#3A3E4E] text-[13px]" style={mono}>
              {LANGS.map((l) => (
                <Link
                  key={l}
                  href={l === "en" ? "/guide" : `/guide?lang=${l}`}
                  hrefLang={l}
                  lang={l}
                  aria-current={l === lang ? "true" : undefined}
                  className="px-3 py-1.5 font-bold uppercase no-underline"
                  style={l === lang ? { background: "#D7FF3A", color: "#0E0F13" } : { color: "#A5A9B8" }}
                >
                  {l}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-[1000px] px-8 pb-24 pt-10">
          <div className="rise flex flex-col gap-6">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h1 className="m-0 text-[clamp(44px,7vw,92px)] font-bold leading-[0.95] tracking-[-0.045em] text-balance" style={grot}>
              {rich(t.h1)}
            </h1>
            <P className="text-[20px]">{t.lead}</P>
          </div>

          <nav aria-label={t.toc} className="mt-10 flex flex-wrap gap-2">
            {t.sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="navlink rounded-full border border-[#2A2D3A] bg-[#171922] px-4 py-2 text-sm" style={mono}>
                {label}
              </a>
            ))}
          </nav>

          <Block id="problem" eyebrow={t.problem.eyebrow} title={rich(t.problem.title)}>
            <P>{rich(t.problem.p1)}</P>
            <P>{t.problem.p2}</P>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [t.problem.s1, "#3A56F0"],
                [t.problem.s2, "#D7FF3A"],
              ].map(([[label, q], shadow]) => (
                <Card key={label as string} shadow={shadow as string}>
                  <Label>{label as string}</Label>
                  <p className="mb-0 mt-3 text-[22px] font-bold leading-tight" style={grot}>{q as string}</p>
                </Card>
              ))}
            </div>
          </Block>

          <Block id="who" eyebrow={t.who.eyebrow} title={t.who.title}>
            <div className="grid gap-4 sm:grid-cols-3">
              {t.who.cards.map(([title, body], i) => (
                <Card key={title}>
                  <span className="block h-1.5 w-10 rounded-full" style={{ background: WHO_COLORS[i] }} />
                  <h3 className="mb-0 mt-4 text-[22px] font-bold" style={grot}>{title}</h3>
                  <p className="mb-0 mt-2 text-[16px] leading-[1.55] text-[#C9CCD6]">{body}</p>
                </Card>
              ))}
            </div>
            <P>{t.who.note}</P>
          </Block>

          <Block id="citations" eyebrow={t.citations.eyebrow} title={t.citations.title}>
            <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
              {t.citations.steps.map(([title, body], i) => (
                <li key={title}>
                  <Card className="h-full">
                    <span className="text-[56px] font-bold leading-none" style={{ ...grot, color: WHO_COLORS[i] }}>{`0${i + 1}`}</span>
                    <h3 className="mb-0 mt-3 text-[22px] font-bold" style={grot}>{title}</h3>
                    <p className="mb-0 mt-2 text-[16px] leading-[1.55] text-[#C9CCD6]">{body}</p>
                  </Card>
                </li>
              ))}
            </ol>
            <Card>
              <Label>{t.citations.targetsLabel}</Label>
              <div className="relative mt-5 h-6 rounded-[10px] bg-[#232633]">
                <div className="absolute inset-y-0 left-0 rounded-[10px] bg-[#D7FF3A]" style={{ width: "72%" }} />
                <span className="absolute -top-1.5 h-9 w-[3px] rounded bg-[#FF5FA2]" style={{ left: "48%" }} />
                <span className="absolute -top-1.5 h-9 w-[3px] rounded bg-[#F2F0EA]" style={{ left: "72%" }} />
              </div>
              <div className="relative mt-3 h-5 text-[13px] text-[#A5A9B8]" style={mono}>
                <span className="absolute left-0">0</span>
                <span className="absolute -translate-x-1/2" style={{ left: "48%" }}>{t.citations.floor}</span>
                <span className="absolute -translate-x-1/2" style={{ left: "72%" }}>{t.citations.target}</span>
                <span className="absolute right-0">{t.citations.bonus}</span>
              </div>
            </Card>
            <Bullets items={t.citations.bullets} />
          </Block>

          <Block id="top10" eyebrow={t.top10.eyebrow} title={t.top10.title}>
            <P>{rich(t.top10.p)}</P>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <Label>{t.top10.organicLabel}</Label>
                <ol className="mb-0 mt-4 flex list-none flex-col gap-1.5 p-0 text-[15px] text-[#C9CCD6]" style={mono}>
                  {["competitor-a.com", "competitor-b.com", "competitor-c.com"].map((d, i) => (
                    <li key={d} className="flex gap-3"><span className="w-6 text-[#A5A9B8]">{i + 1}</span>{d}</li>
                  ))}
                  <li className="text-[#A5A9B8]">{t.top10.upTo}</li>
                  <li className="mt-1 flex gap-3 rounded-lg bg-[#232633] px-2 py-1.5 text-[#D7FF3A]"><span className="w-6">34</span>yoursite.com/emergency</li>
                </ol>
              </Card>
              <Card shadow="#FF5FA2">
                <Label>{t.top10.aiLabel}</Label>
                <div className="mt-4 flex flex-wrap gap-2 text-[14px]" style={mono}>
                  <span className="rounded-full bg-[#232633] px-3 py-1.5 text-[#C9CCD6]">someone-else.com</span>
                  <span className="rounded-full border-2 border-[#D7FF3A] bg-[#232633] px-3 py-1.5 text-[#D7FF3A]">yoursite.com/emergency</span>
                </div>
                <p className="mb-0 mt-4 text-[16px] leading-[1.55] text-[#C9CCD6]">{rich(t.top10.aiText)}</p>
              </Card>
            </div>
            <Bullets color="#D7FF3A" items={t.top10.bullets} />
            <Card>
              <Label>{t.top10.exampleLabel}</Label>
              <ul className="mb-0 mt-4 flex list-none flex-col gap-3 p-0 text-[16px] leading-[1.55] text-[#C9CCD6]">
                {t.top10.days.map(([day, text]) => (
                  <li key={day}><strong className="text-[#D7FF3A]" style={mono}>{day}</strong> · {rich(text)}</li>
                ))}
              </ul>
            </Card>
          </Block>

          <Block id="speed" eyebrow={t.speed.eyebrow} title={t.speed.title}>
            <P>{rich(t.speed.p)}</P>
            <Bullets color="#D7FF3A" items={t.speed.bullets} />
          </Block>

          <Block id="queries" eyebrow={t.queries.eyebrow} title={t.queries.title}>
            <P>{t.queries.p1}</P>
            <Bullets items={t.queries.bullets} />
            <P>{t.queries.p2}</P>
          </Block>

          <Block id="cited" eyebrow={t.cited.eyebrow} title={t.cited.title}>
            <P>{t.cited.p1}</P>
            <div className="grid gap-4 sm:grid-cols-2">
              {t.cited.cards.map(([title, body]) => (
                <Card key={title}>
                  <h3 className="m-0 text-[20px] font-bold" style={grot}>{title}</h3>
                  <p className="mb-0 mt-2 text-[16px] leading-[1.55] text-[#C9CCD6]">{body}</p>
                </Card>
              ))}
            </div>
            <P>{rich(t.cited.p2)}</P>
          </Block>

          <Block id="limits" eyebrow={t.limits.eyebrow} title={t.limits.title}>
            <Bullets color="#FF5FA2" items={t.limits.bullets} />
          </Block>

          <Block id="next" eyebrow={t.next.eyebrow} title={t.next.title}>
            <P>{t.next.p}</P>
            <Bullets color="#8FA2FF" items={t.next.bullets} />
            <P className="text-[#A5A9B8]">{t.next.note}</P>
          </Block>

          <section className="pt-24" aria-label={t.glossary.eyebrow}>
            <Eyebrow>{t.glossary.eyebrow}</Eyebrow>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {t.glossary.terms.map(([term, def]) => (
                <div key={term} className="rounded-2xl border border-[#2A2D3A] bg-[#171922] px-5 py-4">
                  <dt className="text-[15px] font-bold text-[#D7FF3A]" style={mono}>{term}</dt>
                  <dd className="m-0 mt-1 text-[15px] leading-[1.5] text-[#C9CCD6]">{def}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-20 flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[#D7FF3A] px-8 py-7 text-[#0E0F13]">
            <p className="m-0 text-[clamp(22px,3vw,32px)] font-bold leading-tight tracking-[-0.03em]" style={grot}>{t.cta.text}</p>
            <Link href="/#join" className="cta rounded-full bg-[#0E0F13] px-7 py-4 text-[17px] font-semibold no-underline" style={{ color: "#D7FF3A" }}>
              {t.cta.button}
            </Link>
          </div>
        </main>

        <footer className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 border-t border-[#2A2D3A] px-8 pb-12 pt-6 text-sm text-[#A5A9B8]">
          <span>© {BRAND.name}</span>
          <span style={mono}>{t.footer}</span>
        </footer>
      </div>
    </div>
  );
}
