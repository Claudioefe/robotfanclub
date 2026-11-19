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
    <nav aria-label="Portal" className="flex min-w-0 gap-0.5 overflow-x-auto md:flex-col">
      {ITEMS.map((item) => {
        const href = base + item.href;
        const current = item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
              current ? "bg-surface text-ink" : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            {current && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent md:inset-x-auto md:inset-y-2 md:-left-px md:h-auto md:w-0.5" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
