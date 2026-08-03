import "server-only";

import { timingSafeEqual } from "node:crypto";

export function validTedToken(value: string) {
  const expected = process.env.TED_INTAKE_TOKEN;
  let candidate: string;
  try {
    candidate = decodeURIComponent(value);
  } catch {
    return false;
  }
  if (!expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}
