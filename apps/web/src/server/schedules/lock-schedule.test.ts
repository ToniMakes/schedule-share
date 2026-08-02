import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { lockScheduleRecord } from "./lock-schedule";
import type {
  LockedScheduleRecord,
  LockScheduleRepository,
  OwnerScheduleWithAvailabilityRecord
} from "./repository";

class FakeLockScheduleRepository implements LockScheduleRepository {
  readonly lockedScheduleIds: string[] = [];

  constructor(private readonly record?: OwnerScheduleWithAvailabilityRecord) {}

  async getOwnerScheduleByPublicId(): Promise<OwnerScheduleWithAvailabilityRecord | undefined> {
    return this.record;
  }

  async lockSchedule(scheduleId: string): Promise<LockedScheduleRecord | undefined> {
    this.lockedScheduleIds.push(scheduleId);

    return {
      publicId: "abc123",
      status: "locked"
    };
  }
}

describe("lockScheduleRecord", () => {
  it("locks an open schedule with a valid owner key", async () => {
    const repository = new FakeLockScheduleRepository(buildOwnerScheduleRecord());

    const result = await lockScheduleRecord(
      "abc123",
      {
        ownerKey: "owner-secret"
      },
      { repository }
    );

    expect(result).toEqual({
      schedule: {
        publicId: "abc123",
        status: "locked"
      }
    });
    expect(repository.lockedScheduleIds).toEqual(["schedule-1"]);
  });

  it("treats an already locked schedule as locked without updating again", async () => {
    const repository = new FakeLockScheduleRepository(
      buildOwnerScheduleRecord({
        status: "locked"
      })
    );

    const result = await lockScheduleRecord(
      "abc123",
      {
        ownerKey: "owner-secret"
      },
      { repository }
    );

    expect(result.schedule.status).toBe("locked");
    expect(repository.lockedScheduleIds).toHaveLength(0);
  });

  it("rejects an invalid owner key", async () => {
    const repository = new FakeLockScheduleRepository(buildOwnerScheduleRecord());

    await expect(
      lockScheduleRecord(
        "abc123",
        {
          ownerKey: "wrong"
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "INVALID_OWNER_KEY",
      status: 403
    } satisfies Partial<HttpError>);
    expect(repository.lockedScheduleIds).toHaveLength(0);
  });

  it("rejects archived schedules", async () => {
    const repository = new FakeLockScheduleRepository(
      buildOwnerScheduleRecord({
        status: "archived"
      })
    );

    await expect(
      lockScheduleRecord(
        "abc123",
        {
          ownerKey: "owner-secret"
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_LOCKED",
      status: 409
    } satisfies Partial<HttpError>);
    expect(repository.lockedScheduleIds).toHaveLength(0);
  });

  it("throws not found when the schedule is missing", async () => {
    const repository = new FakeLockScheduleRepository();

    await expect(
      lockScheduleRecord(
        "missing",
        {
          ownerKey: "owner-secret"
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_NOT_FOUND",
      status: 404
    } satisfies Partial<HttpError>);
  });
});

function buildOwnerScheduleRecord(
  overrides: Partial<OwnerScheduleWithAvailabilityRecord["schedule"]> = {}
): OwnerScheduleWithAvailabilityRecord {
  return {
    schedule: {
      id: "schedule-1",
      publicId: "abc123",
      title: "Team dinner",
      description: null,
      timezone: "Australia/Sydney",
      dateRangeStart: "2026-08-01",
      dateRangeEnd: "2026-08-01",
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:00"
        }
      ],
      scheduleMode: "availability_grid",
      status: "open",
      ownerKeyHash: hashKey("owner-secret"),
      ...overrides
    },
    candidateTimeOptions: [],
    participants: [],
    availabilitySlots: []
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
