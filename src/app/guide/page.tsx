import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { grotesk, inter, jbmono } from "@/components/landing/fonts";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: `How it works · ${BRAND.name}`,
  description: "What Robot Fan Club measures, what counts as a citation, the 30% rule outside the top 10, how queries are chosen and what it takes for AI to cite you.",
};

const SECTIONS = [
  ["problem", "The problem"],
  ["who", "Who does what"],
  ["citations", "AI citations"],
  ["top10", "The 30% rule"],
  ["speed", "Speed"],
  ["queries", "Choosing queries"],
  ["cited", "Getting cited"],
  ["limits", "Honest limits"],
  ["next", "What’s next"],
] as const;

const grot = { fontFamily: "var(--font-grotesk), sans-serif" } as const;
const mono = { fontFamily: "var(--font-jbmono), monospace" } as const;

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
function Dot({ color }: { color: string }) {
  return <span aria-hidden="true" className="mt-2 block size-2.5 flex-none rounded-[3px]" style={{ background: color }} />;
}
function Bullets({ items, color = "#3A56F0" }: { items: ReactNode[]; color?: string }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[17px] leading-[1.55] text-[#C9CCD6]">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <Dot color={color} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const TERMS: [string, string][] = [
  ["AI Overview / AI Mode", "Google’s AI answers, with cited sources."],
  ["Query", "A specific search that is measured."],
  ["Frozen list", "The fixed queries for 60 days."],
  ["Citation", "A query where a page of yours appears among the sources, at least once in the window."],
  ["Off-top10", "A citation from a page that was not in that query’s organic top 10 that day."],
  ["Citation rate", "% of AI answers in which you were cited."],
  ["Snapshot", "The raw result of a check, kept as evidence."],
  ["INP / CrUX", "Interaction speed / Google’s public real-user data."],
  ["Credit", "20% of the fee if day 60 ends below 12 citations."],
];

export default function GuidePage() {
  return (
    <div className={`landing ${grotesk.variable} ${inter.variable} ${jbmono.variable}`} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
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
          <nav aria-label="Main" className="flex flex-wrap items-center gap-7 text-[15px] font-medium">
            <Link className="navlink" href="/">
              ← Home
            </Link>
            <Link className="navlink" href="/login">
              Sign in
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-[1000px] px-8 pb-24 pt-10">
          <div className="rise flex flex-col gap-6">
            <Eyebrow>How it works</Eyebrow>
            <h1 className="m-0 text-[clamp(44px,7vw,92px)] font-bold leading-[0.95] tracking-[-0.045em] text-balance" style={grot}>
              Proof the robots <span className="italic text-[#D7FF3A]">picked you</span>.
            </h1>
            <P className="text-[20px]">
              {BRAND.name} checks every day whether Google’s AI answers cite your pages, and how fast your site responds when someone taps it. This page explains, in plain words, what is measured, how it is counted and what it takes to win.
            </P>
          </div>

          <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-2">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="navlink rounded-full border border-[#2A2D3A] bg-[#171922] px-4 py-2 text-sm" style={mono}>
                {label}
              </a>
            ))}
          </nav>

          <Block id="problem" eyebrow="The problem" title={<>Google now answers first. And it <span className="text-[#FF5FA2]">cites</span> its sources.</>}>
            <P>
              When someone searches, above the usual results there is more and more often an <strong className="text-[#F2F0EA]">AI-written answer</strong> (AI Overview, or AI Mode when the person keeps the conversation going). That answer links to the pages it took the information from.
            </P>
            <P>If your page is one of those sources, the person sees you before anyone else. If not, they see your competitors. A classic ranking report says nothing about this.</P>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card shadow="#3A56F0">
                <p className="m-0 text-[13px] uppercase tracking-[0.08em] text-[#A5A9B8]" style={mono}>Service 1 · AIO Pro</p>
                <p className="mb-0 mt-3 text-[22px] font-bold leading-tight" style={grot}>Do Google’s AI answers cite your pages?</p>
              </Card>
              <Card shadow="#D7FF3A">
                <p className="m-0 text-[13px] uppercase tracking-[0.08em] text-[#A5A9B8]" style={mono}>Service 2 · INP Sprint</p>
                <p className="mb-0 mt-3 text-[22px] font-bold leading-tight" style={grot}>Does your site respond fast when someone taps it?</p>
              </Card>
            </div>
          </Block>

          <Block id="who" eyebrow="Who does what" title="The platform measures. People improve.">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["The platform", "Measures every day, keeps the evidence and shows it in a private portal per client.", "#3A56F0"],
                ["The team", "Chooses what to measure, reads the results and improves the content and the site.", "#FF5FA2"],
                ["The client", "Opens their read-only portal and approves the changes.", "#D7FF3A"],
              ].map(([t, d, c]) => (
                <Card key={t}>
                  <span className="block h-1.5 w-10 rounded-full" style={{ background: c }} />
                  <h3 className="mb-0 mt-4 text-[22px] font-bold" style={grot}>{t}</h3>
                  <p className="mb-0 mt-2 text-[16px] leading-[1.55] text-[#C9CCD6]">{d}</p>
                </Card>
              ))}
            </div>
            <P>The platform does not improve anything on its own. Today, choosing what to measure is also a human decision: see “Choosing queries”.</P>
          </Block>

          <Block id="citations" eyebrow="AI citations · AIO Pro" title="Freeze the list. Check every day. Count your fans.">
            <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
              {[
                ["01", "Freeze the list", "Up to 60 queries, locked for 60 days. A frozen list is never edited, so the measurement stays fair and comparable.", "#3A56F0"],
                ["02", "Check daily", "Same hour, every day, always under the same conditions: US, English, mobile. The raw result of every check is saved.", "#FF5FA2"],
                ["03", "Count citations", "A query counts once, the first time a page of yours is among the AI answer’s sources inside the window.", "#D7FF3A"],
              ].map(([n, t, d, c]) => (
                <li key={n}>
                  <Card className="h-full">
                    <span className="text-[56px] font-bold leading-none" style={{ ...grot, color: c }}>{n}</span>
                    <h3 className="mb-0 mt-3 text-[22px] font-bold" style={grot}>{t}</h3>
                    <p className="mb-0 mt-2 text-[16px] leading-[1.55] text-[#C9CCD6]">{d}</p>
                  </Card>
                </li>
              ))}
            </ol>
            <Card>
              <p className="m-0 text-[13px] uppercase tracking-[0.08em] text-[#A5A9B8]" style={mono}>The targets, per 60-day window</p>
              <div className="relative mt-5 h-6 rounded-[10px] bg-[#232633]">
                <div className="absolute inset-y-0 left-0 rounded-[10px] bg-[#D7FF3A]" style={{ width: "72%" }} />
                <span className="absolute -top-1.5 h-9 w-[3px] rounded bg-[#FF5FA2]" style={{ left: "48%" }} />
                <span className="absolute -top-1.5 h-9 w-[3px] rounded bg-[#F2F0EA]" style={{ left: "72%" }} />
              </div>
              <div className="relative mt-3 h-5 text-[13px] text-[#A5A9B8]" style={mono}>
                <span className="absolute left-0">0</span>
                <span className="absolute -translate-x-1/2" style={{ left: "48%" }}>floor 12</span>
                <span className="absolute -translate-x-1/2" style={{ left: "72%" }}>target 18</span>
                <span className="absolute right-0">bonus 25</span>
              </div>
            </Card>
            <Bullets
              items={[
                <>Floor <strong className="text-[#F2F0EA]">12</strong>, target <strong className="text-[#F2F0EA]">18</strong>, bonus <strong className="text-[#F2F0EA]">25</strong> citations per 60-day window.</>,
                <>Under 12 on day 60? <strong className="text-[#F2F0EA]">20% of the fee comes back as credit</strong> (credit, not a refund).</>,
                <>The <strong className="text-[#F2F0EA]">citation rate</strong> is always on screen: of all the checks where Google answered with AI, the share where you were picked.</>,
              ]}
            />
          </Block>

          <Block id="top10" eyebrow="The 30% rule" title="A citation from outside the top 10 is the real proof.">
            <P>
              For each query Google also shows the usual 10 organic results. A citation is <strong className="text-[#F2F0EA]">off-top10</strong> when the cited page was <em>not</em> among those 10 results that same day (compared by the page’s exact address, not by site). At least <strong className="text-[#F2F0EA]">30% of the citations</strong> must be off-top10.
            </P>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <p className="m-0 text-[13px] uppercase tracking-[0.08em] text-[#A5A9B8]" style={mono}>Organic results · same query, same day</p>
                <ol className="mb-0 mt-4 flex list-none flex-col gap-1.5 p-0 text-[15px] text-[#C9CCD6]" style={mono}>
                  {["competitor-a.com", "competitor-b.com", "competitor-c.com"].map((d, i) => (
                    <li key={d} className="flex gap-3"><span className="w-6 text-[#A5A9B8]">{i + 1}</span>{d}</li>
                  ))}
                  <li className="text-[#A5A9B8]">… up to 10</li>
                  <li className="mt-1 flex gap-3 rounded-lg bg-[#232633] px-2 py-1.5 text-[#D7FF3A]"><span className="w-6">34</span>yoursite.com/emergency</li>
                </ol>
              </Card>
              <Card shadow="#FF5FA2">
                <p className="m-0 text-[13px] uppercase tracking-[0.08em] text-[#A5A9B8]" style={mono}>AI answer · sources</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[14px]" style={mono}>
                  <span className="rounded-full bg-[#232633] px-3 py-1.5 text-[#C9CCD6]">someone-else.com</span>
                  <span className="rounded-full border-2 border-[#D7FF3A] bg-[#232633] px-3 py-1.5 text-[#D7FF3A]">yoursite.com/emergency</span>
                </div>
                <p className="mb-0 mt-4 text-[16px] leading-[1.55] text-[#C9CCD6]">The AI cited you from position 34. That is <strong className="text-[#F2F0EA]">off-top10</strong>: it picked you for your content, not because you were already first.</p>
              </Card>
            </div>
            <Bullets color="#D7FF3A" items={["It proves the AI chose you for what your page says, not only because Google already ranked you first.", "It avoids counting citations a client would have received anyway."]} />
            <Card>
              <p className="m-0 text-[13px] uppercase tracking-[0.08em] text-[#A5A9B8]" style={mono}>One query, 60 days</p>
              <ul className="mb-0 mt-4 flex list-none flex-col gap-3 p-0 text-[16px] leading-[1.55] text-[#C9CCD6]">
                <li><strong className="text-[#D7FF3A]" style={mono}>Day 12</strong> · Google answers with AI and cites your page. The query becomes <strong className="text-[#F2F0EA]">one citation</strong>.</li>
                <li><strong className="text-[#D7FF3A]" style={mono}>Day 13+</strong> · It keeps citing you. It does <strong className="text-[#F2F0EA]">not</strong> add another citation, but the citation rate goes up.</li>
                <li><strong className="text-[#D7FF3A]" style={mono}>Day 60</strong> · 14 citations, 5 of them off-top10 (36%): the floor and the 30% rule are met.</li>
              </ul>
            </Card>
          </Block>

          <Block id="speed" eyebrow="Speed · INP Sprint" title="Fast when it counts: when someone taps.">
            <P>
              <strong className="text-[#F2F0EA]">INP</strong> (Interaction to Next Paint) is how long the site takes to react when someone taps, clicks or types. Google uses it as an experience signal.
            </P>
            <Bullets
              color="#D7FF3A"
              items={[
                <>Measured <strong className="text-[#F2F0EA]">on mobile</strong>, with real visitors (a small script on the site) and with Google’s public field data (CrUX).</>,
                <>Goal: INP p75 at or under <strong className="text-[#F2F0EA]">200 ms</strong>, held for <strong className="text-[#F2F0EA]">two full 28-day windows</strong> after the work ships.</>,
                <>Third-party scripts the client decides to keep (for example a consent banner) sit <strong className="text-[#F2F0EA]">outside the guarantee</strong>. Tag Bouncer lets the client decide which scripts get in.</>,
              ]}
            />
          </Block>

          <Block id="queries" eyebrow="Choosing queries" title="The most important decision is made by a person, today.">
            <P>The result depends on which queries are measured. Today the team picks the list and loads it by hand in the Admin. A good list has:</P>
            <Bullets
              items={[
                <><strong className="text-[#F2F0EA]">Searches that bring customers</strong>, not just the most popular ones: real buying or research intent.</>,
                <><strong className="text-[#F2F0EA]">Questions and long tail</strong> (“how to choose…”, “best X for Y”), which trigger AI answers most.</>,
                <><strong className="text-[#F2F0EA]">Queries where you have a real chance.</strong> A new site against giants will hardly reach 12 citations.</>,
                <>Each one can be <strong className="text-[#F2F0EA]">improved with a specific page</strong>.</>,
              ]}
            />
            <P>
              Ideas come from the client’s Search Console (queries with impressions and position 4 to 20, questions and long tail), from the questions Google already ties to the domain, and from what the client wants to win. Today Search Console is exported and pasted by hand: there is no automatic connection.
            </P>
          </Block>

          <Block id="cited" eyebrow="Getting cited" title="What it takes for the robots to pick you.">
            <P>The platform does not do this part; the team does. According to Google, there is no special markup for AI: SEO fundamentals apply.</P>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Indexed and eligible", "A page that is not indexed, or cannot show a snippet, cannot be cited."],
                ["One page per query", "Answer the question directly: a clear answer up front, clean headings, concrete facts."],
                ["Authority and trust", "Structured data where it fits, mentions and reviews."],
                ["A fast site", "Good INP makes every visit better, including the ones the AI sends."],
              ].map(([t, d]) => (
                <Card key={t}>
                  <h3 className="m-0 text-[20px] font-bold" style={grot}>{t}</h3>
                  <p className="mb-0 mt-2 text-[16px] leading-[1.55] text-[#C9CCD6]">{d}</p>
                </Card>
              ))}
            </div>
            <P>The portal shows where to work: the <strong className="text-[#F2F0EA]">gap</strong> view lists the queries where the AI answers but cites others, and whom. If a query starts citing you after a change, you see it.</P>
          </Block>

          <Block id="limits" eyebrow="Honest limits" title="What this is not.">
            <Bullets
              color="#FF5FA2"
              items={[
                <><strong className="text-[#F2F0EA]">It does not promise positions or specific citations.</strong> It measures, and gives a defined guarantee: a floor of 12, or credit.</>,
                <><strong className="text-[#F2F0EA]">It does not cover ChatGPT or other AIs in the guarantee.</strong> That part is an informational module, with its date, outside the SLA.</>,
                <><strong className="text-[#F2F0EA]">It does not index pages or fix the site.</strong> It measures; the work is the team’s.</>,
              ]}
            />
          </Block>

          <Block id="next" eyebrow="What’s next" title="An AI advisor. Not built yet.">
            <P>Choosing queries and deciding what to improve depends on the team’s experience. The plan is an AI layer that advises, always with a person reviewing:</P>
            <Bullets
              color="#8FA2FF"
              items={[
                <><strong className="text-[#F2F0EA]">Propose what to measure,</strong> from real data, with the reason for each query.</>,
                <><strong className="text-[#F2F0EA]">Explain why you are not cited,</strong> by comparing the AI answer, the cited pages and yours.</>,
                <><strong className="text-[#F2F0EA]">Recommend content improvements</strong> per page.</>,
                <><strong className="text-[#F2F0EA]">Close the loop:</strong> see whether the query started citing you after the change.</>,
              ]}
            />
            <P className="text-[#A5A9B8]">This is an intention, not a feature yet.</P>
          </Block>

          <section className="pt-24" aria-label="Glossary">
            <Eyebrow>Glossary</Eyebrow>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {TERMS.map(([t, d]) => (
                <div key={t} className="rounded-2xl border border-[#2A2D3A] bg-[#171922] px-5 py-4">
                  <dt className="text-[15px] font-bold text-[#D7FF3A]" style={mono}>{t}</dt>
                  <dd className="m-0 mt-1 text-[15px] leading-[1.5] text-[#C9CCD6]">{d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-20 flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[#D7FF3A] px-8 py-7 text-[#0E0F13]">
            <p className="m-0 text-[clamp(22px,3vw,32px)] font-bold leading-tight tracking-[-0.03em]" style={grot}>Ready to make the robots your biggest fans?</p>
            <Link href="/#join" className="cta rounded-full bg-[#0E0F13] px-7 py-4 text-[17px] font-semibold no-underline" style={{ color: "#D7FF3A" }}>
              Start a fan club
            </Link>
          </div>
        </main>

        <footer className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 border-t border-[#2A2D3A] px-8 pb-12 pt-6 text-sm text-[#A5A9B8]">
          <span>© {BRAND.name}</span>
          <span style={mono}>Measured in the US · English · mobile · same hour daily</span>
        </footer>
      </div>
    </div>
  );
}
