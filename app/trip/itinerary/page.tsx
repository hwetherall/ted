import { LocalTime } from "@/components/local-time";
import { EmptyState, PageHeader } from "@/components/ui";
import { requirePunter } from "@/lib/auth/punter";
import { EVENT_TZ } from "@/lib/config";
import { formatEventTime } from "@/lib/time";

export default async function ItineraryPage() {
  const { supabase } = await requirePunter();
  const { data: items } = await supabase.from("itinerary_items").select("*").order("starts_at").order("sort_order");
  return (
    <div className="grid gap-7">
      <PageHeader eyebrow="Fixtures" title="The plan" intro={`All times are shown in ${EVENT_TZ}. Draft business stays in the back room.`} />
      {items?.length ? <ol className="relative grid gap-4 before:absolute before:bottom-7 before:left-[1.25rem] before:top-7 before:w-px before:bg-[var(--gold)]/30">{items.map((item) => (
        <li key={item.id} className="relative grid grid-cols-[2.5rem_1fr] gap-3">
          <div className="z-10 mt-6 grid h-10 w-10 place-items-center rounded-full border border-[var(--gold)]/50 bg-[var(--board)] text-[var(--gold)]"><span className="status-dot" /></div>
          <article className="surface p-5 sm:p-6"><p className="mono text-sm text-[var(--gold-light)]">{formatEventTime(item.starts_at)}</p><LocalTime value={item.starts_at} /><h2 className="display mt-3 text-3xl">{item.title}</h2>{item.description ? <p className="mt-3 leading-7 text-[var(--chalk-muted)]">{item.description}</p> : null}<div className="mt-5 flex flex-wrap items-end justify-between gap-4">{item.location_name ? <div><p className="font-bold">{item.location_name}</p>{item.address ? <p className="mt-1 text-sm text-[var(--chalk-muted)]">{item.address}</p> : null}</div> : <span />}{item.map_url ? <a href={item.map_url} target="_blank" rel="noreferrer" className="button button-secondary">Open map</a> : null}</div>{item.cost_note ? <p className="mt-4 border-t border-white/10 pt-4 text-xs text-[var(--chalk-muted)]">Cost: {item.cost_note}</p> : null}</article>
        </li>
      ))}</ol> : <EmptyState title="The board is blank.">Published fixtures will appear once the groomsmen lock them in.</EmptyState>}
    </div>
  );
}
