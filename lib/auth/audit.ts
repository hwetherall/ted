import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

export async function requestAuditDetails() {
  const requestHeaders = await headers();
  const rawIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_JWT_SECRET || "development-only";
  return {
    ipHash: createHash("sha256").update(`${salt}:${rawIp}`).digest("hex"),
    userAgent: requestHeaders.get("user-agent")?.slice(0, 500) || null,
  };
}

export async function notifyFailedLogin(displayName: string) {
  const url = process.env.ADMIN_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `Failed Ted login attempt for ${displayName}.` }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // Login must not depend on the coordination webhook.
  }
}
