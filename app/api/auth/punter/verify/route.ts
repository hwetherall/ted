import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyNicknameLogin } from "@/lib/auth/verify-login";

const input = z.object({ punterId: z.uuid(), nickname: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a nickname." }, { status: 400 });
  const result = await verifyNicknameLogin(parsed.data.punterId, parsed.data.nickname, false);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "That did not match." }, { status: result.status });
}
