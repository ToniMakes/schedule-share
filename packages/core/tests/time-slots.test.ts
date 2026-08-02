import { describe, expect, it } from "vitest";

import {
  CoreError,
  createCandidateTimeSlots,
  createCandidateTimeWindowFromLocal,
  createTimeSlotFromUtcRange,
  generateTimeSlots
} from "../src";
import type { SlotMinutes, TimeSlotConfig } from "../src";

describe("generateTimeSlots", () => {
  it("generates slots for matching days of week in the schedule timezone", () => {
    const slots = generateTimeSlots({
      timezone: "Australia/Sydney",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-02"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          daysOfWeek: [6],
          startTime: "09:00",
          endTime: "10:00"
        }
      ]
    });

    expect(slots).toHaveLength(2);
    expect(
      slots.map((slot) => `${slot.localStartDate} ${slot.localStartTime}-${slot.localEndTime}`)
    ).toEqual(["2026-08-01 09:00-09:30", "2026-08-01 09:30-10:00"]);
    expect(slots.every((slot) => slot.timezone === "Australia/Sydney")).toBe(true);
    expect(slots.every((slot) => slot.startUtc.endsWith("Z"))).toBe(true);
  });

  it("supports windows that cross midnight", () => {
    const slots = generateTimeSlots({
      timezone: "Australia/Sydney",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 60,
      dailyWindows: [
        {
          startTime: "23:00",
          endTime: "01:00"
        }
      ]
    });

    expect(slots).toHaveLength(2);
    expect(slots.map((slot) => `${slot.localStartDate} ${slot.localStartTime}`)).toEqual([
      "2026-08-01 23:00",
      "2026-08-02 00:00"
    ]);
    expect(slots.at(-1)).toMatchObject({
      localEndDate: "2026-08-02",
      localEndTime: "01:00"
    });
  });

  it("generates along the real timeline across a daylight saving spring-forward boundary", () => {
    const slots = generateTimeSlots({
      timezone: "Australia/Sydney",
      dateRange: {
        start: "2026-10-04",
        end: "2026-10-04"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "01:00",
          endTime: "04:00"
        }
      ]
    });

    expect(slots).toHaveLength(4);
    expect(
      slots.map(
        (slot) =>
          `${slot.localStartTime}-${slot.localEndTime} (${slot.localStartDate}->${slot.localEndDate})`
      )
    ).toEqual([
      "01:00-01:30 (2026-10-04->2026-10-04)",
      "01:30-03:00 (2026-10-04->2026-10-04)",
      "03:00-03:30 (2026-10-04->2026-10-04)",
      "03:30-04:00 (2026-10-04->2026-10-04)"
    ]);
  });

  it("deduplicates overlapping daily windows", () => {
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
        },
        {
          startTime: "09:30",
          endTime: "10:30"
        }
      ]
    });

    expect(slots.map((slot) => `${slot.localStartTime}-${slot.localEndTime}`)).toEqual([
      "09:00-09:30",
      "09:30-10:00",
      "10:00-10:30"
    ]);
  });

  it("rejects unsupported slot sizes", () => {
    const config: TimeSlotConfig = {
      timezone: "Asia/Shanghai",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-01"
      },
      slotMinutes: 20 as SlotMinutes,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:00"
        }
      ]
    };

    expect(() => generateTimeSlots(config)).toThrow(CoreError);

    try {
      generateTimeSlots(config);
    } catch (error) {
      expect(error).toBeInstanceOf(CoreError);
      expect((error as CoreError).code).toBe("UNSUPPORTED_SLOT_MINUTES");
    }
  });
});

describe("createCandidateTimeSlots", () => {
  it("normalizes explicit candidate UTC windows into schedule timezone slots", () => {
    const slots = createCandidateTimeSlots({
      timezone: "Australia/Sydney",
      candidateWindows: [
        {
          id: "option-2",
          label: "Later",
          startUtc: "2026-08-04T09:00:00.000Z",
          endUtc: "2026-08-04T10:30:00.000Z"
        },
        {
          id: "option-1",
          label: "  Dinner  ",
          startUtc: "2026-08-03T08:00:00.000Z",
          endUtc: "2026-08-03T09:00:00.000Z"
        }
      ]
    });

    expect(
      slots.map((slot) => ({
        id: slot.candidateTimeOptionId,
        label: slot.label,
        local: `${slot.localStartDate} ${slot.localStartTime}-${slot.localEndTime}`
      }))
    ).toEqual([
      {
        id: "option-1",
        label: "Dinner",
        local: "2026-08-03 18:00-19:00"
      },
      {
        id: "option-2",
        label: "Later",
        local: "2026-08-04 19:00-20:30"
      }
    ]);
  });

  it("rejects empty and duplicate candidate windows", () => {
    expect(() =>
      createCandidateTimeSlots({
        timezone: "Australia/Sydney",
        candidateWindows: []
      })
    ).toThrow(CoreError);

    expect(() =>
      createCandidateTimeSlots({
        timezone: "Australia/Sydney",
        candidateWindows: [
          {
            startUtc: "2026-08-03T08:00:00.000Z",
            endUtc: "2026-08-03T09:00:00.000Z"
          },
          {
            startUtc: "2026-08-03T08:00:00.000Z",
            endUtc: "2026-08-03T09:00:00.000Z"
          }
        ]
      })
    ).toThrow(CoreError);
  });

  it("rejects candidate windows without a timezone offset", () => {
    expect(() =>
      createCandidateTimeSlots({
        timezone: "Australia/Sydney",
        candidateWindows: [
          {
            startUtc: "2026-08-03T08:00:00.000",
            endUtc: "2026-08-03T09:00:00.000Z"
          }
        ]
      })
    ).toThrow(CoreError);
  });
});

describe("createCandidateTimeWindowFromLocal", () => {
  it("converts local candidate windows to normalized UTC ranges", () => {
    expect(
      createCandidateTimeWindowFromLocal({
        label: "  Dinner  ",
        localDate: "2026-08-03",
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney"
      })
    ).toEqual({
      label: "Dinner",
      startUtc: "2026-08-03T08:00:00.000Z",
      endUtc: "2026-08-03T09:00:00.000Z"
    });
  });

  it("supports local candidate windows that cross midnight", () => {
    expect(
      createCandidateTimeWindowFromLocal({
        localDate: "2026-08-03",
        startTime: "23:00",
        endTime: "01:00",
        timezone: "Australia/Sydney"
      })
    ).toEqual({
      startUtc: "2026-08-03T13:00:00.000Z",
      endUtc: "2026-08-03T15:00:00.000Z"
    });
  });
});

describe("createTimeSlotFromUtcRange", () => {
  it("projects a UTC range into the requested display timezone", () => {
    expect(
      createTimeSlotFromUtcRange({
        timezone: "Australia/Sydney",
        startUtc: "2026-07-31T23:00:00.000Z",
        endUtc: "2026-08-01T00:00:00.000Z"
      })
    ).toMatchObject({
      startUtc: "2026-07-31T23:00:00.000Z",
      endUtc: "2026-08-01T00:00:00.000Z",
      timezone: "Australia/Sydney",
      localStartDate: "2026-08-01",
      localEndDate: "2026-08-01",
      localStartTime: "09:00",
      localEndTime: "10:00"
    });
  });

  it("rejects invalid UTC ranges", () => {
    expect(() =>
      createTimeSlotFromUtcRange({
        timezone: "Australia/Sydney",
        startUtc: "2026-08-01T00:00:00.000Z",
        endUtc: "2026-07-31T23:00:00.000Z"
      })
    ).toThrow(CoreError);
  });
});
