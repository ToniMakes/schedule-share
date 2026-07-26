import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { getParticipantAvailabilityView } from "./get-participant-availability";
import type {
  ParticipantAvailabilityWithScheduleRecord,
  ReadParticipantAvailabilityRepository
} from "./repository";

class FakeReadParticipantRepository implements ReadParticipantAvailabilityRepository {
  readonly calls: Array<{ readonly publicId: string; readonly participantId: string }> = [];

  constructor(private readonly record?: ParticipantAvailabilityWithScheduleRecord) {}

  async getParticipantAvailabilityByPublicId(
    publicId: string,
    participantId: string
  ): Promise<ParticipantAvailabilityWithScheduleRecord | undefined> {
    this.calls.push({ publicId, participantId });
    return this.record;
  }
}

describe("getParticipantAvailabilityView", () => {
  it("returns participant availability and generated schedule slots for a valid edit key", async () => {
    const repository = new FakeReadParticipantRepository(buildParticipantRecord());

    const result = await getParticipantAvailabilityView("abc123", "participant-1", "edit-secret", {
      repository
    });

    expect(repository.calls).toEqual([{ publicId: "abc123", participantId: "participant-1" }]);
    expect(result.participant).toMatchObject({
      id: "participant-1",
      displayName: "Ada",
      availableSlots: [
        {
          startUtc: "2026-07-31T23:00:00.000Z",
          endUtc: "2026-07-31T23:30:00.000Z"
        }
      ]
    });
    expect(result.slots).toHaveLength(2);
  });

  it("rejects an invalid edit key", async () => {
    const repository = new FakeReadParticipantRepository(buildParticipantRecord());

    await expect(
      getParticipantAvailabilityView("abc123", "participant-1", "wrong", { repository })
    ).rejects.toMatchObject({
      code: "INVALID_EDIT_KEY",
      status: 403
    } satisfies Partial<HttpError>);
  });

  it("throws not found when the participant record is missing", async () => {
    const repository = new FakeReadParticipantRepository();

    await expect(
      getParticipantAvailabilityView("abc123", "missing", "edit-secret", { repository })
    ).rejects.toMatchObject({
      code: "PARTICIPANT_NOT_FOUND",
      status: 404
    } satisfies Partial<HttpError>);
  });
});

function buildParticipantRecord(): ParticipantAvailabilityWithScheduleRecord {
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
      status: "open"
    },
    participant: {
      id: "participant-1",
      displayName: "Ada",
      editKeyHash: hashKey("edit-secret"),
      availableSlots: [
        {
          slotStartUtc: new Date("2026-07-31T23:00:00.000Z"),
          slotEndUtc: new Date("2026-07-31T23:30:00.000Z")
        }
      ]
    }
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
