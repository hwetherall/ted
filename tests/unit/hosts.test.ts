import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crewHost,
  hostIsolationEnabled,
  isCrewHost,
  isLocalHost,
  isStaticOrInternalPath,
  isTedHost,
  isTedPath,
  normalizeHost,
  requestHost,
  tedHost,
  tedTeamSheetPath,
} from "@/lib/hosts";

const original = {
  TED_HOST: process.env.TED_HOST,
  CREW_HOST: process.env.CREW_HOST,
  NEXT_PUBLIC_TED_HOST: process.env.NEXT_PUBLIC_TED_HOST,
  NEXT_PUBLIC_CREW_HOST: process.env.NEXT_PUBLIC_CREW_HOST,
  TED_INTAKE_TOKEN: process.env.TED_INTAKE_TOKEN,
};

describe("hosts", () => {
  beforeEach(() => {
    process.env.TED_HOST = "ted-837461.harrywetherall.com";
    process.env.CREW_HOST = "stag-482719.harrywetherall.com";
    process.env.TED_INTAKE_TOKEN = "team-sheet-token-with-padding=";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("normalizes hosts and strips ports", () => {
    expect(normalizeHost("Stag-482719.HarryWetherall.com:443")).toBe(
      "stag-482719.harrywetherall.com",
    );
    expect(normalizeHost("[::1]:3000")).toBe("[::1]");
    expect(normalizeHost(null)).toBe("");
    expect(
      requestHost({
        get: (name) =>
          name === "x-forwarded-host"
            ? "ted-837461.harrywetherall.com, vercel.app"
            : "ignored.example",
      }),
    ).toBe("ted-837461.harrywetherall.com");
  });

  it("falls back to NEXT_PUBLIC host env vars", () => {
    delete process.env.TED_HOST;
    delete process.env.CREW_HOST;
    process.env.NEXT_PUBLIC_TED_HOST = "ted-837461.harrywetherall.com";
    process.env.NEXT_PUBLIC_CREW_HOST = "stag-482719.harrywetherall.com";
    expect(tedHost()).toBe("ted-837461.harrywetherall.com");
    expect(crewHost()).toBe("stag-482719.harrywetherall.com");
    expect(hostIsolationEnabled()).toBe(true);
  });

  it("detects local hosts", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("stag-482719.harrywetherall.com")).toBe(false);
  });

  it("reads configured hosts and isolation flag", () => {
    expect(tedHost()).toBe("ted-837461.harrywetherall.com");
    expect(crewHost()).toBe("stag-482719.harrywetherall.com");
    expect(hostIsolationEnabled()).toBe(true);
    delete process.env.TED_HOST;
    expect(hostIsolationEnabled()).toBe(false);
  });

  it("classifies Ted and crew hosts", () => {
    expect(isTedHost("ted-837461.harrywetherall.com")).toBe(true);
    expect(isTedHost("stag-482719.harrywetherall.com")).toBe(false);
    expect(isCrewHost("stag-482719.harrywetherall.com")).toBe(true);
    expect(isCrewHost("ted-flax.vercel.app")).toBe(true);
    expect(isCrewHost("ted-837461.harrywetherall.com")).toBe(false);
    expect(isCrewHost("localhost")).toBe(false);
  });

  it("builds the team-sheet rewrite path", () => {
    expect(tedTeamSheetPath()).toBe("/ted/team-sheet-token-with-padding%3D");
    expect(tedTeamSheetPath("plain-token")).toBe("/ted/plain-token");
    delete process.env.TED_INTAKE_TOKEN;
    expect(tedTeamSheetPath()).toBe(null);
  });

  it("recognizes Ted and static paths", () => {
    expect(isTedPath("/ted")).toBe(true);
    expect(isTedPath("/ted/abc")).toBe(true);
    expect(isTedPath("/login")).toBe(false);
    expect(isStaticOrInternalPath("/_next/static/chunk.js")).toBe(true);
    expect(isStaticOrInternalPath("/favicon.ico")).toBe(true);
    expect(isStaticOrInternalPath("/login")).toBe(false);
  });
});
