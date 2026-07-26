import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { availabilitySlots, participants, schedules, scheduleStatusValues } from "../src";

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(currentDir, "../migrations");

describe("database schema", () => {
  it("exports the expected table names", () => {
    expect(getTableName(schedules)).toBe("schedules");
    expect(getTableName(participants)).toBe("participants");
    expect(getTableName(availabilitySlots)).toBe("availability_slots");
  });

  it("keeps schedule status values aligned with the domain model", () => {
    expect(scheduleStatusValues).toEqual(["open", "locked", "archived"]);
  });

  it("keeps key constraints in the initial migration", async () => {
    const migration = await readInitialMigration();

    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    expect(migration).toContain('CREATE TYPE "public"."schedule_status" AS ENUM');
    expect(migration).toContain('"schedules_public_id_unique"');
    expect(migration).toContain('"schedules_slot_minutes_supported"');
    expect(migration).toContain('"participants_id_schedule_id_unique"');
    expect(migration).toContain('"availability_slots_participant_schedule_fk"');
    expect(migration).toContain('"availability_slots_range_valid"');
  });
});

async function readInitialMigration(): Promise<string> {
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const initialMigration = migrationFiles[0];

  if (initialMigration === undefined) {
    throw new Error("No SQL migration files found.");
  }

  return readFile(join(migrationsDir, initialMigration), "utf8");
}
