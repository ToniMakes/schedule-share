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

  it("returns stored candidate votes for candidate poll edit pages", async () => {
    const repository = new FakeReadParticipantRepository(buildCandidatePollParticipantRecord());

    const result = await getParticipantAvailabilityView(
      "candidate123",
      "participant-1",
      "edit-secret",
      {
        repository
      }
    );

    expect(result.schedule.scheduleMode).toBe("candidate_poll");
    expect(result.participant.candidateVotes).toEqual([
      {
        candidateTimeOptionId: "option-1",
        preferenceRank: 1,
        response: "available"
      },
      {
        candidateTimeOptionId: "option-2",
        preferenceRank: 2,
        response: "maybe"
      }
    ]);
  });

  it("derives candidate edit votes from legacy available slots when no votes are stored", async () => {
    const record = buildCandidatePollParticipantRecord();
    const repository = new FakeReadParticipantRepository({
      ...record,
      participant: {
        ...record.participant,
        candidateVotes: [],
        availableSlots: [
          {
            slotStartUtc: new Date("2026-08-04T09:00:00.000Z"),
            slotEndUtc: new Date("2026-08-04T10:00:00.000Z")
          }
        ]
      }
    });

    const result = await getParticipantAvailabilityView(
      "candidate123",
      "participant-1",
      "edit-secret",
      {
        repository
      }
    );

    expect(result.participant.candidateVotes).toEqual([
      {
        candidateTimeOptionId: "option-2",
        response: "available"
      }
    ]);
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
      scheduleMode: "availability_grid",
      status: "open"
    },
    candidateTimeOptions: [],
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

function buildCandidatePollParticipantRecord(): ParticipantAvailabilityWithScheduleRecord {
  return {
    schedule: {
      id: "schedule-1",
      publicId: "candidate123",
      title: "Project sync",
      description: null,
      timezone: "Australia/Sydney",
      dateRangeStart: "2026-08-03",
      dateRangeEnd: "2026-08-04",
      slotMinutes: 60,
      dailyWindows: [],
      scheduleMode: "candidate_poll",
      status: "open"
    },
    candidateTimeOptions: [
      {
        id: "option-1",
        label: "Option A",
        slotStartUtc: new Date("2026-08-03T08:00:00.000Z"),
        slotEndUtc: new Date("2026-08-03T09:00:00.000Z")
      },
      {
        id: "option-2",
        label: "Option B",
        slotStartUtc: new Date("2026-08-04T09:00:00.000Z"),
        slotEndUtc: new Date("2026-08-04T10:00:00.000Z")
      }
    ],
    participant: {
      id: "participant-1",
      displayName: "Ada",
      editKeyHash: hashKey("edit-secret"),
      availableSlots: [],
      candidateVotes: [
        {
          candidateTimeOptionId: "option-1",
          preferenceRank: 1,
          response: "available"
        },
        {
          candidateTimeOptionId: "option-2",
          preferenceRank: 2,
          response: "maybe"
        }
      ]
    }
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
