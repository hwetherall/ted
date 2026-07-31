import Link from "next/link";
import { TripNav } from "@/components/trip-nav";
import { requirePunter } from "@/lib/auth/punter";
import { punterLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TripLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requirePunter();
  const { data: punter } = await supabase.from("punter_self").select("display_name").single();
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-4 sm:px-6 sm:pb-14 sm:pt-7">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/trip" className="display text-2xl"><span className="text-[var(--gold)]">TED</span> / 2027</Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-[var(--chalk-muted)] sm:inline">{punter?.display_name}</span>
          <form action={punterLogoutAction}><button className="text-xs font-semibold text-[var(--chalk-muted)] hover:text-[var(--chalk)]">Sign out</button></form>
        </div>
      </header>
      <div className="mb-8 hidden sm:block"><TripNav /></div>
      <main>{children}</main>
      <div className="sm:hidden"><TripNav /></div>
    </div>
  );
}
