"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashIp } from "@/lib/ingest/deps";
import { scanMode } from "@/lib/miniscan/core";
import { verifyTurnstile } from "@/lib/miniscan/captcha";
import { submitScanOp } from "@/lib/miniscan/ops";
import { createAdminClient } from "@/lib/supabase/admin";

export type ScanFormState = { error: string } | null;

// Public action: anyone can call it, so every protection runs here, on the server, in this order:
// mode switch (off by default) -> captcha (live only, fails closed) -> input limits -> weekly and per-visitor caps.
// Nothing here calls DataForSEO: it only queues a scan for the worker.
export async function submitScanAction(_prev: ScanFormState, fd: FormData): Promise<ScanFormState> {
  const mode = scanMode(process.env.MINI_SCAN_MODE);
  if (mode === "off") return { error: "The Mini-Scan is not open yet." };

  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (mode === "live") {
    const human = await verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), process.env.TURNSTILE_SECRET_KEY, ip);
    if (!human) return { error: "Please complete the verification and try again." };
  }

  const result = await submitScanOp(createAdminClient(), {
    domain: String(fd.get("domain") ?? ""),
    queries: String(fd.get("queries") ?? ""),
    website: String(fd.get("website") ?? ""),
    ipHash: hashIp(ip, process.env.SUPABASE_SECRET_KEY ?? ""),
    mode,
  });
  if (!result.ok) return { error: result.error };
  redirect(`/mini-scan/${result.token}`);
}
