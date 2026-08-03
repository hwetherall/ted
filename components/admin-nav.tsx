"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "Scoreboard"],
  ["/admin/roster", "Roster"],
  ["/admin/intake", "Team sheet"],
  ["/admin/ledger", "Ledger"],
  ["/admin/costs", "Costs"],
  ["/admin/itinerary", "Fixtures"],
  ["/admin/vault", "Vault"],
  ["/admin/security", "Security"],
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:gap-1 lg:overflow-visible">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className={clsx(
            "nav-link whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            active ? "bg-[var(--gold)] text-[var(--ink)]" : "text-[var(--chalk-muted)] hover:bg-white/5 hover:text-[var(--chalk)]",
          )}>{label}</Link>
        );
      })}
    </nav>
  );
}
