import { UnlockTime } from "@/components/unlock-time";
import { getDeviceId } from "@/lib/auth/punter";
import { hasSupabaseConfig } from "@/lib/config";
import { createServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function LockedPage() {
  const deviceId = await getDeviceId();
  let lockedUntil: string | null = null;
  if (deviceId && hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createServiceSupabase().from("lockouts").select("locked_until").eq("device_id", deviceId).maybeSingle();
    if (data?.locked_until) lockedUntil = data.locked_until;
  }
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="surface w-full max-w-md border-[var(--signal)]/30 p-7 sm:p-9">
        <p className="eyebrow text-[#ff9f97]">Locked out</p>
        <h1 className="display mt-3 text-4xl">Wrong nickname.</h1>
        <p className="mt-4 leading-7 text-[var(--chalk-muted)]">{lockedUntil ? <>This device can try again after <span className="font-bold text-[var(--chalk)]"><UnlockTime value={lockedUntil} /></span>.</> : "This device cannot try again yet."}</p>
        <p className="mt-3 leading-7 text-[var(--chalk-muted)]">Need the trip details now? Message a groomsman and they can clear it.</p>
      </section>
    </main>
  );
}
