import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607310001_initial.sql"), "utf8");
const stageTwo = readFileSync(join(process.cwd(), "supabase/migrations/202608020001_stage_2_team_sheet.sql"), "utf8");
const tedNotFound = readFileSync(join(process.cwd(), "app/ted/[token]/not-found.tsx"), "utf8");
const tables = ["groomsmen", "punters", "payments", "costs", "itinerary_items", "vault_items", "ted_submissions", "auth_attempts", "lockouts", "bank_import_profiles", "bank_import_batches", "bank_import_rows"];

describe("schema security declarations", () => {
  it.each(tables)("enables RLS on %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it("keeps the public vault projection free of submitter ids", () => {
    const view = migration.split("create view public.vault_items_public")[1].split("revoke all on public.punters_public")[0];
    const projection = view.split("from public.vault_items")[0];
    expect(projection).not.toContain("submitted_by");
  });

  it("uses a device id for lockouts", () => {
    expect(migration).toContain("device_id text primary key");
  });

  it("removes invitation ranking from both roster tables and its enum", () => {
    expect(stageTwo).toContain("alter table public.punters\n  drop column invite_priority;");
    expect(stageTwo).toContain("alter table public.ted_submissions\n  drop column invite_priority;");
    expect(stageTwo).toContain("drop type public.invite_priority;");
  });

  it("copies Ted's note to the private organiser note during roster processing", () => {
    expect(stageTwo).toContain("nickname, organiser_note, payment_reference");
    expect(stageTwo).toContain("staged.nickname, staged.note, candidate");
  });

  it("keeps organiser notes out of punter grants and views", () => {
    const selfView = stageTwo.split("create view public.punter_self")[1].split("revoke all on public.punter_self")[0];
    expect(selfView).not.toContain("organiser_note");
    expect(stageTwo).not.toMatch(/grant select \([^;]*organiser_note[^;]*\)\s*on public\.punters to punter/);
    expect(migration.split("create view public.punters_public")[1].split("create view public.punter_self")[0]).not.toContain("organiser_note");
  });

  it("gives invalid Ted links a generic response with no application navigation", () => {
    expect(tedNotFound).not.toContain("Link");
    expect(tedNotFound).not.toContain("href");
  });
});
