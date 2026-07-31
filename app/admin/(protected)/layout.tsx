import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth/admin";
import { adminLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { groomsman } = await requireAdmin();
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:pt-7">
      <aside className="mb-7 lg:sticky lg:top-7 lg:mb-0 lg:h-[calc(100vh-3.5rem)]">
        <div className="flex items-center justify-between lg:block">
          <Link href="/admin" className="display text-2xl tracking-tight"><span className="text-[var(--gold)]">TED</span> / back room</Link>
          <form action={adminLogoutAction}><button className="text-xs font-semibold text-[var(--chalk-muted)] hover:text-[var(--chalk)]">Sign out</button></form>
        </div>
        <div className="mt-5 lg:mt-8"><AdminNav /></div>
        <div className="mt-6 hidden border-t border-white/10 pt-5 text-xs text-[var(--chalk-muted)] lg:block">
          <p className="font-bold text-[var(--chalk)]">{groomsman.name}</p>
          <p className="mt-1">{groomsman.is_treasurer ? "Treasurer" : "Groomsman"}</p>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
