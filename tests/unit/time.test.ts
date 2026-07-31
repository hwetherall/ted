import { describe, expect, it } from "vitest";
import { eventInputToUtc, formatEventTime } from "@/lib/time";

describe("event timezone", () => {
  it("converts Melbourne authoring time to UTC", () => {
    expect(eventInputToUtc("2027-04-10T19:00")).toBe("2027-04-10T09:00:00.000Z");
  });

  it("always labels the event timezone", () => {
    expect(formatEventTime("2027-04-10T09:00:00.000Z")).toContain("AEST");
  });
});
