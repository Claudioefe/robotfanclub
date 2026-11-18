// Verifies a Cloudflare Turnstile token (a free captcha). It fails CLOSED: without a secret key or a token the answer is
// "not human", so the real Mini-Scan cannot open by accident without a working captcha.

type Fetcher = (url: string, init: { method: string; body: URLSearchParams }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export async function verifyTurnstile(token: string | null | undefined, secret: string | undefined, ip?: string, fetcher: Fetcher = fetch as unknown as Fetcher): Promise<boolean> {
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    if (!res.ok) return false;
    return (await res.json() as { success?: boolean })?.success === true;
  } catch {
    return false;
  }
}
