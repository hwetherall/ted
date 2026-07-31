import { PageHeader, Panel } from "@/components/ui";
import { requirePunter } from "@/lib/auth/punter";
import { EVENT_TZ } from "@/lib/config";
import { toDateTimeLocal } from "@/lib/time";
import { saveRsvpAction } from "./actions";

export default async function RsvpPage() {
  const { supabase } = await requirePunter();
  const { data: punter } = await supabase.from("punter_self").select("*").single();
  if (!punter) return null;
  return (
    <div className="grid gap-7">
      <PageHeader eyebrow="Your place" title="RSVP and details" intro="Give the groomsmen enough to plan beds, airport runs, and a meal that will not finish you off." />
      <Panel>
        <form action={saveRsvpAction} className="grid gap-5 sm:grid-cols-2">
          <label className="label sm:col-span-2">Are you in?<select className="field" name="rsvp_status" defaultValue={punter.rsvp_status}><option value="unknown">Not answered</option><option value="yes">Yes, I am in</option><option value="maybe">Maybe</option><option value="no">Cannot make it</option></select></label>
          <label className="label">Email<input className="field" name="email" type="email" defaultValue={punter.email || ""} /></label>
          <label className="label">Phone<input className="field" name="phone" type="tel" defaultValue={punter.phone || ""} /></label>
          <label className="label">Arrival in {EVENT_TZ}<input className="field" name="arrival_at" type="datetime-local" defaultValue={punter.arrival_at ? toDateTimeLocal(punter.arrival_at) : ""} /></label>
          <label className="label">Departure in {EVENT_TZ}<input className="field" name="departure_at" type="datetime-local" defaultValue={punter.departure_at ? toDateTimeLocal(punter.departure_at) : ""} /></label>
          <label className="label">Arrival airport or station<input className="field" name="arrival_airport" defaultValue={punter.arrival_airport || ""} placeholder="MEL" /></label>
          <label className="label">How do you know Ted?<input className="field" name="how_they_know_ted" defaultValue={punter.how_they_know_ted || ""} /></label>
          <label className="label sm:col-span-2">Dietary notes<textarea className="field min-h-24" name="dietary_notes" defaultValue={punter.dietary_notes || ""} placeholder="Allergies, vegetarian, or nothing to report" /></label>
          <label className="surface-flat flex cursor-pointer items-center gap-3 p-4 sm:col-span-2"><input name="drinks_alcohol" type="checkbox" defaultChecked={Boolean(punter.drinks_alcohol)} /><span><strong>I drink alcohol</strong><span className="mt-1 block text-xs text-[var(--chalk-muted)]">This helps the drinks order, nothing more dramatic.</span></span></label>
          <button className="button button-primary sm:col-span-2 sm:justify-self-start">Save my details</button>
        </form>
      </Panel>
    </div>
  );
}
