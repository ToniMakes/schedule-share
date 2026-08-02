import { describe, expect, it } from "vitest";

import type { TimeSlotAvailabilityDto } from "@schedule-share/api-client";

import { buildAvailabilityHeatmap, filterAvailabilityHeatmapSlots } from "./availability-heatmap";

describe("buildAvailabilityHeatmap", () => {
  it("groups slots by local date and marks heat levels", () => {
    const heatmap = buildAvailabilityHeatmap({
      totalParticipantCount: 3,
      slots: [
        buildSlot("2026-08-01", "09:00", 0),
        buildSlot("2026-08-01", "09:30", 1),
        buildSlot("2026-08-01", "10:00", 2),
        buildSlot("2026-08-02", "09:00", 3)
      ]
    });

    expect(heatmap).toHaveLength(2);
    expect(heatmap[0]).toMatchObject({
      date: "2026-08-01",
      slots: [
        {
          availablePercent: 0,
          heatLevel: 0,
          isPeak: false
        },
        {
          availablePercent: 33,
          heatLevel: 2,
          isPeak: false
        },
        {
          availablePercent: 67,
          heatLevel: 3,
          isPeak: false
        }
      ]
    });
    expect(heatmap[1]).toMatchObject({
      date: "2026-08-02",
      slots: [
        {
          availablePercent: 100,
          heatLevel: 4,
          isPeak: true
        }
      ]
    });
  });

  it("keeps heat empty when nobody has submitted", () => {
    const heatmap = buildAvailabilityHeatmap({
      totalParticipantCount: 0,
      slots: [buildSlot("2026-08-01", "09:00", 0)]
    });

    expect(heatmap[0]?.slots[0]).toMatchObject({
      availablePercent: 0,
      heatLevel: 0,
      isPeak: false
    });
  });

  it("filters slots with at least one available participant", () => {
    const [day] = buildAvailabilityHeatmap({
      totalParticipantCount: 3,
      slots: [
        buildSlot("2026-08-01", "09:00", 0),
        buildSlot("2026-08-01", "09:30", 1),
        buildSlot("2026-08-01", "10:00", 2)
      ]
    });

    expect(
      filterAvailabilityHeatmapSlots(day?.slots ?? [], "available").map(
        (slot) => slot.slot.localStartTime
      )
    ).toEqual(["09:30", "10:00"]);
  });

  it("filters peak slots without treating empty slots as peaks", () => {
    const [activeDay] = buildAvailabilityHeatmap({
      totalParticipantCount: 3,
      slots: [
        buildSlot("2026-08-01", "09:00", 1),
        buildSlot("2026-08-01", "09:30", 2),
        buildSlot("2026-08-01", "10:00", 2)
      ]
    });
    const [emptyDay] = buildAvailabilityHeatmap({
      totalParticipantCount: 0,
      slots: [buildSlot("2026-08-02", "09:00", 0)]
    });

    expect(
      filterAvailabilityHeatmapSlots(activeDay?.slots ?? [], "peak").map(
        (slot) => slot.slot.localStartTime
      )
    ).toEqual(["09:30", "10:00"]);
    expect(filterAvailabilityHeatmapSlots(emptyDay?.slots ?? [], "peak")).toEqual([]);
  });
});

function buildSlot(
  localStartDate: string,
  localStartTime: string,
  availableParticipantCount: number
): TimeSlotAvailabilityDto {
  const [hour, minute] = localStartTime.split(":").map(Number);
  const nextMinute = (minute ?? 0) + 30;
  const localEndTime =
    nextMinute >= 60
      ? `${(hour ?? 0) + 1}`.padStart(2, "0") + ":00"
      : `${hour}`.padStart(2, "0") + `:${nextMinute.toString().padStart(2, "0")}`;

  return {
    startUtc: `${localStartDate}T${localStartTime}:00.000Z`,
    endUtc: `${localStartDate}T${localEndTime}:00.000Z`,
    timezone: "Australia/Sydney",
    localStartDate,
    localEndDate: localStartDate,
    localStartTime,
    localEndTime,
    availableParticipantCount,
    availableParticipantIds: Array.from(
      { length: availableParticipantCount },
      (_, index) => `participant-${index + 1}`
    ),
    isEveryoneAvailable: false
  };
}
