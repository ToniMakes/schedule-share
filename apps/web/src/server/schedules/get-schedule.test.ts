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
      status: "open"
    },
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
