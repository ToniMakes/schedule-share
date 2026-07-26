import { type Database } from "@schedule-share/db";
import { describe, expect, it } from "vitest";

import { createScheduleRepository } from "./repository-factory";
import { DrizzleScheduleRepository } from "./repository";

function createFakeDatabase(): Database {
  return {} as Database;
}

describe("createScheduleRepository", () => {
  it("uses an injected database when provided", () => {
    const repository = createScheduleRepository({
      database: createFakeDatabase(),
      getDatabase: () => {
        throw new Error("getDatabase should not be called.");
      }
    });

    expect(repository).toBeInstanceOf(DrizzleScheduleRepository);
  });

  it("loads the database through the provided getter when no database is injected", () => {
    let called = false;

    const repository = createScheduleRepository({
      getDatabase: () => {
        called = true;
        return createFakeDatabase();
      }
    });

    expect(repository).toBeInstanceOf(DrizzleScheduleRepository);
    expect(called).toBe(true);
  });
});
