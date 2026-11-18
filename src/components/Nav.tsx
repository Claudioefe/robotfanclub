"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "", label: "Overview" },
  { href: "/citations", label: "AI citations" },
  { href: "/ai-visibility", label: "AI visibility" },
  { href: "/speed", label: "Speed" },
  { href: "/setup", label: "Setup" },
];

export function Nav({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/portal/${clientId}`;

  return (
    <nav aria-label="Portal" className="flex gap-0.5 overflow-x-auto md:flex-col">
      {ITEMS.map((item) => {
        const href = base + item.href;
        const current = item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-2.5 py-2 font-medium no-underline ${
              current
                ? "bg-surface text-ink shadow-[inset_0_-2px_0_var(--cite)] md:shadow-[inset_3px_0_0_var(--cite)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
