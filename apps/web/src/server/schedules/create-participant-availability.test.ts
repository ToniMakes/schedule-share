import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { createParticipantAvailabilityRecord } from "./create-participant-availability";
import type {
  CreateParticipantAvailabilityRecord,
  CreateParticipantAvailabilityRepository,
  ScheduleWithAvailabilityRecord
} from "./repository";

class FakeParticipantRepository implements CreateParticipantAvailabilityRepository {
  readonly createdRecords: CreateParticipantAvailabilityRecord[] = [];
  readonly publicIds: string[] = [];

  constructor(private readonly record?: ScheduleWithAvailabilityRecord) {}

  async getScheduleByPublicId(
    publicId: string
  ): Promise<ScheduleWithAvailabilityRecord | undefined> {
    this.publicIds.push(publicId);
    return this.record;
  }

  async createParticipantAvailability(record: CreateParticipantAvailabilityRecord) {
    this.createdRecords.push(record);

    return {
      id: "participant-1",
      displayName: record.displayName
    };
  }
}

describe("createParticipantAvailabilityRecord", () => {
  it("validates slots, persists participant availability, and returns an edit link", async () => {
    const repository = new FakeParticipantRepository(buildScheduleRecord());

    const result = await createParticipantAvailabilityRecord(
      "abc123",
      {
        displayName: "Ada",
        availableSlots: [
          {
            startUtc: "2026-07-31T23:00:00.000Z",
            endUtc: "2026-07-31T23:30:00.000Z"
          }
        ]
      },
      {
        baseUrl: "https://example.com",
        editKeyFactory: () => "edit-secret",
        repository
      }
    );

    expect(result).toEqual({
      participant: {
        id: "participant-1",
        displayName: "Ada"
      },
      editUrl: "https://example.com/s/abc123/edit/participant-1?key=edit-secret"
    });
    expect(repository.publicIds).toEqual(["abc123"]);
    expect(repository.createdRecords).toHaveLength(1);
    expect(repository.createdRecords[0]).toMatchObject({
      scheduleId: "schedule-1",
      displayName: "Ada",
      editKeyHash: hashKey("edit-secret")
    });
    expect(repository.createdRecords[0]!.availabilitySlots[0]!.slotStartUtc.toISOString()).toBe(
      "2026-07-31T23:00:00.000Z"
    );
  });

  it("throws not found when the schedule is missing", async () => {
    const repository = new FakeParticipantRepository();

    await expect(
      createParticipantAvailabilityRecord(
        "missing",
        {
          displayName: "Ada",
          availableSlots: []
        },
        {
          baseUrl: "https://example.com",
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_NOT_FOUND",
      status: 404
    } satisfies Partial<HttpError>);
  });

  it("rejects submissions for locked schedules", async () => {
    const repository = new FakeParticipantRepository(
      buildScheduleRecord({
        schedule: {
          ...buildScheduleRecord().schedule,
          status: "locked"
        }
      })
    );

    await expect(
      createParticipantAvailabilityRecord(
        "abc123",
        {
          displayName: "Ada",
          availableSlots: []
        },
        {
          baseUrl: "https://example.com",
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_LOCKED",
      status: 409
    } satisfies Partial<HttpError>);
    expect(repository.createdRecords).toHaveLength(0);
  });

  it("rejects availability outside the schedule slot range", async () => {
    const repository = new FakeParticipantRepository(buildScheduleRecord());

    await expect(
      createParticipantAvailabilityRecord(
        "abc123",
        {
          displayName: "Ada",
          availableSlots: [
            {
              startUtc: "2026-08-01T04:00:00.000Z",
              endUtc: "2026-08-01T04:30:00.000Z"
            }
          ]
        },
        {
          baseUrl: "https://example.com",
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "SLOT_OUT_OF_RANGE",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.createdRecords).toHaveLength(0);
  });

  it("persists candidate poll votes and derives available slots from available responses", async () => {
    const repository = new FakeParticipantRepository(buildCandidatePollScheduleRecord());

    await createParticipantAvailabilityRecord(
      "candidate123",
      {
        displayName: "Ada",
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
          },
          {
            candidateTimeOptionId: "option-3",
            response: "unavailable"
          }
        ]
      },
      {
        baseUrl: "https://example.com",
        editKeyFactory: () => "edit-secret",
        repository
      }
    );

    expect(repository.createdRecords[0]!.candidateVotes).toEqual([
      {
        candidateTimeOptionId: "option-1",
        preferenceRank: 1,
        response: "available"
      },
      {
        candidateTimeOptionId: "option-2",
        preferenceRank: 2,
        response: "maybe"
      },
      {
        candidateTimeOptionId: "option-3",
        response: "unavailable"
      }
    ]);
    expect(repository.createdRecords[0]!.availabilitySlots).toHaveLength(1);
    expect(repository.createdRecords[0]!.availabilitySlots[0]!.slotStartUtc.toISOString()).toBe(
      "2026-08-03T08:00:00.000Z"
    );
  });

  it("rejects duplicate candidate preference ranks", async () => {
    const repository = new FakeParticipantRepository(buildCandidatePollScheduleRecord());

    await expect(
      createParticipantAvailabilityRecord(
        "candidate123",
        {
          displayName: "Ada",
          availableSlots: [],
          candidateVotes: [
            {
              candidateTimeOptionId: "option-1",
              preferenceRank: 1,
              response: "available"
            },
            {
              candidateTimeOptionId: "option-2",
              preferenceRank: 1,
              response: "maybe"
            }
          ]
        },
        {
          baseUrl: "https://example.com",
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.createdRecords).toHaveLength(0);
  });

  it("rejects candidate votes that reference another schedule option", async () => {
    const repository = new FakeParticipantRepository(buildCandidatePollScheduleRecord());

    await expect(
      createParticipantAvailabilityRecord(
        "candidate123",
        {
          displayName: "Ada",
          availableSlots: [],
          candidateVotes: [
            {
              candidateTimeOptionId: "missing-option",
              response: "available"
            }
          ]
        },
        {
          baseUrl: "https://example.com",
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "CANDIDATE_OPTION_NOT_FOUND",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.createdRecords).toHaveLength(0);
  });
});

function buildScheduleRecord(
  overrides: Partial<ScheduleWithAvailabilityRecord> = {}
): ScheduleWithAvailabilityRecord {
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
    participants: [],
    availabilitySlots: [],
    ...overrides
  };
}

function buildCandidatePollScheduleRecord(): ScheduleWithAvailabilityRecord {
  return buildScheduleRecord({
    schedule: {
      id: "schedule-1",
      publicId: "candidate123",
      title: "Project sync",
      description: null,
      timezone: "Australia/Sydney",
      dateRangeStart: "2026-08-03",
      dateRangeEnd: "2026-08-05",
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
      },
      {
        id: "option-3",
        label: "Option C",
        slotStartUtc: new Date("2026-08-05T09:00:00.000Z"),
        slotEndUtc: new Date("2026-08-05T10:00:00.000Z")
      }
    ]
  });
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
