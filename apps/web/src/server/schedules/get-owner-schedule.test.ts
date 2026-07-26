import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { getOwnerScheduleView } from "./get-owner-schedule";
import type {
  OwnerScheduleWithAvailabilityRecord,
  ReadOwnerScheduleRepository
} from "./repository";

class FakeOwnerScheduleRepository implements ReadOwnerScheduleRepository {
  readonly publicIds: string[] = [];

  constructor(private readonly record?: OwnerScheduleWithAvailabilityRecord) {}

  async getOwnerScheduleByPublicId(
    publicId: string
  ): Promise<OwnerScheduleWithAvailabilityRecord | undefined> {
    this.publicIds.push(publicId);
    return this.record;
  }
}

describe("getOwnerScheduleView", () => {
  it("returns schedule results for a valid owner key", async () => {
    const repository = new FakeOwnerScheduleRepository(buildOwnerScheduleRecord());

    const result = await getOwnerScheduleView("abc123", "owner-secret", { repository });

    expect(repository.publicIds).toEqual(["abc123"]);
    expect(result.schedule).toMatchObject({
      publicId: "abc123",
      title: "Team dinner",
      status: "open"
    });
    expect(result.results.slotResults).toHaveLength(2);
  });

  it("rejects an invalid owner key", async () => {
    const repository = new FakeOwnerScheduleRepository(buildOwnerScheduleRecord());

    await expect(getOwnerScheduleView("abc123", "wrong", { repository })).rejects.toMatchObject({
      code: "INVALID_OWNER_KEY",
      status: 403
    } satisfies Partial<HttpError>);
  });

  it("throws not found when the schedule is missing", async () => {
    const repository = new FakeOwnerScheduleRepository();

    await expect(
      getOwnerScheduleView("missing", "owner-secret", { repository })
    ).rejects.toMatchObject({
      code: "SCHEDULE_NOT_FOUND",
      status: 404
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
    participants: [],
    availabilitySlots: []
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
