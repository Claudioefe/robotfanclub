"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reloads the result page every few seconds while the scan is still running.
export function AutoRefresh({ everyMs = 15_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
