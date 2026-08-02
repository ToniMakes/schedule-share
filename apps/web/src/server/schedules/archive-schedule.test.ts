import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { archiveScheduleRecord } from "./archive-schedule";
import type {
  ArchivedScheduleRecord,
  ArchiveScheduleRepository,
  OwnerScheduleWithAvailabilityRecord
} from "./repository";

class FakeArchiveScheduleRepository implements ArchiveScheduleRepository {
  readonly archivedScheduleIds: string[] = [];

  constructor(private readonly record?: OwnerScheduleWithAvailabilityRecord) {}

  async getOwnerScheduleByPublicId(): Promise<OwnerScheduleWithAvailabilityRecord | undefined> {
    return this.record;
  }

  async archiveSchedule(scheduleId: string): Promise<ArchivedScheduleRecord | undefined> {
    this.archivedScheduleIds.push(scheduleId);

    return {
      publicId: "abc123",
      status: "archived"
    };
  }
}

describe("archiveScheduleRecord", () => {
  it("archives an open schedule with a valid owner key", async () => {
    const repository = new FakeArchiveScheduleRepository(buildOwnerScheduleRecord());

    const result = await archiveScheduleRecord(
      "abc123",
      {
        ownerKey: "owner-secret"
      },
      { repository }
    );

    expect(result).toEqual({
      schedule: {
        publicId: "abc123",
        status: "archived"
      }
    });
    expect(repository.archivedScheduleIds).toEqual(["schedule-1"]);
  });

  it("archives a locked schedule", async () => {
    const repository = new FakeArchiveScheduleRepository(
      buildOwnerScheduleRecord({
        status: "locked"
      })
    );

    const result = await archiveScheduleRecord(
      "abc123",
      {
        ownerKey: "owner-secret"
      },
      { repository }
    );

    expect(result.schedule.status).toBe("archived");
    expect(repository.archivedScheduleIds).toEqual(["schedule-1"]);
  });

  it("treats an already archived schedule as archived without updating again", async () => {
    const repository = new FakeArchiveScheduleRepository(
      buildOwnerScheduleRecord({
        status: "archived"
      })
    );

    const result = await archiveScheduleRecord(
      "abc123",
      {
        ownerKey: "owner-secret"
      },
      { repository }
    );

    expect(result.schedule.status).toBe("archived");
    expect(repository.archivedScheduleIds).toHaveLength(0);
  });

  it("rejects an invalid owner key", async () => {
    const repository = new FakeArchiveScheduleRepository(buildOwnerScheduleRecord());

    await expect(
      archiveScheduleRecord(
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
    expect(repository.archivedScheduleIds).toHaveLength(0);
  });

  it("throws not found when the schedule is missing", async () => {
    const repository = new FakeArchiveScheduleRepository();

    await expect(
      archiveScheduleRecord(
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
