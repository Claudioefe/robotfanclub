import type { Metadata } from "next";
import Link from "next/link";
import { ScanForm } from "@/components/miniscan/ScanForm";
import { scanMode } from "@/lib/miniscan/core";

// Read MINI_SCAN_MODE on every request, not once at build time: turning the Mini-Scan on or off must not need a rebuild,
// and a statically built page would keep showing whatever the mode was when it was compiled.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mini-Scan · Robot Fan Club",
  description: "Check whether Google's AI answers cite your domain for the queries that bring you customers.",
};

export default function MiniScanPage() {
  const mode = scanMode(process.env.MINI_SCAN_MODE);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm">
        <Link href="/">← Robot Fan Club</Link>
      </p>
      <h1 className="mt-6 text-[clamp(28px,4vw,40px)] font-semibold leading-tight tracking-tight">Mini-Scan</h1>
      <p className="mt-2 max-w-[60ch] text-lg text-muted">
        Check up to 25 buying-intent queries: does Google answer with AI, and does it cite your domain?
      </p>

      {mode === "off" ? (
        <div className="mt-10 max-w-xl rounded-xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Coming soon</h2>
          <p className="mt-2 text-muted">
            The Mini-Scan is not open yet. It will show, for the queries you choose, where Google’s AI answers cite other sites instead of yours.
          </p>
          <p className="mt-4">
            <Link href="/login">Already a client? Sign in</Link>
          </p>
        </div>
      ) : (
        <ScanForm siteKey={mode === "live" ? process.env.TURNSTILE_SITE_KEY : undefined} simulated={mode === "simulated"} />
      )}
    </main>
  );
}
