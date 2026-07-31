import { describe, expect, it } from "vitest";
import { calculatePerHead, dollarsToCents } from "@/lib/money";

describe("money", () => {
  it("parses AUD without floating point storage", () => {
    expect(dollarsToCents("$1,234.56")).toBe(123456);
    expect(dollarsToCents("80")).toBe(8000);
  });

  it("rounds per-head cost up to the next whole dollar", () => {
    expect(calculatePerHead(10000, 2550, 3)).toEqual({
      amountPerHeadCents: 5900,
      roundingSurplusCents: 50,
    });
  });

  it("guards zero headcount", () => {
    expect(calculatePerHead(10000, 2550, 0)).toEqual({ amountPerHeadCents: 0, roundingSurplusCents: 0 });
  });
});
