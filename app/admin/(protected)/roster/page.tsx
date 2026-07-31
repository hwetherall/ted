import { Badge, PageHeader, Panel } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { createPunterAction, deletePunterAction, updatePunterAction } from "./actions";

export default async function RosterPage() {
  const { supabase } = await requireAdmin();
  const { data: punters } = await supabase.from("punters").select("*").order("display_name");
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Squad selection" title="Roster" intro="Names, nicknames, RSVP state, and contact details. Nicknames stay in the back room until each punter claims their slot." />
      <Panel>
        <h2 className="display text-2xl">Add a punter</h2>
        <form action={createPunterAction} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="label">Full name<input className="field" name="full_name" required /></label>
          <label className="label">Display name<input className="field" name="display_name" required placeholder="Dave M." /></label>
          <label className="label">Nickname<input className="field" name="nickname" required /></label>
          <label className="label">Email<input className="field" name="email" type="email" /></label>
          <label className="label">Phone<input className="field" name="phone" type="tel" /></label>
          <label className="label">Priority<select className="field" name="invite_priority"><option value="nice">Nice to have</option><option value="must">Must invite</option></select></label>
          <button className="button button-primary sm:col-span-2 sm:justify-self-start xl:col-span-3">Add punter</button>
        </form>
      </Panel>
      <div className="grid gap-4">
        {(punters || []).map((punter) => (
          <details key={punter.id} className="surface group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div><strong className="display text-xl">{punter.display_name}</strong><span className="ml-3 mono text-xs text-[var(--gold-light)]">{punter.nickname || "No nickname"}</span></div>
              <div className="flex items-center gap-2"><Badge tone={punter.claimed_at ? "success" : "neutral"}>{punter.claimed_at ? "Claimed" : "Unclaimed"}</Badge><Badge tone={punter.rsvp_status === "yes" ? "gold" : punter.rsvp_status === "no" ? "signal" : "neutral"}>{punter.rsvp_status}</Badge></div>
            </summary>
            <form action={updatePunterAction} className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 xl:grid-cols-3">
              <input type="hidden" name="id" value={punter.id} />
              <label className="label">Full name<input className="field" name="full_name" defaultValue={punter.full_name} required /></label>
              <label className="label">Display name<input className="field" name="display_name" defaultValue={punter.display_name} required /></label>
              <label className="label">Nickname<input className="field mono" name="nickname" defaultValue={punter.nickname || ""} /></label>
              <label className="label">Email<input className="field" name="email" type="email" defaultValue={punter.email || ""} /></label>
              <label className="label">Phone<input className="field" name="phone" type="tel" defaultValue={punter.phone || ""} /></label>
              <label className="label">RSVP<select className="field" name="rsvp_status" defaultValue={punter.rsvp_status}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
              <label className="label">Priority<select className="field" name="invite_priority" defaultValue={punter.invite_priority}><option value="nice">Nice to have</option><option value="must">Must invite</option></select></label>
              <div className="surface-flat p-3"><span className="text-xs text-[var(--chalk-muted)]">Payment reference</span><code className="mono mt-1 block text-sm text-[var(--gold-light)]">{punter.payment_reference}</code></div>
              <button className="button button-primary self-end">Save punter</button>
            </form>
            <form action={deletePunterAction} className="mt-4 flex justify-end"><input type="hidden" name="id" value={punter.id} /><button className="button button-danger" aria-label={`Delete ${punter.display_name}`}>Delete punter</button></form>
          </details>
        ))}
      </div>
    </div>
  );
}
