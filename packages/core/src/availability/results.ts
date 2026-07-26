import { fail } from "../errors";
import type {
  AvailabilityBlock,
  AvailabilitySummary,
  ParticipantAvailability,
  TimeSlot,
  TimeSlotAvailability
} from "../domain/types";
import { normalizeUtcIso, slotKey } from "../time/slots";

export function calculateAvailabilitySummary(
  slots: readonly TimeSlot[],
  participants: readonly ParticipantAvailability[]
): AvailabilitySummary {
  const participantOrder = buildParticipantOrder(participants);
  const slotsByKey = buildSlotMap(slots);
  const availableParticipantIdsBySlot = new Map<string, Set<string>>();

  for (const participant of participants) {
    const seenSlotsForParticipant = new Set<string>();

    for (const availableSlot of participant.availableSlots) {
      const key = slotKey(availableSlot.startUtc, availableSlot.endUtc);

      if (!slotsByKey.has(key)) {
        fail(
          "SLOT_OUT_OF_RANGE",
          "Participant availability contains a slot outside this schedule."
        );
      }

      if (seenSlotsForParticipant.has(key)) {
        fail("DUPLICATE_SLOT", "Participant availability contains the same slot more than once.");
      }

      seenSlotsForParticipant.add(key);

      const participantIds = availableParticipantIdsBySlot.get(key) ?? new Set<string>();
      participantIds.add(participant.participantId);
      availableParticipantIdsBySlot.set(key, participantIds);
    }
  }

  const totalParticipantCount = participants.length;
  const slotResults = slots.map((slot) => {
    const participantIds = Array.from(
      availableParticipantIdsBySlot.get(slotKey(slot.startUtc, slot.endUtc)) ?? []
    ).sort((a, b) => participantOrder.get(a)! - participantOrder.get(b)!);

    return {
      ...slot,
      availableParticipantCount: participantIds.length,
      availableParticipantIds: participantIds,
      isEveryoneAvailable:
        totalParticipantCount > 0 && participantIds.length === totalParticipantCount
    };
  });

  const everyoneAvailableSlots = slotResults.filter((slot) => slot.isEveryoneAvailable);

  return {
    totalParticipantCount,
    slotResults,
    everyoneAvailableSlots,
    everyoneAvailableBlocks: mergeAvailabilityBlocks(everyoneAvailableSlots),
    rankedSlots: [...slotResults]
      .filter((slot) => slot.availableParticipantCount > 0)
      .sort((a, b) => {
        const countDifference = b.availableParticipantCount - a.availableParticipantCount;
        return countDifference === 0
          ? normalizeUtcIso(a.startUtc).localeCompare(normalizeUtcIso(b.startUtc))
          : countDifference;
      })
  };
}

export function mergeAvailabilityBlocks(
  slots: readonly TimeSlotAvailability[]
): AvailabilityBlock[] {
  const sortedSlots = [...slots].sort((a, b) =>
    normalizeUtcIso(a.startUtc).localeCompare(normalizeUtcIso(b.startUtc))
  );
  const blocks: AvailabilityBlock[] = [];

  for (const slot of sortedSlots) {
    const previous = blocks.at(-1);

    if (previous !== undefined && canMerge(previous, slot)) {
      blocks[blocks.length - 1] = {
        ...previous,
        endUtc: slot.endUtc,
        localEndDate: slot.localEndDate,
        localEndTime: slot.localEndTime,
        slotCount: previous.slotCount + 1
      };
      continue;
    }

    blocks.push({
      startUtc: slot.startUtc,
      endUtc: slot.endUtc,
      timezone: slot.timezone,
      localStartDate: slot.localStartDate,
      localEndDate: slot.localEndDate,
      localStartTime: slot.localStartTime,
      localEndTime: slot.localEndTime,
      slotCount: 1,
      availableParticipantCount: slot.availableParticipantCount,
      availableParticipantIds: slot.availableParticipantIds
    });
  }

  return blocks;
}

function buildParticipantOrder(
  participants: readonly ParticipantAvailability[]
): ReadonlyMap<string, number> {
  const participantOrder = new Map<string, number>();

  for (const [index, participant] of participants.entries()) {
    if (participant.participantId.length === 0) {
      fail("DUPLICATE_PARTICIPANT", "Participant id cannot be empty.");
    }

    if (participantOrder.has(participant.participantId)) {
      fail("DUPLICATE_PARTICIPANT", "Participant ids must be unique.");
    }

    participantOrder.set(participant.participantId, index);
  }

  return participantOrder;
}

function buildSlotMap(slots: readonly TimeSlot[]): ReadonlyMap<string, TimeSlot> {
  const slotsByKey = new Map<string, TimeSlot>();

  for (const slot of slots) {
    const key = slotKey(slot.startUtc, slot.endUtc);

    if (slotsByKey.has(key)) {
      fail("DUPLICATE_SLOT", "Schedule contains duplicate slots.");
    }

    slotsByKey.set(key, slot);
  }

  return slotsByKey;
}

function canMerge(block: AvailabilityBlock, slot: TimeSlotAvailability): boolean {
  return (
    normalizeUtcIso(block.endUtc) === normalizeUtcIso(slot.startUtc) &&
    block.timezone === slot.timezone &&
    block.availableParticipantCount === slot.availableParticipantCount &&
    sameParticipantIds(block.availableParticipantIds, slot.availableParticipantIds)
  );
}

function sameParticipantIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
