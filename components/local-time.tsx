"use client";

import { useSyncExternalStore } from "react";
import { EVENT_TZ } from "@/lib/config";

export function LocalTime({ value }: { value: string }) {
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  if (!hydrated) return null;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const local = zone === EVENT_TZ ? null : new Intl.DateTimeFormat(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(value));
  return local ? <span className="mt-1 block text-xs text-[var(--chalk-muted)]">Your time: {local}</span> : null;
}
