"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginState = { message: string } | null;

// Sends a magic link. No public sign-up: shouldCreateUser is false, so only users
// invited by staff can sign in. The reply is identical for every address so the
// form cannot be used to find out who has an account.
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Enter a valid email address." };
  }

  // Never trust the Origin header for the redirect target: use the configured site URL.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback` },
  });

  return { message: "If this email has access, we sent a sign-in link. Check your inbox." };
}
