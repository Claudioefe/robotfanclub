"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, null);

  return (
    <main style={{ padding: "4rem 1.5rem", maxWidth: 420, margin: "0 auto" }}>
      <h1>Sign in</h1>
      <p>We will email you a one-time link. Access is by invitation only.</p>
      <form action={action} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <button type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send sign-in link"}
        </button>
      </form>
      {state && <p role="status">{state.message}</p>}
    </main>
  );
}
