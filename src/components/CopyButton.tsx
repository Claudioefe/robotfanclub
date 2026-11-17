"use client";

import { useState } from "react";
import { buttonClass } from "./ui";

export function CopyButton({ text, label = "Copy", small = true, ghost = true }: { text: string; label?: string; small?: boolean; ghost?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "blocked">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("blocked");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button type="button" onClick={copy} className={buttonClass(ghost, small)}>
      {state === "copied" ? "Copied" : state === "blocked" ? "Copy blocked: select the text" : label}
    </button>
  );
}
