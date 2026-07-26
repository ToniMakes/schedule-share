import { describe, expect, it } from "vitest";

import { CoreError, generateTimeSlots } from "../src";
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
