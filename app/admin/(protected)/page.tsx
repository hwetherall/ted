import Link from "next/link";
import { PageHeader, Panel, Stat } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatAud } from "@/lib/money";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [punters, ledger, vault, intake] = await Promise.all([
    supabase.from("punters").select("rsvp_status"),
    supabase.from("ledger_summary").select("amount_paid_cents,outstanding_cents"),
    supabase.from("vault_items").select("id", { count: "exact", head: true }).eq("moderation_status", "pending").not("upload_confirmed_at", "is", null),
    supabase.from("ted_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const roster = punters.data || [];
  const money = ledger.data || [];
  const yes = roster.filter((item) => item.rsvp_status === "yes").length;
  const paid = money.reduce((sum, item) => sum + item.amount_paid_cents, 0);
  const outstanding = money.reduce((sum, item) => sum + Math.max(0, item.outstanding_cents), 0);
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Match control" title="Scoreboard" intro="The whole weekend in one glance. Tackle the red numbers first." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Confirmed" value={`${yes} / ${roster.length}`} detail="punters" tone="gold" />
        <Stat label="Collected" value={formatAud(paid)} />
        <Stat label="Outstanding" value={formatAud(outstanding)} tone={outstanding > 0 ? "signal" : "default"} />
        <Stat label="Waiting" value={(vault.count || 0) + (intake.count || 0)} detail={`${vault.count || 0} vault, ${intake.count || 0} names`} />
      </div>
      <Panel>
        <p className="eyebrow">Next jobs</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/admin/intake" className="surface-flat p-4 transition-colors hover:border-[var(--gold)]"><strong>Review Ted’s list</strong><span className="mt-1 block text-sm text-[var(--chalk-muted)]">{intake.count || 0} waiting</span></Link>
          <Link href="/admin/ledger" className="surface-flat p-4 transition-colors hover:border-[var(--gold)]"><strong>Reconcile money</strong><span className="mt-1 block text-sm text-[var(--chalk-muted)]">{formatAud(outstanding)} outstanding</span></Link>
          <Link href="/admin/vault" className="surface-flat p-4 transition-colors hover:border-[var(--gold)]"><strong>Moderate vault</strong><span className="mt-1 block text-sm text-[var(--chalk-muted)]">{vault.count || 0} waiting</span></Link>
        </div>
      </Panel>
    </div>
  );
}
