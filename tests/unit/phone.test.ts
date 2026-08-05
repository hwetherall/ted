import { describe, expect, it } from "vitest";
import { DEFAULT_PHONE_COUNTRY_CODE, splitE164, toE164 } from "@/lib/phone";

describe("toE164", () => {
  it("returns null for an empty national number", () => {
    expect(toE164("+61", "")).toBeNull();
    expect(toE164("+61", "   ")).toBeNull();
  });

  it("strips a leading trunk 0 and composes Australia", () => {
    expect(toE164("+61", "0412 345 678")).toBe("+61412345678");
  });

  it("keeps a pasted international number", () => {
    expect(toE164("+61", "+44 7700 900123")).toBe("+447700900123");
  });

  it("composes UK and US numbers", () => {
    expect(toE164("+44", "07700 900123")).toBe("+447700900123");
    expect(toE164("+1", "(303) 555-0100")).toBe("+13035550100");
  });
});

describe("splitE164", () => {
  it("defaults empty values to Australia", () => {
    expect(splitE164(null)).toEqual({
      countryCode: DEFAULT_PHONE_COUNTRY_CODE,
      nationalNumber: "",
    });
  });

  it("splits known dial codes, preferring the longest match", () => {
    expect(splitE164("+61412345678")).toEqual({
      countryCode: "+61",
      nationalNumber: "412345678",
    });
    expect(splitE164("+353861234567")).toEqual({
      countryCode: "+353",
      nationalNumber: "861234567",
    });
  });
});
