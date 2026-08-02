import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import {
  assertMaintenanceCronAuthorized,
  cleanupExpiredSchedules,
  readScheduleCleanupConfig
} from "./cleanup-expired-schedules";
import type {
  ScheduleMaintenanceMutationResult,
  ScheduleMaintenanceRepository
} from "../schedules/repository";

class FakeScheduleMaintenanceRepository implements ScheduleMaintenanceRepository {
  archiveCalls: Array<{
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
    readonly now: Date;
  }> = [];
  hardDeleteCalls: Array<{
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
  }> = [];

  constructor(
    private readonly archiveResult: ScheduleMaintenanceMutationResult,
    private readonly hardDeleteResult: ScheduleMaintenanceMutationResult
  ) {}

  async archiveExpiredSchedules(input: {
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
    readonly now: Date;
  }): Promise<ScheduleMaintenanceMutationResult> {
    this.archiveCalls.push(input);
    return this.archiveResult;
  }

  async hardDeleteArchivedSchedules(input: {
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
  }): Promise<ScheduleMaintenanceMutationResult> {
    this.hardDeleteCalls.push(input);
    return this.hardDeleteResult;
  }
}

describe("cleanupExpiredSchedules", () => {
  it("archives expired schedules and hard deletes archived schedules after the grace period", async () => {
    const now = new Date("2026-08-02T12:00:00.000Z");
    const repository = new FakeScheduleMaintenanceRepository({ count: 2 }, { count: 1 });

    const result = await cleanupExpiredSchedules(
      {
        now: () => now,
        repository
      },
      {
        batchSize: 25,
        hardDeleteGraceDays: 14
      }
    );

    expect(result).toEqual({
      archivedCount: 2,
      batchSize: 25,
      deletedCount: 1,
      expiresAtCutoff: now,
      hardDeleteCutoff: new Date("2026-07-19T12:00:00.000Z"),
      hardDeleteGraceDays: 14,
      ranAt: now
    });
    expect(repository.archiveCalls).toEqual([
      {
        expiresAtOrBefore: now,
        limit: 25,
        now
      }
    ]);
    expect(repository.hardDeleteCalls).toEqual([
      {
        expiresAtOrBefore: new Date("2026-07-19T12:00:00.000Z"),
        limit: 25
      }
    ]);
  });
});

describe("assertMaintenanceCronAuthorized", () => {
  it("accepts the Vercel cron authorization header", () => {
    expect(() =>
      assertMaintenanceCronAuthorized(headersWithAuthorization("Bearer secret"), {
        CRON_SECRET: "secret"
      })
    ).not.toThrow();
  });

  it("rejects requests when CRON_SECRET is missing", () => {
    expect(() =>
      assertMaintenanceCronAuthorized(headersWithAuthorization("Bearer secret"), {})
    ).toThrowError(
      expect.objectContaining({
        code: "INTERNAL_ERROR",
        status: 503
      } satisfies Partial<HttpError>)
    );
  });

  it("rejects requests with an invalid bearer token", () => {
    expect(() =>
      assertMaintenanceCronAuthorized(headersWithAuthorization("Bearer wrong"), {
        CRON_SECRET: "secret"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "UNAUTHENTICATED",
        status: 401
      } satisfies Partial<HttpError>)
    );
  });
});

describe("readScheduleCleanupConfig", () => {
  it("uses conservative defaults", () => {
    expect(readScheduleCleanupConfig({})).toEqual({
      batchSize: 100,
      hardDeleteGraceDays: 30
    });
  });

  it("accepts bounded integer overrides", () => {
    expect(
      readScheduleCleanupConfig({
        SCHEDULE_CLEANUP_BATCH_SIZE: "250",
        SCHEDULE_HARD_DELETE_GRACE_DAYS: "45"
      })
    ).toEqual({
      batchSize: 250,
      hardDeleteGraceDays: 45
    });
  });

  it("rejects invalid cleanup bounds", () => {
    expect(() =>
      readScheduleCleanupConfig({
        SCHEDULE_CLEANUP_BATCH_SIZE: "0"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INTERNAL_ERROR",
        status: 500
      } satisfies Partial<HttpError>)
    );
  });
});

function headersWithAuthorization(value: string): Pick<Headers, "get"> {
  return {
    get(name: string): string | null {
      return name.toLowerCase() === "authorization" ? value : null;
    }
  };
}
