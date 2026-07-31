import Link from "next/link";
import { LoginQuiz } from "@/components/login-quiz";
import { hasSupabaseConfig } from "@/lib/config";
import { createServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Punter login" };

export default async function LoginPage() {
  let punters: { id: string; display_name: string }[] = [];
  if (hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createServiceSupabase().from("punters").select("id,display_name").order("display_name");
    punters = data || [];
  }
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="surface w-full max-w-lg overflow-hidden">
        <div className="border-b border-white/10 bg-[var(--board)] p-6 sm:p-8">
          <p className="eyebrow">Ted’s first XVIII</p>
          <h1 className="display mt-3 text-5xl leading-[0.92]">Name on the board.</h1>
          <p className="mt-4 max-w-md leading-6 text-[var(--chalk-muted)]">Pick yourself, then prove you know the nickname Ted put next to it.</p>
        </div>
        <div className="p-6 sm:p-8">
          {punters.length ? <LoginQuiz punters={punters} /> : (
            <div className="surface-flat p-5 text-sm leading-6 text-[var(--chalk-muted)]">The squad list is not ready yet. A groomsman needs to connect the database and import Ted’s names.</div>
          )}
          <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
            <Link href="/login/returning" className="font-semibold text-[var(--gold-light)] hover:underline">Been here before?</Link>
            <Link href="/admin/login" className="text-[var(--chalk-muted)] hover:text-[var(--chalk)]">Groomsmen</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
