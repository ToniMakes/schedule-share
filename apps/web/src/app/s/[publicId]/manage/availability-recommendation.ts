import type { GetScheduleResponse, TimeSlotAvailabilityDto } from "@schedule-share/api-client";

export type AvailabilityRecommendationKind = "all_available" | "peak_available";

export type AvailabilityRecommendation =
  | { readonly status: "waiting" }
  | { readonly status: "empty"; readonly totalParticipantCount: number }
  | {
      readonly alternates: readonly AvailabilityRecommendationItem[];
      readonly peakAvailableCount: number;
      readonly primary: AvailabilityRecommendationItem;
      readonly status: "ready";
      readonly totalParticipantCount: number;
    };

export interface AvailabilityRecommendationItem {
  readonly availableParticipantCount: number;
  readonly availableParticipantIds: readonly string[];
  readonly availablePercent: number;
  readonly endUtc: string;
  readonly kind: AvailabilityRecommendationKind;
  readonly localEndDate: string;
  readonly localEndTime: string;
  readonly localStartDate: string;
  readonly localStartTime: string;
  readonly slotCount: number;
  readonly startUtc: string;
  readonly timezone: string;
}

export function buildAvailabilityRecommendation(
  data: GetScheduleResponse
): AvailabilityRecommendation {
  const totalParticipantCount = data.results.totalParticipantCount;

  if (totalParticipantCount === 0) {
    return { status: "waiting" };
  }

  const allAvailableItems = data.results.everyoneAvailableBlocks
    .map((block) => ({
      ...block,
      availablePercent: 100,
      kind: "all_available" as const
    }))
    .sort(compareRecommendationItems);

  if (allAvailableItems.length > 0) {
    const primary = allAvailableItems[0];

    if (primary === undefined) {
      return { status: "empty", totalParticipantCount };
    }

    return {
      status: "ready",
      totalParticipantCount,
      peakAvailableCount: totalParticipantCount,
      primary,
      alternates: allAvailableItems.slice(1, 5)
    };
  }

  const peakAvailableCount = Math.max(
    0,
    ...data.results.slotResults.map((slot) => slot.availableParticipantCount)
  );

  if (peakAvailableCount === 0) {
    return { status: "empty", totalParticipantCount };
  }

  const peakItems = mergePeakSlots(
    data.results.slotResults.filter(
      (slot) => slot.availableParticipantCount === peakAvailableCount
    ),
    totalParticipantCount
  ).sort(compareRecommendationItems);
  const [primary, ...alternates] = peakItems;

  if (primary === undefined) {
    return { status: "empty", totalParticipantCount };
  }

  return {
    status: "ready",
    totalParticipantCount,
    peakAvailableCount,
    primary,
    alternates: alternates.slice(0, 4)
  };
}

function mergePeakSlots(
  slots: readonly TimeSlotAvailabilityDto[],
  totalParticipantCount: number
): AvailabilityRecommendationItem[] {
  const sortedSlots = [...slots].sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  const items: AvailabilityRecommendationItem[] = [];

  for (const slot of sortedSlots) {
    const previous = items.at(-1);

    if (previous !== undefined && canMerge(previous, slot)) {
      items[items.length - 1] = {
        ...previous,
        endUtc: slot.endUtc,
        localEndDate: slot.localEndDate,
        localEndTime: slot.localEndTime,
        slotCount: previous.slotCount + 1
      };
      continue;
    }

    items.push({
      startUtc: slot.startUtc,
      endUtc: slot.endUtc,
      timezone: slot.timezone,
      localStartDate: slot.localStartDate,
      localEndDate: slot.localEndDate,
      localStartTime: slot.localStartTime,
      localEndTime: slot.localEndTime,
      slotCount: 1,
      availableParticipantCount: slot.availableParticipantCount,
      availableParticipantIds: slot.availableParticipantIds,
      availablePercent: availablePercent(slot.availableParticipantCount, totalParticipantCount),
      kind: "peak_available"
    });
  }

  return items;
}

function compareRecommendationItems(
  first: AvailabilityRecommendationItem,
  second: AvailabilityRecommendationItem
): number {
  const availableDifference = second.availableParticipantCount - first.availableParticipantCount;

  if (availableDifference !== 0) {
    return availableDifference;
  }

  const durationDifference = second.slotCount - first.slotCount;

  if (durationDifference !== 0) {
    return durationDifference;
  }

  return first.startUtc.localeCompare(second.startUtc);
}

function canMerge(item: AvailabilityRecommendationItem, slot: TimeSlotAvailabilityDto): boolean {
  return (
    item.endUtc === slot.startUtc &&
    item.availableParticipantCount === slot.availableParticipantCount &&
    sameParticipantIds(item.availableParticipantIds, slot.availableParticipantIds)
  );
}

function sameParticipantIds(first: readonly string[], second: readonly string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const secondIds = new Set(second);

  return first.every((id) => secondIds.has(id));
}

function availablePercent(
  availableParticipantCount: number,
  totalParticipantCount: number
): number {
  if (totalParticipantCount <= 0) {
    return 0;
  }

  return Math.round((availableParticipantCount / totalParticipantCount) * 100);
}
