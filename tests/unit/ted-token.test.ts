import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { validTedToken } from "@/lib/auth/ted";

const originalToken = process.env.TED_INTAKE_TOKEN;

describe("Ted bearer token", () => {
  beforeEach(() => {
    process.env.TED_INTAKE_TOKEN = "team-sheet-token-with-padding=";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.TED_INTAKE_TOKEN;
    else process.env.TED_INTAKE_TOKEN = originalToken;
  });

  it("accepts the exact token and its URL-encoded route value", () => {
    expect(validTedToken("team-sheet-token-with-padding=")).toBe(true);
    expect(validTedToken("team-sheet-token-with-padding%3D")).toBe(true);
  });

  it("rejects malformed, missing, and incorrect values", () => {
    expect(validTedToken("team-sheet-token-with-padding-x")).toBe(false);
    expect(validTedToken("bad%encoding")).toBe(false);
    delete process.env.TED_INTAKE_TOKEN;
    expect(validTedToken("team-sheet-token-with-padding=")).toBe(false);
  });
});
