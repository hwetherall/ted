/** Curated dial codes for Ted's intake. Australia first; crew also covers UK and US. */
export const PHONE_COUNTRY_CODES = [
  { code: "+61", label: "AU +61" },
  { code: "+44", label: "UK +44" },
  { code: "+1", label: "US/CA +1" },
  { code: "+64", label: "NZ +64" },
  { code: "+353", label: "IE +353" },
  { code: "+33", label: "FR +33" },
  { code: "+49", label: "DE +49" },
  { code: "+34", label: "ES +34" },
  { code: "+39", label: "IT +39" },
  { code: "+31", label: "NL +31" },
  { code: "+65", label: "SG +65" },
  { code: "+971", label: "AE +971" },
  { code: "+27", label: "ZA +27" },
] as const;

export const DEFAULT_PHONE_COUNTRY_CODE = "+61";

const knownCodesLongestFirst = [...PHONE_COUNTRY_CODES]
  .map((entry) => entry.code)
  .sort((a, b) => b.length - a.length);

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Build E.164 from a dial code and a national number. Empty national → null. */
export function toE164(countryCode: string, nationalNumber: string): string | null {
  const trimmed = nationalNumber.trim();
  if (!trimmed) return null;

  // Pasted international number: keep it as the source of truth.
  if (trimmed.startsWith("+")) {
    const international = `+${digitsOnly(trimmed)}`;
    return international.length > 1 ? international : null;
  }

  const dial = digitsOnly(countryCode);
  if (!dial) return null;

  // Drop a leading trunk 0 (e.g. 0412… → 412…).
  const national = digitsOnly(trimmed).replace(/^0+/, "");
  if (!national) return null;

  return `+${dial}${national}`;
}

/** Split a stored E.164 value back into dial code + national number for the form. */
export function splitE164(phone: string | null | undefined): {
  countryCode: string;
  nationalNumber: string;
} {
  if (!phone?.trim()) {
    return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, nationalNumber: "" };
  }

  const trimmed = phone.trim();
  if (!trimmed.startsWith("+")) {
    return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, nationalNumber: digitsOnly(trimmed) };
  }

  for (const code of knownCodesLongestFirst) {
    if (trimmed.startsWith(code)) {
      return { countryCode: code, nationalNumber: trimmed.slice(code.length) };
    }
  }

  return {
    countryCode: DEFAULT_PHONE_COUNTRY_CODE,
    nationalNumber: digitsOnly(trimmed),
  };
}
