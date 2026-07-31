import "server-only";

import bcrypt from "bcryptjs";
import { normalizeNickname } from "@/lib/auth/nickname";
import { requestAuditDetails, notifyFailedLogin } from "@/lib/auth/audit";
import { ensureDeviceId, mintPunterToken, setPunterSession } from "@/lib/auth/punter";
import { createServiceSupabase } from "@/lib/supabase/service";

export async function verifyNicknameLogin(punterId: string, nickname: string, returning: boolean) {
  const deviceId = await ensureDeviceId();
  const supabase = createServiceSupabase();
  const { data: lockout } = await supabase.from("lockouts").select("locked_until").eq("device_id", deviceId).maybeSingle();
  if (lockout && new Date(lockout.locked_until) > new Date()) return { ok: false as const, status: 423 };

  const { data: punter } = await supabase.from("punters").select("id,display_name,nickname,nickname_hash,claimed_at").eq("id", punterId).maybeSingle();
  if (!punter?.nickname) return { ok: false as const, status: 401 };
  const normalized = normalizeNickname(nickname);
  const success = returning
    ? Boolean(punter.nickname_hash && await bcrypt.compare(normalized, punter.nickname_hash))
    : !punter.claimed_at && normalized === normalizeNickname(punter.nickname);
  const audit = await requestAuditDetails();

  await supabase.from("auth_attempts").insert({
    punter_id: punter.id,
    chosen_nickname: nickname.slice(0, 200),
    success,
    device_id: deviceId,
    ip_hash: audit.ipHash,
    user_agent: audit.userAgent,
  });

  if (!success) {
    const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase.from("lockouts").select("failed_count").eq("device_id", deviceId).maybeSingle();
    await supabase.from("lockouts").upsert({
      device_id: deviceId,
      locked_until: lockedUntil,
      failed_count: (existing?.failed_count || 0) + 1,
    });
    void notifyFailedLogin(punter.display_name);
    return { ok: false as const, status: 401 };
  }

  if (!returning) {
    const nicknameHash = await bcrypt.hash(normalized, 10);
    await supabase.from("punters").update({ nickname_hash: nicknameHash, claimed_at: new Date().toISOString() }).eq("id", punter.id);
  }
  await supabase.from("lockouts").delete().eq("device_id", deviceId);
  await setPunterSession(await mintPunterToken(punter.id));
  return { ok: true as const, status: 200 };
}
