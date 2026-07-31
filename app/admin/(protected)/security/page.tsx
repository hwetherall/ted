import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { clearLockoutAction } from "./actions";

export default async function SecurityPage() {
  const { supabase } = await requireAdmin();
  const [lockouts, attempts] = await Promise.all([
    supabase.from("lockouts").select("*").gt("locked_until", new Date().toISOString()).order("locked_until"),
    supabase.from("auth_attempts").select("id,success,created_at,punter_id,user_agent,punters(display_name)").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Gatehouse" title="Security" intro="Failed nickname attempts are tied to the device, never to the mate being impersonated." />
      <section><h2 className="display mb-4 text-2xl">Active lockouts</h2>{lockouts.data?.length ? <div className="grid gap-3">{lockouts.data.map((item) => (
        <div key={item.device_id} className="surface-flat flex flex-wrap items-center justify-between gap-4 p-4"><div><Badge tone="signal">Locked</Badge><p className="mono mt-2 text-xs text-[var(--chalk-muted)]">{item.device_id}</p><p className="mt-1 text-sm">Until {new Date(item.locked_until).toLocaleString("en-AU")}</p></div><form action={clearLockoutAction}><input type="hidden" name="device_id" value={item.device_id} /><button className="button button-primary">Clear lockout</button></form></div>
      ))}</div> : <EmptyState title="Nobody is locked out.">A rare display of competence.</EmptyState>}</section>
      <section><h2 className="display mb-4 text-2xl">Recent attempts</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Punter</th><th>Result</th><th>Device</th></tr></thead><tbody>{(attempts.data || []).map((item) => (
        <tr key={item.id}><td>{new Date(item.created_at).toLocaleString("en-AU")}</td><td>{(item.punters as unknown as { display_name?: string } | null)?.display_name || "Unknown"}</td><td><Badge tone={item.success ? "success" : "signal"}>{item.success ? "Passed" : "Failed"}</Badge></td><td className="max-w-64 truncate text-xs text-[var(--chalk-muted)]">{item.user_agent || "Unknown device"}</td></tr>
      ))}</tbody></table></div></section>
    </div>
  );
}
