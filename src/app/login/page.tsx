"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2.5 text-ink no-underline">
        <Logo size={32} />
        <span className="font-display text-xl font-bold tracking-tight">Robot Fan Club</span>
      </Link>
      <div className="rounded-2xl border border-line bg-surface p-7">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-muted">We will email you a one-time link. Access is by invitation only.</p>
        <form action={action} className="mt-6 grid gap-3">
          <label htmlFor="email" className="text-sm font-semibold">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded-lg border border-line bg-bg px-3 py-2.5" />
          <button type="submit" disabled={pending} className={`${buttonClass()} justify-center disabled:opacity-60`}>
            {pending ? "Sending..." : "Send sign-in link"}
          </button>
        </form>
        {state && (
          <p role="status" className="mt-4 text-sm text-muted">
            {state.message}
          </p>
        )}
      </div>
    </main>
  );
}
