import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import type {
  ParticipantAvailabilityWithScheduleRecord,
  UpdateParticipantAvailabilityRecord,
  UpdateParticipantAvailabilityRepository
} from "./repository";
import { updateParticipantAvailabilityRecord } from "./update-participant-availability";

class FakeUpdateParticipantRepository implements UpdateParticipantAvailabilityRepository {
  readonly updates: UpdateParticipantAvailabilityRecord[] = [];

  constructor(private readonly record?: ParticipantAvailabilityWithScheduleRecord) {}

  async getParticipantAvailabilityByPublicId(): Promise<
    ParticipantAvailabilityWithScheduleRecord | undefined
  > {
    return this.record;
  }

  async updateParticipantAvailability(record: UpdateParticipantAvailabilityRecord) {
    this.updates.push(record);

    return {
      id: record.participantId,
      displayName: record.displayName
    };
  }
}

describe("updateParticipantAvailabilityRecord", () => {
  it("validates and persists participant availability updates", async () => {
    const repository = new FakeUpdateParticipantRepository(buildParticipantRecord());

    const result = await updateParticipantAvailabilityRecord(
      "abc123",
      "participant-1",
      {
        editKey: "edit-secret",
        displayName: "Ada Lovelace",
        availableSlots: [
          {
            startUtc: "2026-07-31T23:30:00.000Z",
            endUtc: "2026-08-01T00:00:00.000Z"
          }
        ]
      },
      { repository }
    );

    expect(result).toEqual({
      participant: {
        id: "participant-1",
        displayName: "Ada Lovelace"
      }
    });
    expect(repository.updates).toHaveLength(1);
    expect(repository.updates[0]).toMatchObject({
      scheduleId: "schedule-1",
      participantId: "participant-1",
      displayName: "Ada Lovelace"
    });
    expect(repository.updates[0]!.availabilitySlots[0]!.slotStartUtc.toISOString()).toBe(
      "2026-07-31T23:30:00.000Z"
    );
  });

  it("rejects an invalid edit key", async () => {
    const repository = new FakeUpdateParticipantRepository(buildParticipantRecord());

    await expect(
      updateParticipantAvailabilityRecord(
        "abc123",
        "participant-1",
        {
          editKey: "wrong",
          displayName: "Ada",
          availableSlots: []
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "INVALID_EDIT_KEY",
      status: 403
    } satisfies Partial<HttpError>);
    expect(repository.updates).toHaveLength(0);
  });

  it("rejects updates for locked schedules", async () => {
    const record = buildParticipantRecord();
    const repository = new FakeUpdateParticipantRepository({
      ...record,
      schedule: {
        ...record.schedule,
        status: "locked"
      }
    });

    await expect(
      updateParticipantAvailabilityRecord(
        "abc123",
        "participant-1",
        {
          editKey: "edit-secret",
          displayName: "Ada",
          availableSlots: []
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_LOCKED",
      status: 409
    } satisfies Partial<HttpError>);
    expect(repository.updates).toHaveLength(0);
  });

  it("rejects availability outside the schedule range", async () => {
    const repository = new FakeUpdateParticipantRepository(buildParticipantRecord());

    await expect(
      updateParticipantAvailabilityRecord(
        "abc123",
        "participant-1",
        {
          editKey: "edit-secret",
          displayName: "Ada",
          availableSlots: [
            {
              startUtc: "2026-08-01T04:00:00.000Z",
              endUtc: "2026-08-01T04:30:00.000Z"
            }
          ]
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "SLOT_OUT_OF_RANGE",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.updates).toHaveLength(0);
  });

  it("persists candidate poll vote updates and derives available slots", async () => {
    const repository = new FakeUpdateParticipantRepository(buildCandidatePollParticipantRecord());

    await updateParticipantAvailabilityRecord(
      "candidate123",
      "participant-1",
      {
        editKey: "edit-secret",
        displayName: "Ada",
        availableSlots: [],
        candidateVotes: [
          {
            candidateTimeOptionId: "option-1",
            preferenceRank: 2,
            response: "maybe"
          },
          {
            candidateTimeOptionId: "option-2",
            preferenceRank: 1,
            response: "available"
          }
        ]
      },
      { repository }
    );

    expect(repository.updates[0]!.candidateVotes).toEqual([
      {
        candidateTimeOptionId: "option-1",
        preferenceRank: 2,
        response: "maybe"
      },
      {
        candidateTimeOptionId: "option-2",
        preferenceRank: 1,
        response: "available"
      }
    ]);
    expect(repository.updates[0]!.availabilitySlots).toHaveLength(1);
    expect(repository.updates[0]!.availabilitySlots[0]!.slotStartUtc.toISOString()).toBe(
      "2026-08-04T09:00:00.000Z"
    );
  });

  it("rejects duplicate candidate preference ranks on update", async () => {
    const repository = new FakeUpdateParticipantRepository(buildCandidatePollParticipantRecord());

    await expect(
      updateParticipantAvailabilityRecord(
        "candidate123",
        "participant-1",
        {
          editKey: "edit-secret",
          displayName: "Ada",
          availableSlots: [],
          candidateVotes: [
            {
              candidateTimeOptionId: "option-1",
              preferenceRank: 1,
              response: "maybe"
            },
            {
              candidateTimeOptionId: "option-2",
              preferenceRank: 1,
              response: "available"
            }
          ]
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.updates).toHaveLength(0);
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
      candidateVotes: []
    }
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
