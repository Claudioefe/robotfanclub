import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: "See whether Google’s AI answers cite your site, and how fast your site responds to real people. Proof you can check, every day.",
};

const FEATURES = [
  {
    title: "AI citations",
    body: "A frozen list of buying-intent queries is checked every day in Google AI Overviews and AI Mode (US, English, on a phone). Every check keeps its raw evidence, so a citation is something you can open and verify.",
  },
  {
    title: "Real speed",
    body: "Interaction to Next Paint on mobile, from real visitors and from Google’s own field data, against the 200 ms goal. You see which pages and which third-party scripts hold it back.",
  },
  {
    title: "One clear rule",
    body: "A query counts once, the first time your site appears among the AI answer’s sources inside a 60-day window. Seeing it again does not add to the count, and the share from pages outside the top 10 is shown too.",
  },
];

const STEPS = [
  ["Freeze the list", "Up to 60 queries that matter, locked for 60 days so the measurement stays comparable."],
  ["We check every day", "Same place, same device, same hour. Nothing is scraped by hand: the results come from a SERP data provider."],
  ["You see the proof", "A private portal per client, read-only: citations, evidence, speed and what changed."],
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-5">
        <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
        <nav className="ml-auto flex items-center gap-5 text-sm font-medium">
          <Link href="/mini-scan">Mini-Scan</Link>
          <Link href="/login" className={buttonClass(true, true)}>
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="pb-16 pt-14 sm:pt-20">
          <h1 className="max-w-[16ch] text-[clamp(40px,7vw,76px)] font-semibold leading-[1.02] tracking-tighter">{BRAND.tagline}</h1>
          <p className="mt-6 max-w-[56ch] text-[clamp(18px,2vw,22px)] leading-snug text-muted">
            {BRAND.name} shows whether Google’s AI answers cite your site, and how fast your site responds to real people. Proof you can check, every day.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/mini-scan" className={buttonClass(false)}>
              Try the Mini-Scan
            </Link>
            <Link href="/login" className={buttonClass(true)}>
              Client sign in
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="What it measures">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-xl border border-line bg-surface p-6">
              <h2 className="text-[17px] font-semibold">{f.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-20" aria-label="How it works">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="border-t-2 border-ink pt-4">
                <p className="text-sm font-semibold text-muted">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 rounded-xl border border-line bg-surface p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Built for agencies and businesses</h2>
          <p className="mt-3 max-w-[62ch] leading-relaxed text-muted">
            It does not matter what you sell. If customers ask Google questions before they buy, {BRAND.name} tells you whether the answer names you or someone else.
            Access to a client portal is by invitation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/mini-scan" className={buttonClass(false)}>
              Mini-Scan
            </Link>
            <Link href="/login" className={buttonClass(true)}>
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl border-t border-line px-6 py-8 text-sm text-muted">
        {BRAND.name} · {BRAND.tagline}
      </footer>
    </div>
  );
}
