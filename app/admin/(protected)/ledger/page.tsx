import Link from "next/link";
import { Badge, PageHeader, Panel, Stat } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatAud } from "@/lib/money";
import { recordPaymentAction } from "./actions";

export default async function LedgerPage() {
  const { supabase } = await requireAdmin();
  const { data: ledger } = await supabase.from("ledger_summary").select("*").order("outstanding_cents", { ascending: false });
  const rows = ledger || [];
  const paid = rows.reduce((sum, row) => sum + row.amount_paid_cents, 0);
  const outstanding = rows.reduce((sum, row) => sum + Math.max(0, row.outstanding_cents), 0);
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Treasurer's book" title="Ledger" intro="Record every partial payment. The reference is the join between the bank account and this board." action={<Link href="/admin/ledger/import" className="button button-primary">Import bank CSV</Link>} />
      <div className="grid gap-3 sm:grid-cols-3"><Stat label="Collected" value={formatAud(paid)} tone="gold" /><Stat label="Outstanding" value={formatAud(outstanding)} tone="signal" /><Stat label="Paid up" value={rows.filter((row) => row.amount_owed_cents > 0 && row.outstanding_cents <= 0).length} detail={`of ${rows.filter((row) => row.amount_owed_cents > 0).length} owing`} /></div>
      <Panel><h2 className="display text-2xl">Record a payment</h2><form action={recordPaymentAction} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><label className="label xl:col-span-2">Punter<select className="field" name="punter_id" required><option value="">Choose punter</option>{rows.map((row) => <option key={row.punter_id} value={row.punter_id}>{row.display_name}, {row.payment_reference}</option>)}</select></label><label className="label">Amount AUD<input className="field mono" name="amount" inputMode="decimal" required /></label><label className="label">Method<select className="field" name="method"><option value="payid">PayID</option><option value="bank_transfer">Bank transfer</option><option value="wise">Wise</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label className="label">Received date<input className="field" type="date" name="received_at" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="label sm:col-span-2 xl:col-span-4">Note<input className="field" name="note" /></label><button className="button button-primary">Record payment</button></form></Panel>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Punter</th><th>Reference</th><th>Owed</th><th>Paid</th><th>Outstanding</th><th>Last payment</th></tr></thead><tbody>{rows.map((row) => <tr key={row.punter_id}><td><strong>{row.display_name}</strong><span className="mt-1 block"><Badge tone={row.rsvp_status === "yes" ? "gold" : "neutral"}>{row.rsvp_status}</Badge></span></td><td className="mono text-xs text-[var(--gold-light)]">{row.payment_reference}</td><td className="mono">{formatAud(row.amount_owed_cents)}</td><td className="mono">{formatAud(row.amount_paid_cents)}</td><td className={`mono font-bold ${row.outstanding_cents > 0 ? "text-[#ffaaa3]" : "text-emerald-200"}`}>{formatAud(row.outstanding_cents)}</td><td>{row.last_payment_at ? new Date(row.last_payment_at).toLocaleDateString("en-AU") : "None"}</td></tr>)}</tbody></table></div>
    </div>
  );
}
