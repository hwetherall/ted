import { notFound } from "next/navigation";
import { validTedToken } from "@/lib/auth/ted";
import { createServiceSupabase } from "@/lib/supabase/service";
import { submitTedNameAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your list", robots: { index: false, follow: false } };

export default async function TedPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  if (!validTedToken(token)) notFound();
  const { count } = await createServiceSupabase().from("ted_submissions").select("id", { count: "exact", head: true }).neq("status", "discarded");
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:py-16">
      <header>
        <p className="eyebrow">Ted’s list</p>
        <h1 className="display mt-3 text-5xl leading-[0.95] sm:text-6xl">Who needs to be there?</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--chalk-muted)]">Add one mate at a time. Give us the nickname you actually use for them, then come back whenever another name occurs to you.</p>
        <p className="mono mt-5 text-sm text-[var(--gold-light)]">{count || 0} added so far</p>
      </header>
      {query.added ? <div className="mt-8 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">Added. The form is ready for the next one.</div> : null}
      {query.error ? <div className="mt-8 rounded-xl border border-[var(--signal)]/30 bg-[var(--signal)]/10 p-4 text-[#ffb0a9]">That entry was not saved. Check the details and try again.</div> : null}
      <form action={submitTedNameAction} className="surface mt-8 grid gap-5 p-5 sm:p-7">
        <input type="hidden" name="token" value={token} />
        <label className="label">Full name<input className="field" name="full_name" required maxLength={120} autoComplete="off" /></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="label">Email, if you have it<input className="field" name="email" type="email" autoComplete="off" /></label>
          <label className="label">Phone, if you have it<input className="field" name="phone" type="tel" autoComplete="off" /></label>
        </div>
        <label className="label">Nickname<input className="field" name="nickname" required maxLength={80} autoComplete="off" /><span className="text-xs font-normal">Use the name they will recognise as theirs.</span></label>
        <fieldset>
          <legend className="label mb-2">Invite priority</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="surface-flat flex cursor-pointer gap-3 p-4"><input type="radio" name="invite_priority" value="must" required /><span><strong>Must invite</strong><span className="mt-1 block text-xs text-[var(--chalk-muted)]">The weekend is not right without them.</span></span></label>
            <label className="surface-flat flex cursor-pointer gap-3 p-4"><input type="radio" name="invite_priority" value="nice" required /><span><strong>Nice to have</strong><span className="mt-1 block text-xs text-[var(--chalk-muted)]">Bring them in if numbers work.</span></span></label>
          </div>
        </fieldset>
        <label className="label">Anything we should know?<textarea className="field min-h-28 resize-y" name="note" maxLength={1000} /></label>
        <button className="button button-primary sm:justify-self-start">Add this mate</button>
      </form>
    </main>
  );
}
