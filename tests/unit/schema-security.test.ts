import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607310001_initial.sql"), "utf8");
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
});
