import clsx from "clsx";
import Link from "next/link";

export function PageHeader({ eyebrow, title, intro, action }: {
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="display text-4xl leading-none sm:text-5xl">{title}</h1>
        {intro ? <p className="mt-3 max-w-xl leading-7 text-[var(--chalk-muted)]">{intro}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("surface p-5 sm:p-6", className)}>{children}</section>;
}

export function Stat({ label, value, detail, tone = "default" }: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  tone?: "default" | "gold" | "signal";
}) {
  return (
    <div className="surface-flat p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--chalk-muted)]">{label}</p>
      <p className={clsx("display mt-2 text-3xl", tone === "gold" && "text-[var(--gold-light)]", tone === "signal" && "text-[#ff9e96]")}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--chalk-muted)]">{detail}</p> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="surface-flat px-5 py-10 text-center">
      <p className="display text-xl">{title}</p>
      {children ? <div className="mt-2 text-sm text-[var(--chalk-muted)]">{children}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "success" | "signal";
}) {
  const styles = {
    neutral: "border-white/10 bg-white/5 text-[var(--chalk-muted)]",
    gold: "border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold-light)]",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    signal: "border-[var(--signal)]/30 bg-[var(--signal)]/10 text-[#ffaaa3]",
  };
  return <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", styles[tone])}>{children}</span>;
}

export function BackLink({ href, children = "Back" }: { href: string; children?: React.ReactNode }) {
  return <Link href={href} className="text-sm font-semibold text-[var(--gold-light)] hover:underline">{children}</Link>;
}

export function SubmitButton({ children, tone = "primary", className }: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  return <button type="submit" className={clsx("button", `button-${tone}`, className)}>{children}</button>;
}
