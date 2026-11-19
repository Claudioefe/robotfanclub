"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui";

export const inputClass = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1 block font-normal">{children}</span>
      {hint && <span className="mt-1 block text-[13px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

/**
 * A form wired to a server action. It shows the action's answer next to the button (green when it worked, red when not)
 * and clears itself after a success when `resetOnSuccess` is set.
 */
export function ActionForm({
  action,
  children,
  submit,
  ghost = false,
  small = false,
  resetOnSuccess = false,
  className = "grid gap-3",
  confirm,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submit: string;
  ghost?: boolean;
  small?: boolean;
  resetOnSuccess?: boolean;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  // Clear the fields only after the server said it worked, so a failed attempt keeps what the person typed.
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`${buttonClass(ghost, small)} disabled:opacity-60`}>
          {pending ? "Working..." : submit}
        </button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "text-off" : "text-bad"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
