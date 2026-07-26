import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { exportOwnerScheduleCsv } from "./export-owner-schedule";
import type {
  OwnerScheduleWithAvailabilityRecord,
  ReadOwnerScheduleRepository
} from "./repository";

class FakeOwnerScheduleRepository implements ReadOwnerScheduleRepository {
  constructor(private readonly record?: OwnerScheduleWithAvailabilityRecord) {}

  async getOwnerScheduleByPublicId(): Promise<OwnerScheduleWithAvailabilityRecord | undefined> {
    return this.record;
  }
}

describe("exportOwnerScheduleCsv", () => {
  it("exports owner schedule results as CSV", async () => {
    const result = await exportOwnerScheduleCsv("abc123", "owner-secret", {
      repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
    });

    expect(result.filename).toBe("schedule-abc123-results.csv");
    expect(result.content).toContain("日程标题,Team dinner");
    expect(result.content).toContain("全员可用连续时间段");
    expect(result.content).toContain('2026-08-01,09:00,09:30,1,2,2,"Ada; Ben, Jr."""');
    expect(result.content).toContain("2026-08-01,09:30,10:00,1,2,否,Ada");
    expect(result.content).toContain('"Ben, Jr."""');
  });

  it("rejects an invalid owner key", async () => {
    await expect(
      exportOwnerScheduleCsv("abc123", "wrong", {
        repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
      })
    ).rejects.toMatchObject({
      code: "INVALID_OWNER_KEY",
      status: 403
    } satisfies Partial<HttpError>);
  });
});

function buildOwnerScheduleRecord(): OwnerScheduleWithAvailabilityRecord {
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
      status: "open",
      ownerKeyHash: hashKey("owner-secret")
    },
    participants: [
      {
        id: "participant-1",
        displayName: "Ada"
      },
      {
        id: "participant-2",
        displayName: 'Ben, Jr."'
      }
    ],
    availabilitySlots: [
      {
        participantId: "participant-1",
        slotStartUtc: new Date("2026-07-31T23:00:00.000Z"),
        slotEndUtc: new Date("2026-07-31T23:30:00.000Z")
      },
      {
        participantId: "participant-2",
        slotStartUtc: new Date("2026-07-31T23:00:00.000Z"),
        slotEndUtc: new Date("2026-07-31T23:30:00.000Z")
      },
      {
        participantId: "participant-1",
        slotStartUtc: new Date("2026-07-31T23:30:00.000Z"),
        slotEndUtc: new Date("2026-08-01T00:00:00.000Z")
      }
    ]
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
