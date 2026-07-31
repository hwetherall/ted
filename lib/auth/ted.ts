import "server-only";

import { timingSafeEqual } from "node:crypto";

export function validTedToken(value: string) {
  const expected = process.env.TED_INTAKE_TOKEN;
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
