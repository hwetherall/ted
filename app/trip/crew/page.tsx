import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requirePunter } from "@/lib/auth/punter";

export default async function CrewPage() {
  const { supabase } = await requirePunter();
  const { data: crew } = await supabase.from("punters_public").select("*").neq("rsvp_status", "no").order("display_name");
  return (
    <div className="grid gap-7">
      <PageHeader eyebrow="Honour board" title="The crew" intro="Gold lettering is earned. Claim your place and Ted's nickname for you goes on the board." />
      {crew?.length ? <section className="overflow-hidden rounded-[1.2rem] border-4 border-[#5b4223] bg-[var(--board)] p-3 shadow-2xl sm:p-6">
        <div className="border border-[var(--gold)]/40 px-4 py-2 text-center"><p className="display text-sm uppercase tracking-[0.25em] text-[var(--gold)]">Ted’s first XVIII, season 2027</p></div>
        <ol className="mt-3 divide-y divide-[var(--gold)]/20">{crew.map((punter, index) => (
          <li key={punter.id} className="board-row grid grid-cols-[2.3rem_1fr_auto] items-center gap-3 px-2 py-4 sm:grid-cols-[3rem_1fr_1fr] sm:px-4" style={{ animationDelay: `${Math.min(index * 45, 500)}ms` }}>
            <span className="mono text-xs text-[var(--gold)]/60">{String(index + 1).padStart(2, "0")}</span>
            <span className="display text-xl uppercase tracking-wide text-[var(--gold-light)] sm:text-2xl">{punter.display_name}</span>
            <span className="mono text-right text-sm text-[var(--gold)] sm:text-left">{punter.nickname || "________"}</span>
          </li>
        ))}</ol>
        <div className="mt-4 flex justify-center"><Badge tone="gold">{crew.filter((item) => item.rsvp_status === "yes").length} confirmed</Badge></div>
      </section> : <EmptyState title="The board is empty.">The groomsmen are still naming the squad.</EmptyState>}
    </div>
  );
}
