import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { discardSubmissionAction, importSubmissionAction } from "./actions";

export default async function IntakePage() {
  const { supabase } = await requireAdmin();
  const { data: submissions } = await supabase.from("ted_submissions").select("*").eq("status", "new").order("submitted_at");
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Ted's clipboard" title="Intake" intro="Review every name before it reaches the roster. Import is transactional, so a double click cannot make two punters." />
      {submissions?.length ? <div className="grid gap-4">{submissions.map((item) => (
        <article key={item.id} className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="display text-2xl">{item.full_name}</h2><p className="mono mt-1 text-sm text-[var(--gold-light)]">{item.nickname}</p></div>
            <Badge tone={item.invite_priority === "must" ? "gold" : "neutral"}>{item.invite_priority === "must" ? "Must invite" : "Nice to have"}</Badge>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--chalk-muted)]">Email</dt><dd>{item.email || "Not supplied"}</dd></div>
            <div><dt className="text-[var(--chalk-muted)]">Phone</dt><dd>{item.phone || "Not supplied"}</dd></div>
            {item.note ? <div className="sm:col-span-2"><dt className="text-[var(--chalk-muted)]">Ted’s note</dt><dd className="mt-1">{item.note}</dd></div> : null}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={importSubmissionAction}><input type="hidden" name="id" value={item.id} /><button className="button button-primary">Import to roster</button></form>
            <form action={discardSubmissionAction}><input type="hidden" name="id" value={item.id} /><button className="button button-danger">Discard</button></form>
          </div>
        </article>
      ))}</div> : <EmptyState title="Ted's list is clear.">New names will appear here as he adds them.</EmptyState>}
    </div>
  );
}
