import { hasSupabaseConfig } from "@/lib/config";
import { adminLoginAction } from "./actions";

export const metadata = { title: "Groomsmen login" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="surface w-full max-w-md p-6 sm:p-8">
        <p className="eyebrow">Groomsmen only</p>
        <h1 className="display mt-3 text-4xl">Back room access</h1>
        <p className="mt-3 leading-6 text-[var(--chalk-muted)]">Use one of the five organiser emails. We will send a one-time link.</p>
        {params.sent ? <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">Link sent. Check your inbox.</p> : null}
        {params.error ? <p className="mt-5 rounded-xl border border-[var(--signal)]/30 bg-[var(--signal)]/10 p-4 text-sm text-[#ffb0a9]">That email cannot enter the back room. Check it or ask Harry.</p> : null}
        {!hasSupabaseConfig() ? <p className="mt-5 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-4 text-sm text-[var(--gold-light)]">Connect Supabase to enable organiser login.</p> : null}
        <form action={adminLoginAction} className="mt-6 grid gap-4">
          <label className="label">Email<input className="field" name="email" type="email" required autoComplete="email" placeholder="harry@example.com" /></label>
          <button className="button button-primary" disabled={!hasSupabaseConfig()}>Send login link</button>
        </form>
        <a href="/login" className="mt-5 block text-center text-sm text-[var(--chalk-muted)] hover:text-[var(--chalk)]">Punter login</a>
      </section>
    </main>
  );
}
