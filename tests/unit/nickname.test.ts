import { describe, expect, it } from "vitest";
import { chooseNicknameOptions, normalizeNickname } from "@/lib/auth/nickname";

describe("nickname authentication", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeNickname("  The   Wombat  ")).toBe("the wombat");
  });

  it("returns the real nickname and two distinct real decoys", () => {
    const options = chooseNicknameOptions("Disco", ["Sully", "Haggis", "Nugget", "Sully"], () => 0.42);
    expect(options).toHaveLength(3);
    expect(options).toContain("Disco");
    expect(new Set(options).size).toBe(3);
    expect(options.every((value) => ["Disco", "Sully", "Haggis", "Nugget"].includes(value))).toBe(true);
  });

  it("refuses to invent decoys", () => {
    expect(() => chooseNicknameOptions("Disco", ["Sully"])).toThrow(/two other nicknames/i);
  });
});
