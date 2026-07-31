import Link from "next/link";
import { LoginQuiz } from "@/components/login-quiz";
import { hasSupabaseConfig } from "@/lib/config";
import { createServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome back" };

export default async function ReturningLoginPage() {
  let punters: { id: string; display_name: string }[] = [];
  if (hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createServiceSupabase().from("punters").select("id,display_name").not("claimed_at", "is", null).order("display_name");
    punters = data || [];
  }
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="surface w-full max-w-md p-6 sm:p-8">
        <p className="eyebrow">Returning punter</p>
        <h1 className="display mt-3 text-4xl">You know the drill.</h1>
        <p className="mt-3 text-[var(--chalk-muted)]">Pick your name and type your nickname.</p>
        {punters.length ? <LoginQuiz punters={punters} returning /> : <p className="mt-6 text-sm text-[var(--chalk-muted)]">No claimed names are available yet.</p>}
        <Link href="/login" className="mt-6 block text-sm font-semibold text-[var(--gold-light)]">First visit?</Link>
      </section>
    </main>
  );
}
