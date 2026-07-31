import { CopyButton } from "@/components/copy-button";
import { Badge, PageHeader, Panel, Stat } from "@/components/ui";
import { requirePunter } from "@/lib/auth/punter";
import { PAYID } from "@/lib/config";
import { formatAud } from "@/lib/money";

export default async function PayPage() {
  const { supabase } = await requirePunter();
  const { data: summary } = await supabase.from("punter_payment_summary").select("*").single();
  if (!summary) return null;
  return (
    <div className="grid gap-7">
      <PageHeader eyebrow="The kitty" title="Your payment" intro="The site keeps score. The money still moves directly to Harry's Australian account." action={<Badge tone={summary.has_estimates ? "neutral" : "gold"}>{summary.has_estimates ? "Current estimate" : "Locked in"}</Badge>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="You owe" value={formatAud(summary.amount_owed_cents)} />
        <Stat label="Received" value={formatAud(summary.amount_paid_cents)} tone="gold" />
        <Stat label="Outstanding" value={formatAud(Math.max(0, summary.outstanding_cents))} tone={summary.outstanding_cents > 0 ? "signal" : "gold"} />
      </div>
      <Panel className="text-center">
        <p className="eyebrow">Use this reference</p>
        <code className="mono my-5 block break-all text-3xl text-[var(--gold-light)] sm:text-5xl">{summary.payment_reference}</code>
        <CopyButton value={summary.payment_reference} label="Copy reference" />
      </Panel>
      <Panel>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><p className="eyebrow">PayID</p><p className="mono mt-2 break-all text-xl">{PAYID}</p><p className="mt-2 text-sm leading-6 text-[var(--chalk-muted)]">Australian punters can use PayID or bank transfer. Harry and Sam can send AUD through Wise. Always include your reference.</p></div>
          <CopyButton value={PAYID} label="Copy PayID" />
        </div>
      </Panel>
    </div>
  );
}
