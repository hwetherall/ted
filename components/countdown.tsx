"use client";

import { useEffect, useState } from "react";

function difference(target: number) {
  const remaining = Math.max(0, target - Date.now());
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
  };
}

export function Countdown({ target }: { target: string }) {
  const [value, setValue] = useState(() => difference(new Date(target).getTime()));
  useEffect(() => {
    const timer = window.setInterval(() => setValue(difference(new Date(target).getTime())), 60_000);
    return () => window.clearInterval(timer);
  }, [target]);

  return (
    <div className="flex gap-5" aria-label={`${value.days} days, ${value.hours} hours and ${value.minutes} minutes to go`}>
      {Object.entries(value).map(([label, number]) => (
        <div key={label}>
          <p className="mono text-3xl text-[var(--gold-light)] sm:text-4xl">{String(number).padStart(2, "0")}</p>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--chalk-muted)]">{label}</p>
        </div>
      ))}
    </div>
  );
}
