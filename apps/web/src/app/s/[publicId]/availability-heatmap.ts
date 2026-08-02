import type { TimeSlotAvailabilityDto } from "@schedule-share/api-client";

export interface AvailabilityHeatmapDay {
  readonly date: string;
  readonly slots: readonly AvailabilityHeatmapSlot[];
}

export interface AvailabilityHeatmapSlot {
  readonly availablePercent: number;
  readonly heatLevel: 0 | 1 | 2 | 3 | 4;
  readonly isPeak: boolean;
  readonly slot: TimeSlotAvailabilityDto;
}

export type AvailabilityHeatmapDensity = "all" | "available" | "peak";

export function buildAvailabilityHeatmap(input: {
  readonly slots: readonly TimeSlotAvailabilityDto[];
  readonly totalParticipantCount: number;
}): AvailabilityHeatmapDay[] {
  const peakAvailableCount = Math.max(
    0,
    ...input.slots.map((slot) => slot.availableParticipantCount)
  );
  const groupedSlots = new Map<string, TimeSlotAvailabilityDto[]>();

  for (const slot of input.slots) {
    groupedSlots.set(slot.localStartDate, [...(groupedSlots.get(slot.localStartDate) ?? []), slot]);
  }

  return Array.from(groupedSlots, ([date, slots]) => ({
    date,
    slots: slots.map((slot) => ({
      slot,
      availablePercent: availablePercent(slot, input.totalParticipantCount),
      heatLevel: heatLevel(slot, input.totalParticipantCount),
      isPeak: peakAvailableCount > 0 && slot.availableParticipantCount === peakAvailableCount
    }))
  }));
}

export function filterAvailabilityHeatmapSlots(
  slots: readonly AvailabilityHeatmapSlot[],
  density: AvailabilityHeatmapDensity
): AvailabilityHeatmapSlot[] {
  if (density === "available") {
    return slots.filter((slot) => slot.slot.availableParticipantCount > 0);
  }

  if (density === "peak") {
    return slots.filter((slot) => slot.isPeak);
  }

  return [...slots];
}

function availablePercent(slot: TimeSlotAvailabilityDto, totalParticipantCount: number): number {
  if (totalParticipantCount <= 0) {
    return 0;
  }

  return Math.round((slot.availableParticipantCount / totalParticipantCount) * 100);
}

function heatLevel(
  slot: TimeSlotAvailabilityDto,
  totalParticipantCount: number
): 0 | 1 | 2 | 3 | 4 {
  if (totalParticipantCount <= 0 || slot.availableParticipantCount <= 0) {
    return 0;
  }

  const ratio = slot.availableParticipantCount / totalParticipantCount;

  if (ratio >= 1) {
    return 4;
  }

  if (ratio >= 0.66) {
    return 3;
  }

  if (ratio >= 0.33) {
    return 2;
  }

  return 1;
}
