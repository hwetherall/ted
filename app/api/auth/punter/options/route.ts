import { NextResponse } from "next/server";
import { z } from "zod";
import { chooseNicknameOptions } from "@/lib/auth/nickname";
import { ensureDeviceId } from "@/lib/auth/punter";
import { createServiceSupabase } from "@/lib/supabase/service";

const input = z.object({ punterId: z.uuid() });

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid name." }, { status: 400 });
  const deviceId = await ensureDeviceId();
  const supabase = createServiceSupabase();
  const { data: lockout } = await supabase.from("lockouts").select("locked_until").eq("device_id", deviceId).maybeSingle();
  if (lockout && new Date(lockout.locked_until) > new Date()) return NextResponse.json({ lockedUntil: lockout.locked_until }, { status: 423 });

  const { data: target } = await supabase.from("punters").select("nickname,claimed_at").eq("id", parsed.data.punterId).maybeSingle();
  if (!target?.nickname) return NextResponse.json({ error: "That name is not ready yet. Message a groomsman." }, { status: 404 });
  if (target.claimed_at) return NextResponse.json({ returning: true }, { status: 409 });
  const { data: others } = await supabase.from("punters").select("nickname").neq("id", parsed.data.punterId).not("nickname", "is", null);
  return NextResponse.json({ options: chooseNicknameOptions(target.nickname, (others || []).map((item) => item.nickname).filter(Boolean)) });
}
