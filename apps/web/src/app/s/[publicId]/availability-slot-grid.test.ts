import { describe, expect, it } from "vitest";

import {
  buildAvailabilitySlotMatrix,
  compactDateLabel,
  countSelectedSlots,
  groupSlotsByDate,
  slotKey,
  summarizeSlotGroups,
  weekdayLabel,
  type AvailabilityGridSlot
} from "./availability-slot-grid";

describe("groupSlotsByDate", () => {
  it("keeps slots grouped by local date in first-seen date order", () => {
    const groups = groupSlotsByDate([
      buildSlot({ localStartDate: "2026-09-01", localStartTime: "09:00" }),
      buildSlot({ localStartDate: "2026-09-02", localStartTime: "09:00" }),
      buildSlot({ localStartDate: "2026-09-01", localStartTime: "09:30" })
    ]);

    expect(groups.map((group) => group.date)).toEqual(["2026-09-01", "2026-09-02"]);
    expect(groups[0]?.slots.map((slot) => slot.localStartTime)).toEqual(["09:00", "09:30"]);
  });
});

describe("countSelectedSlots", () => {
  it("counts selected slots within one rendered group", () => {
    const groupSlots = [
      buildSlot({ localStartTime: "09:00" }),
      buildSlot({ localStartTime: "09:30" }),
      buildSlot({ localStartTime: "10:00" })
    ];
    const selectedSlotKeys = new Set([slotKey(groupSlots[0]!), slotKey(groupSlots[2]!)]);

    expect(countSelectedSlots(groupSlots, selectedSlotKeys)).toBe(2);
  });

  it("ignores selected keys outside the rendered group", () => {
    const groupSlots = [buildSlot({ localStartTime: "09:00" })];
    const selectedSlotKeys = new Set([
      slotKey(groupSlots[0]!),
      slotKey(buildSlot({ localStartDate: "2026-09-02", localStartTime: "09:00" }))
    ]);

    expect(countSelectedSlots(groupSlots, selectedSlotKeys)).toBe(1);
  });
});

describe("buildAvailabilitySlotMatrix", () => {
  it("builds date columns and time rows for a when2meet-style grid", () => {
    const mondayNine = buildSlot({
      localStartDate: "2026-09-07",
      localStartTime: "09:00"
    });
    const tuesdayNine = buildSlot({
      localStartDate: "2026-09-08",
      localStartTime: "09:00"
    });
    const mondayTen = buildSlot({
      localStartDate: "2026-09-07",
      localStartTime: "10:00"
    });

    const matrix = buildAvailabilitySlotMatrix([mondayNine, tuesdayNine, mondayTen]);

    expect(matrix.days.map((day) => day.date)).toEqual(["2026-09-07", "2026-09-08"]);
    expect(matrix.rows.map((row) => row.label)).toEqual(["09:00-09:30", "10:00-10:30"]);
    expect(matrix.rows[0]?.slotsByDate.get("2026-09-07")).toBe(mondayNine);
    expect(matrix.rows[0]?.slotsByDate.get("2026-09-08")).toBe(tuesdayNine);
    expect(matrix.rows[1]?.slotsByDate.get("2026-09-07")).toBe(mondayTen);
    expect(matrix.rows[1]?.slotsByDate.has("2026-09-08")).toBe(false);
  });
});

describe("summarizeSlotGroups", () => {
  it("summarizes total selected slots and active days", () => {
    const firstDaySlots = [
      buildSlot({ localStartDate: "2026-09-01", localStartTime: "09:00" }),
      buildSlot({ localStartDate: "2026-09-01", localStartTime: "09:30" })
    ];
    const secondDaySlots = [buildSlot({ localStartDate: "2026-09-02", localStartTime: "09:00" })];
    const selectedSlotKeys = new Set([slotKey(firstDaySlots[0]!), slotKey(secondDaySlots[0]!)]);

    expect(
      summarizeSlotGroups(
        [
          { date: "2026-09-01", slots: firstDaySlots },
          { date: "2026-09-02", slots: secondDaySlots }
        ],
        selectedSlotKeys
      )
    ).toEqual({
      activeDayCount: 2,
      dayCount: 2,
      selectedSlotCount: 2,
      totalSlotCount: 3
    });
  });

  it("does not count a day as active when no rendered slot is selected", () => {
    const firstDaySlots = [buildSlot({ localStartDate: "2026-09-01", localStartTime: "09:00" })];
    const secondDaySlots = [buildSlot({ localStartDate: "2026-09-02", localStartTime: "09:00" })];
    const selectedSlotKeys = new Set([slotKey(secondDaySlots[0]!)]);

    expect(
      summarizeSlotGroups(
        [
          { date: "2026-09-01", slots: firstDaySlots },
          { date: "2026-09-02", slots: secondDaySlots }
        ],
        selectedSlotKeys
      ).activeDayCount
    ).toBe(1);
  });
});

describe("compactDateLabel", () => {
  it("formats ISO local dates as short month and day labels", () => {
    expect(compactDateLabel("2026-09-05")).toBe("9/5");
  });

  it("keeps non-ISO labels unchanged", () => {
    expect(compactDateLabel("next Monday")).toBe("next Monday");
  });
});

describe("weekdayLabel", () => {
  it("formats ISO local dates as Chinese weekday labels", () => {
    expect(weekdayLabel("2026-09-07")).toBe("一");
  });

  it("keeps non-ISO labels quiet", () => {
    expect(weekdayLabel("next Monday")).toBe("");
  });
});

function buildSlot(overrides: Partial<AvailabilityGridSlot> = {}): AvailabilityGridSlot {
  const localStartDate = overrides.localStartDate ?? "2026-09-01";
  const localStartTime = overrides.localStartTime ?? "09:00";
  const localEndTime = overrides.localEndTime ?? incrementTime(localStartTime);

  return {
    startUtc: overrides.startUtc ?? `${localStartDate}T${localStartTime}:00.000Z`,
    endUtc: overrides.endUtc ?? `${localStartDate}T${localEndTime}:00.000Z`,
    timezone: overrides.timezone ?? "Australia/Sydney",
    localStartDate,
    localEndDate: overrides.localEndDate ?? localStartDate,
    localStartTime,
    localEndTime,
    ...(overrides.availableParticipantCount === undefined
      ? {}
      : { availableParticipantCount: overrides.availableParticipantCount })
  };
}

function incrementTime(value: string): string {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + 30;
  const nextHour = Math.floor(totalMinutes / 60);
  const nextMinute = totalMinutes % 60;

  return `${nextHour.toString().padStart(2, "0")}:${nextMinute.toString().padStart(2, "0")}`;
}
