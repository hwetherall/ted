import { describe, expect, it } from "vitest";
import { chooseNicknameOptions, NICKNAME_BENCH, normalizeNickname } from "@/lib/auth/nickname";

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

  it("starts with a bench of ten distinct fake nicknames", () => {
    expect(NICKNAME_BENCH).toHaveLength(10);
    expect(new Set(NICKNAME_BENCH.map(normalizeNickname)).size).toBe(10);
  });

  it("uses two bench nicknames before real decoys exist", () => {
    const options = chooseNicknameOptions("Disco", [], () => 0.42);
    const decoys = options.filter((value) => value !== "Disco");
    expect(options).toHaveLength(3);
    expect(new Set(options).size).toBe(3);
    expect(decoys.every((value) => NICKNAME_BENCH.includes(value as typeof NICKNAME_BENCH[number]))).toBe(true);
  });

  it("replaces a bench nickname when one real decoy exists", () => {
    const options = chooseNicknameOptions("Disco", ["Sully"], () => 0.42);
    const decoys = options.filter((value) => value !== "Disco");
    expect(decoys).toContain("Sully");
    expect(decoys.filter((value) => NICKNAME_BENCH.includes(value as typeof NICKNAME_BENCH[number]))).toHaveLength(1);
  });

  it("does not duplicate a real nickname from the bench", () => {
    const options = chooseNicknameOptions("Disco", ["Bluey"], () => 0.42);
    expect(options.filter((value) => normalizeNickname(value) === "bluey")).toHaveLength(1);
  });
});
