"use client";

import Script from "next/script";
import { useActionState } from "react";
import { submitScanAction, type ScanFormState } from "@/app/mini-scan/actions";
import { buttonClass } from "@/components/ui";

const input = "w-full rounded-lg border border-line bg-bg px-3 py-2";

export function ScanForm({ siteKey, simulated }: { siteKey?: string; simulated: boolean }) {
  const [state, action, pending] = useActionState<ScanFormState, FormData>(submitScanAction, null);

  return (
    <form action={action} className="mt-6 grid max-w-xl gap-1">
      {simulated && (
        <p className="mb-3 rounded-lg border border-line bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          Simulated mode: results are made up for testing and are marked as such.
        </p>
      )}
      <label htmlFor="domain" className="mt-3 text-sm font-semibold">
        Domain
      </label>
      <input id="domain" name="domain" required autoComplete="off" spellCheck={false} placeholder="example.com" className={input} />

      <label htmlFor="queries" className="mt-4 text-sm font-semibold">
        Queries, one per line (up to 25)
      </label>
      <textarea id="queries" name="queries" required rows={9} spellCheck={false} className={`${input} leading-relaxed`} />

      {/* Honeypot: hidden from people, bots tend to fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {siteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile mt-4" data-sitekey={siteKey} />
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`${buttonClass()} disabled:opacity-60`}>
          {pending ? "Sending..." : "Run scan"}
        </button>
        <span className="text-[13.5px] text-muted">The scan runs in the background and takes a few minutes. You get a private link to the result.</span>
      </div>
      {state?.error && (
        <p role="alert" className="mt-3 font-medium text-bad">
          {state.error}
        </p>
      )}
    </form>
  );
}
