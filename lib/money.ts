export function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function dollarsToCents(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Enter a valid AUD amount.");
  const [dollars, fraction = ""] = normalized.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

export function calculatePerHead(fixedCents: number, perHeadCents: number, headcount: number) {
  if (headcount <= 0) return { amountPerHeadCents: 0, roundingSurplusCents: 0 };
  const eventTotal = fixedCents + perHeadCents * headcount;
  const amountPerHeadCents = Math.ceil(eventTotal / (headcount * 100)) * 100;
  return {
    amountPerHeadCents,
    roundingSurplusCents: amountPerHeadCents * headcount - eventTotal,
  };
}
