import "server-only";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PUNTER_SESSION_DAYS } from "@/lib/config";
import { createPunterSupabase } from "@/lib/supabase/punter";

export const PUNTER_COOKIE = "ted_punter_session";
export const DEVICE_COOKIE = "ted_device_id";

export type PunterClaims = JWTPayload & {
  role: "punter";
  punter_id: string;
};

function signingKey() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not configured.");
  return new TextEncoder().encode(secret);
}

export async function mintPunterToken(punterId: string) {
  return new SignJWT({ role: "punter", punter_id: punterId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(punterId)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(`${PUNTER_SESSION_DAYS}d`)
    .sign(signingKey());
}

export async function verifyPunterToken(token: string): Promise<PunterClaims | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), { audience: "authenticated" });
    if (payload.role !== "punter" || typeof payload.punter_id !== "string") return null;
    return payload as PunterClaims;
  } catch {
    return null;
  }
}

export async function getPunterSession() {
  const token = (await cookies()).get(PUNTER_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyPunterToken(token);
  return claims ? { claims, token, supabase: createPunterSupabase(token) } : null;
}

export async function requirePunter() {
  const session = await getPunterSession();
  if (!session) redirect("/login/returning");
  return session;
}

export async function setPunterSession(token: string) {
  (await cookies()).set(PUNTER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PUNTER_SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearPunterSession() {
  (await cookies()).set(PUNTER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function ensureDeviceId() {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;
  const deviceId = crypto.randomUUID();
  store.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return deviceId;
}

export async function getDeviceId() {
  return (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
}
