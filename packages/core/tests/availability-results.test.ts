import { describe, expect, it } from "vitest";

import { calculateAvailabilitySummary, CoreError, generateTimeSlots } from "../src";

describe("calculateAvailabilitySummary", () => {
  it("calculates everyone-available slots and ranks candidate slots", () => {
    const slots = generateTimeSlots({
      timezone: "Australia/Sydney",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:30"
        }
      ]
    });

    const summary = calculateAvailabilitySummary(slots, [
      {
        participantId: "aki",
        availableSlots: [slots[0]!, slots[1]!]
      },
      {
        participantId: "bo",
        availableSlots: [slots[1]!, slots[2]!]
      },
      {
        participantId: "chen",
        availableSlots: [slots[1]!]
      }
    ]);

    expect(summary.totalParticipantCount).toBe(3);
    expect(summary.everyoneAvailableSlots).toHaveLength(1);
    expect(summary.everyoneAvailableSlots[0]).toMatchObject({
      localStartTime: "09:30",
      localEndTime: "10:00",
      availableParticipantCount: 3,
      availableParticipantIds: ["aki", "bo", "chen"],
      isEveryoneAvailable: true
    });
    expect(
      summary.rankedSlots.map((slot) => `${slot.localStartTime}:${slot.availableParticipantCount}`)
    ).toEqual(["09:30:3", "09:00:1", "10:00:1"]);
  });

  it("does not mark every slot as available when there are no participants", () => {
    const slots = generateTimeSlots({
      timezone: "Asia/Shanghai",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:00"
        }
      ]
    });

    const summary = calculateAvailabilitySummary(slots, []);

    expect(summary.everyoneAvailableSlots).toHaveLength(0);
    expect(summary.everyoneAvailableBlocks).toHaveLength(0);
    expect(summary.rankedSlots).toHaveLength(0);
    expect(summary.slotResults.every((slot) => !slot.isEveryoneAvailable)).toBe(true);
  });

  it("merges adjacent slots when the available participant set is unchanged", () => {
    const slots = generateTimeSlots({
      timezone: "Australia/Sydney",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "11:00"
        }
      ]
    });

    const summary = calculateAvailabilitySummary(slots, [
      {
        participantId: "aki",
        availableSlots: [slots[0]!, slots[1]!, slots[2]!]
      },
      {
        participantId: "bo",
        availableSlots: [slots[0]!, slots[1]!]
      }
    ]);

    expect(summary.everyoneAvailableBlocks).toEqual([
      {
        startUtc: slots[0]!.startUtc,
        endUtc: slots[1]!.endUtc,
        timezone: "Australia/Sydney",
        localStartDate: "2026-08-01",
        localEndDate: "2026-08-01",
        localStartTime: "09:00",
        localEndTime: "10:00",
        slotCount: 2,
        availableParticipantCount: 2,
        availableParticipantIds: ["aki", "bo"]
      }
    ]);
  });

  it("rejects availability outside the generated schedule slots", () => {
    const slots = generateTimeSlots({
      timezone: "Asia/Shanghai",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:00"
        }
      ]
    });

    expect(() =>
      calculateAvailabilitySummary(slots, [
        {
          participantId: "aki",
          availableSlots: [
            {
              startUtc: "2026-08-01T03:00:00.000Z",
              endUtc: "2026-08-01T03:30:00.000Z"
            }
          ]
        }
      ])
    ).toThrow(CoreError);

    try {
      calculateAvailabilitySummary(slots, [
        {
          participantId: "aki",
          availableSlots: [
            {
              startUtc: "2026-08-01T03:00:00.000Z",
              endUtc: "2026-08-01T03:30:00.000Z"
            }
          ]
        }
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(CoreError);
      expect((error as CoreError).code).toBe("SLOT_OUT_OF_RANGE");
    }
  });

  it("rejects timestamps without an explicit timezone offset", () => {
    const slots = generateTimeSlots({
      timezone: "Asia/Shanghai",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:00"
        }
      ]
    });

    expect(() =>
      calculateAvailabilitySummary(slots, [
        {
          participantId: "aki",
          availableSlots: [
            {
              startUtc: "2026-08-01T01:00:00.000",
              endUtc: "2026-08-01T01:30:00.000"
            }
          ]
        }
      ])
    ).toThrow(CoreError);
  });
});
