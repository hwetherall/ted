import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import {
  importSubmissionAction,
  removeMistakenEntryAction,
  updateTeamSheetEntryAction,
} from "./actions";

export default async function IntakePage() {
  const { supabase } = await requireAdmin();
  const { data: entries } = await supabase
    .from("ted_submissions")
    .select("id,full_name,nickname,email,phone,note,party_role,submitted_at")
    .eq("status", "new")
    .order("submitted_at");

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Ted's team sheet"
        title="Place the new picks"
        intro="Everyone here is invited. Tidy any details, resolve the rare duplicate, then place each person on the live roster."
      />
      {entries?.length ? (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <article key={entry.id} className="surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="display text-2xl">{entry.full_name}</h2>
                  <p className="mono mt-1 text-sm text-[var(--gold-light)]">{entry.nickname}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={entry.party_role === "groomsman" ? "gold" : "neutral"}>
                    {entry.party_role === "groomsman" ? "Groomsman" : "Guest"}
                  </Badge>
                  <Badge>Awaiting processing</Badge>
                </div>
              </div>

              <form action={updateTeamSheetEntryAction} className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                <input type="hidden" name="id" value={entry.id} />
                <label className="label">Full name<input className="field" name="full_name" required maxLength={120} defaultValue={entry.full_name} /></label>
                <label className="label">Nickname<input className="field" name="nickname" required maxLength={80} defaultValue={entry.nickname} /></label>
                <label className="label">Mobile<input className="field" name="phone" type="tel" maxLength={40} defaultValue={entry.phone || ""} /></label>
                <label className="label">Email<input className="field" name="email" type="email" maxLength={320} defaultValue={entry.email || ""} /></label>
                <label className="label">Party role<select className="field" name="party_role" defaultValue={entry.party_role}><option value="guest">Guest</option><option value="groomsman">Groomsman</option></select></label>
                <label className="label sm:col-span-2">Ted&apos;s note<textarea className="field min-h-24 resize-y" name="note" maxLength={1000} defaultValue={entry.note || ""} /></label>
                <button className="button button-secondary justify-self-start">Save details</button>
              </form>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                <form action={importSubmissionAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button className="button button-primary">Place on live roster</button>
                </form>
                <form action={removeMistakenEntryAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button className="button button-danger">Remove duplicate or mistake</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="The team sheet is up to date.">New picks will appear here when Ted adds them.</EmptyState>
      )}
    </div>
  );
}
