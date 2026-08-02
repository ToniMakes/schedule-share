import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  availabilitySlots,
  candidateTimeOptions,
  candidateVoteResponseValues,
  candidateVotes,
  participants,
  scheduleModeValues,
  schedules,
  scheduleStatusValues
} from "../src";

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(currentDir, "../migrations");

describe("database schema", () => {
  it("exports the expected table names", () => {
    expect(getTableName(schedules)).toBe("schedules");
    expect(getTableName(participants)).toBe("participants");
    expect(getTableName(availabilitySlots)).toBe("availability_slots");
    expect(getTableName(candidateTimeOptions)).toBe("candidate_time_options");
    expect(getTableName(candidateVotes)).toBe("candidate_votes");
  });

  it("keeps schedule status values aligned with the domain model", () => {
    expect(scheduleStatusValues).toEqual(["open", "locked", "archived"]);
  });

  it("keeps schedule mode values aligned with the domain model", () => {
    expect(scheduleModeValues).toEqual(["availability_grid", "candidate_poll"]);
  });

  it("keeps candidate vote response values aligned with the domain model", () => {
    expect(candidateVoteResponseValues).toEqual(["available", "maybe", "unavailable"]);
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

  it("keeps candidate poll constraints in the candidate migration", async () => {
    const migration = await readMigration("0001");

    expect(migration).toContain('CREATE TYPE "public"."schedule_mode" AS ENUM');
    expect(migration).toContain('CREATE TABLE "candidate_time_options"');
    expect(migration).toContain('"candidate_time_options_schedule_slot_unique"');
    expect(migration).toContain('"candidate_time_options_range_valid"');
    expect(migration).toContain('ADD COLUMN "schedule_mode"');
  });

  it("keeps candidate vote constraints in the candidate vote migration", async () => {
    const migration = await readMigration("0002");

    expect(migration).toContain('CREATE TYPE "public"."candidate_vote_response" AS ENUM');
    expect(migration).toContain('CREATE TABLE "candidate_votes"');
    expect(migration).toContain('"candidate_votes_participant_option_unique"');
    expect(migration).toContain('"candidate_votes_participant_schedule_fk"');
  });

  it("keeps final time columns in the final time migration", async () => {
    const migration = await readMigration("0003");

    expect(migration).toContain('ADD COLUMN "final_start_utc"');
    expect(migration).toContain('ADD COLUMN "final_end_utc"');
    expect(migration).toContain('"schedules_final_time_valid"');
  });

  it("keeps candidate preference rank in the preference migration", async () => {
    const migration = await readMigration("0004");

    expect(migration).toContain('ADD COLUMN "preference_rank" integer');
    expect(migration).toContain('"candidate_votes_preference_rank_valid"');
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

async function readMigration(prefix: string): Promise<string> {
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const migration = migrationFiles.find((file) => file.startsWith(prefix));

  if (migration === undefined) {
    throw new Error(`No SQL migration file found for ${prefix}.`);
  }

  return readFile(join(migrationsDir, migration), "utf8");
}
