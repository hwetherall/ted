"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/trip", "Home"],
  ["/trip/itinerary", "Plan"],
  ["/trip/pay", "Pay"],
  ["/trip/vault", "Vault"],
  ["/trip/crew", "Crew"],
];

export function TripNav() {
  const path = usePathname();
  return (
    <nav aria-label="Trip" className="mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(16,26,22,.94)] px-2 pt-2 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {links.map(([href, label]) => {
          const active = href === "/trip" ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} className={clsx(
              "nav-link rounded-xl px-1 py-2.5 text-center text-xs font-bold transition-colors sm:px-3 sm:text-sm",
              active ? "bg-[var(--gold)] text-[var(--ink)]" : "text-[var(--chalk-muted)] hover:bg-white/5 hover:text-[var(--chalk)]",
            )}>{label}</Link>
          );
        })}
      </div>
    </nav>
  );
}
