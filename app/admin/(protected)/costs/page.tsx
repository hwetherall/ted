import { Badge, PageHeader, Panel, Stat } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatAud } from "@/lib/money";
import { addCostAction, deleteCostAction, updateCostAction } from "./actions";

export default async function CostsPage() {
  const { supabase } = await requireAdmin();
  const [costs, summary] = await Promise.all([
    supabase.from("costs").select("*,groomsmen(name)").order("created_at"),
    supabase.from("cost_summary").select("*").single(),
  ]);
  const total = (costs.data || []).reduce((sum, cost) => sum + (cost.cost_type === "fixed" ? cost.amount_cents : cost.amount_cents * (summary.data?.confirmed_headcount || 0)), 0);
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Cost engine" title="Costs" intro="Fixed costs are split across confirmed punters. Per-head costs are added once. The final figure rounds up to the next dollar." />
      <div className="grid gap-3 sm:grid-cols-3"><Stat label="Confirmed heads" value={summary.data?.confirmed_headcount || 0} /><Stat label="Event total" value={formatAud(total)} /><Stat label="Per head" value={formatAud(summary.data?.amount_per_head_cents || 0)} tone="gold" detail={`${formatAud(summary.data?.rounding_surplus_cents || 0)} rounding surplus`} /></div>
      <Panel><h2 className="display text-2xl">Add a cost</h2><form action={addCostAction} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><label className="label">Label<input className="field" name="label" required /></label><label className="label">Amount AUD<input className="field mono" name="amount" inputMode="decimal" placeholder="1200.00" required /></label><label className="label">Type<select className="field" name="cost_type"><option value="fixed">Fixed</option><option value="per_head">Per head</option></select></label><label className="label">Notes<input className="field" name="notes" /></label><label className="surface-flat flex items-center gap-3 p-3"><input type="checkbox" name="is_confirmed" /> Confirmed, not an estimate</label><label className="surface-flat flex items-center gap-3 p-3"><input type="checkbox" name="paid_by_me" /> I fronted this</label><button className="button button-primary sm:col-span-2 sm:justify-self-start">Add cost</button></form></Panel>
      <div className="grid gap-4">{(costs.data || []).map((cost) => <details key={cost.id} className="surface p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><strong>{cost.label}</strong><span className="mono ml-3 text-[var(--gold-light)]">{formatAud(cost.amount_cents)} {cost.cost_type === "per_head" ? "/ head" : ""}</span></div><Badge tone={cost.is_confirmed ? "success" : "neutral"}>{cost.is_confirmed ? "Confirmed" : "Estimate"}</Badge></summary><form action={updateCostAction} className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 xl:grid-cols-4"><input type="hidden" name="id" value={cost.id} /><label className="label">Label<input className="field" name="label" defaultValue={cost.label} /></label><label className="label">Amount AUD<input className="field mono" name="amount" defaultValue={(cost.amount_cents / 100).toFixed(2)} /></label><label className="label">Type<select className="field" name="cost_type" defaultValue={cost.cost_type}><option value="fixed">Fixed</option><option value="per_head">Per head</option></select></label><label className="label">Notes<input className="field" name="notes" defaultValue={cost.notes || ""} /></label><label className="surface-flat flex items-center gap-3 p-3"><input type="checkbox" name="is_confirmed" defaultChecked={cost.is_confirmed} /> Confirmed</label><button className="button button-primary">Save cost</button></form><form action={deleteCostAction} className="mt-3 flex justify-end"><input type="hidden" name="id" value={cost.id} /><button className="button button-danger">Delete cost</button></form></details>)}</div>
    </div>
  );
}
