import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { Badge, Panel, Stat } from "@/components/ui";
import { requirePunter } from "@/lib/auth/punter";
import { EVENT_START } from "@/lib/config";
import { formatAud } from "@/lib/money";
import { formatEventTime } from "@/lib/time";

export default async function TripHomePage() {
  const { supabase } = await requirePunter();
  const [self, payment, next] = await Promise.all([
    supabase.from("punter_self").select("display_name,rsvp_status").single(),
    supabase.from("punter_payment_summary").select("*").single(),
    supabase.from("itinerary_items").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
  ]);
  const punter = self.data;
  const event = next.data;
  return (
    <div className="grid gap-7">
      <section className="surface overflow-hidden">
        <div className="grid min-h-[24rem] items-end bg-[var(--board)] p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
          <div>
            <p className="eyebrow">The countdown is on</p>
            <h1 className="display mt-3 max-w-2xl text-5xl leading-[0.9] sm:text-7xl">Pack light.<br /><span className="text-[var(--gold-light)]">Bring stories.</span></h1>
            <p className="mt-5 text-[var(--chalk-muted)]">Good to have you, {punter?.display_name || "mate"}.</p>
          </div>
          <div className="mt-8 lg:mt-0"><Countdown target={EVENT_START} /></div>
        </div>
      </section>
      {event ? <Panel className="border-[var(--gold)]/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl"><p className="eyebrow">Next on the board</p><h2 className="display mt-2 text-3xl">{event.title}</h2><p className="mono mt-3 text-sm text-[var(--gold-light)]">{formatEventTime(event.starts_at)}<LocalTime value={event.starts_at} /></p>{event.location_name ? <p className="mt-3 font-bold">{event.location_name}</p> : null}{event.address ? <p className="text-sm text-[var(--chalk-muted)]">{event.address}</p> : null}</div>
          {event.map_url ? <a href={event.map_url} target="_blank" rel="noreferrer" className="button button-primary">Open map</a> : null}
        </div>
      </Panel> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/trip/rsvp"><Stat label="RSVP" value={punter?.rsvp_status || "unknown"} detail="Update your details" tone={punter?.rsvp_status === "yes" ? "gold" : "default"} /></Link>
        <Link href="/trip/pay"><Stat label="Outstanding" value={formatAud(Math.max(0, payment.data?.outstanding_cents || 0))} detail={payment.data?.has_estimates ? "Current estimate" : "Current total"} tone={(payment.data?.outstanding_cents || 0) > 0 ? "signal" : "gold"} /></Link>
        <Link href="/trip/vault"><div className="surface-flat h-full p-4"><Badge tone="gold">Open</Badge><p className="display mt-3 text-2xl">The vault</p><p className="mt-1 text-xs text-[var(--chalk-muted)]">Add your evidence</p></div></Link>
      </div>
    </div>
  );
}
