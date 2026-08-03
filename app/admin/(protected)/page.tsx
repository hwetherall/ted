import Link from "next/link";
import { PageHeader, Panel, Stat } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatAud } from "@/lib/money";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [selected, rostered, awaiting, confirmed, ledger, vault] = await Promise.all([
    supabase.from("ted_submissions").select("id", { count: "exact", head: true }).neq("status", "discarded"),
    supabase.from("punters").select("id", { count: "exact", head: true }),
    supabase.from("ted_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("punters").select("id", { count: "exact", head: true }).eq("rsvp_status", "yes"),
    supabase.from("ledger_summary").select("amount_paid_cents,outstanding_cents"),
    supabase.from("vault_items").select("id", { count: "exact", head: true }).eq("moderation_status", "pending").not("upload_confirmed_at", "is", null),
  ]);

  const money = ledger.data || [];
  const paid = money.reduce((sum, item) => sum + item.amount_paid_cents, 0);
  const outstanding = money.reduce((sum, item) => sum + Math.max(0, item.outstanding_cents), 0);

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Match control" title="Scoreboard" intro="Selection, roster, replies, and the weekend operations in one glance." />

      <section aria-labelledby="invitation-counts">
        <h2 id="invitation-counts" className="display text-2xl">Invitation counts</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Selected" value={selected.count || 0} detail="on Ted's team sheet" tone="gold" />
          <Stat label="Rostered" value={rostered.count || 0} detail="on the live roster" />
          <Stat label="Awaiting processing" value={awaiting.count || 0} detail="ready to roster" tone={(awaiting.count || 0) > 0 ? "signal" : "default"} />
          <Stat label="Confirmed RSVP" value={confirmed.count || 0} detail="coming to the weekend" tone="gold" />
        </div>
      </section>

      <section aria-labelledby="operations-counts">
        <h2 id="operations-counts" className="display text-2xl">Operations</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Collected" value={formatAud(paid)} />
          <Stat label="Outstanding" value={formatAud(outstanding)} tone={outstanding > 0 ? "signal" : "default"} />
          <Stat label="Vault waiting" value={vault.count || 0} detail="items to moderate" />
        </div>
      </section>

      <Panel>
        <p className="eyebrow">Next jobs</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/admin/intake" className="surface-flat p-4 transition-colors hover:border-[var(--gold)]"><strong>Process Ted&apos;s team sheet</strong><span className="mt-1 block text-sm text-[var(--chalk-muted)]">{awaiting.count || 0} awaiting processing</span></Link>
          <Link href="/admin/ledger" className="surface-flat p-4 transition-colors hover:border-[var(--gold)]"><strong>Reconcile money</strong><span className="mt-1 block text-sm text-[var(--chalk-muted)]">{formatAud(outstanding)} outstanding</span></Link>
          <Link href="/admin/vault" className="surface-flat p-4 transition-colors hover:border-[var(--gold)]"><strong>Moderate vault</strong><span className="mt-1 block text-sm text-[var(--chalk-muted)]">{vault.count || 0} waiting</span></Link>
        </div>
      </Panel>
    </div>
  );
}
