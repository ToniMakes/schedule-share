import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { getScheduleView } from "./get-schedule";
import type { ReadScheduleRepository, ScheduleWithAvailabilityRecord } from "./repository";

class FakeReadScheduleRepository implements ReadScheduleRepository {
  readonly publicIds: string[] = [];

  constructor(private readonly record?: ScheduleWithAvailabilityRecord) {}

  async getScheduleByPublicId(
    publicId: string
  ): Promise<ScheduleWithAvailabilityRecord | undefined> {
    this.publicIds.push(publicId);
    return this.record;
  }
}

describe("getScheduleView", () => {
  it("returns generated slots when no participant has submitted availability", async () => {
    const repository = new FakeReadScheduleRepository(buildScheduleRecord());

    const result = await getScheduleView("abc123", { repository });

    expect(repository.publicIds).toEqual(["abc123"]);
    expect(result.schedule).toMatchObject({
      publicId: "abc123",
      title: "Team dinner",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 30
    });
    expect(result.results.totalParticipantCount).toBe(0);
    expect(result.results.slotResults).toHaveLength(2);
    expect(result.results.everyoneAvailableBlocks).toHaveLength(0);
  });

  it("calculates everyone-available blocks from participant availability", async () => {
    const repository = new FakeReadScheduleRepository(
      buildScheduleRecord({
        participants: [
          {
            id: "participant-1",
            displayName: "Ada"
          },
          {
            id: "participant-2",
            displayName: "Grace"
          }
        ],
        availabilitySlots: [
          buildAvailabilitySlot("participant-1"),
          buildAvailabilitySlot("participant-2")
        ]
      })
    );

    const result = await getScheduleView("abc123", { repository });

    expect(result.participants.map((participant) => participant.displayName)).toEqual([
      "Ada",
      "Grace"
    ]);
    expect(result.results.totalParticipantCount).toBe(2);
    expect(result.results.everyoneAvailableBlocks).toEqual([
      expect.objectContaining({
        localStartTime: "09:00",
        localEndTime: "09:30",
        slotCount: 1,
        availableParticipantCount: 2,
        availableParticipantIds: ["participant-1", "participant-2"]
      })
    ]);
  });

  it("returns a stored final time in the schedule timezone", async () => {
    const repository = new FakeReadScheduleRepository(
      buildScheduleRecord({
        schedule: {
          ...buildScheduleRecord().schedule,
          status: "locked",
          finalStartUtc: new Date("2026-07-31T23:00:00.000Z"),
          finalEndUtc: new Date("2026-07-31T23:30:00.000Z")
        }
      })
    );

    const result = await getScheduleView("abc123", { repository });

    expect(result.schedule.finalTime).toMatchObject({
      startUtc: "2026-07-31T23:00:00.000Z",
      endUtc: "2026-07-31T23:30:00.000Z",
      localStartDate: "2026-08-01",
      localStartTime: "09:00",
      localEndTime: "09:30"
    });
  });

  it("calculates candidate poll slots from stored candidate options", async () => {
    const repository = new FakeReadScheduleRepository(
      buildScheduleRecord({
        schedule: {
          id: "schedule-1",
          publicId: "abc123",
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
            label: "Dinner",
            slotStartUtc: new Date("2026-08-03T08:00:00.000Z"),
            slotEndUtc: new Date("2026-08-03T09:00:00.000Z")
          },
          {
            id: "option-2",
            label: null,
            slotStartUtc: new Date("2026-08-04T09:00:00.000Z"),
            slotEndUtc: new Date("2026-08-04T10:00:00.000Z")
          }
        ],
        participants: [
          {
            id: "participant-1",
            displayName: "Ada"
          },
          {
            id: "participant-2",
            displayName: "Grace"
          }
        ],
        availabilitySlots: [],
        candidateVotes: [
          {
            participantId: "participant-1",
            candidateTimeOptionId: "option-1",
            preferenceRank: 1,
            response: "available"
          },
          {
            participantId: "participant-2",
            candidateTimeOptionId: "option-1",
            preferenceRank: 2,
            response: "maybe"
          },
          {
            participantId: "participant-2",
            candidateTimeOptionId: "option-2",
            preferenceRank: 1,
            response: "available"
          }
        ]
      })
    );

    const result = await getScheduleView("abc123", { repository });

    expect(result.schedule).toMatchObject({
      scheduleMode: "candidate_poll",
      candidateWindows: [
        expect.objectContaining({
          candidateTimeOptionId: "option-1",
          label: "Dinner",
          localStartTime: "18:00"
        }),
        expect.objectContaining({
          candidateTimeOptionId: "option-2",
          localStartTime: "19:00"
        })
      ]
    });
    expect(result.results.slotResults).toEqual([
      expect.objectContaining({
        label: "Dinner",
        availableParticipantCount: 1,
        firstPreferenceParticipantCount: 1,
        firstPreferenceParticipantIds: ["participant-1"],
        maybeParticipantCount: 1,
        maybeParticipantIds: ["participant-2"],
        preferenceRankCount: 2,
        preferenceRankSum: 3
      }),
      expect.objectContaining({
        availableParticipantCount: 1,
        firstPreferenceParticipantCount: 1,
        firstPreferenceParticipantIds: ["participant-2"],
        maybeParticipantCount: 0,
        preferenceRankCount: 1,
        preferenceRankSum: 1
      })
    ]);
  });

  it("throws a not-found HttpError when the schedule is missing", async () => {
    const repository = new FakeReadScheduleRepository();

    await expect(getScheduleView("missing", { repository })).rejects.toMatchObject({
      code: "SCHEDULE_NOT_FOUND",
      status: 404
    } satisfies Partial<HttpError>);
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

function buildAvailabilitySlot(participantId: string) {
  return {
    participantId,
    slotStartUtc: new Date("2026-07-31T23:00:00.000Z"),
    slotEndUtc: new Date("2026-07-31T23:30:00.000Z")
  };
}
