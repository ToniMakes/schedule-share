import type {
  AvailabilityBlockDto,
  AvailabilityResults,
  GetScheduleResponse,
  TimeSlotAvailabilityDto
} from "@schedule-share/api-client";
import {
  calculateAvailabilitySummary,
  CoreError,
  type AvailabilityBlock,
  type TimeSlotAvailability
} from "@schedule-share/core";

import { HttpError } from "../errors";
import { assertSchedulePublicId } from "./path-validation";
import type {
  AvailabilitySlotRecord,
  CandidateVoteRecord,
  OwnerScheduleWithAvailabilityRecord,
  ReadScheduleRepository,
  ScheduleWithAvailabilityRecord
} from "./repository";
import { toScheduleDetail } from "./schedule-response";
import { getScheduleSlots } from "./schedule-slots";

export interface GetScheduleDependencies {
  readonly repository: ReadScheduleRepository;
}

export async function getScheduleView(
  publicId: string,
  dependencies: GetScheduleDependencies
): Promise<GetScheduleResponse> {
  assertSchedulePublicId(publicId);

  const record = await dependencies.repository.getScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  try {
    return toScheduleResponse(record);
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(500, "INTERNAL_ERROR", "Stored schedule configuration is invalid.", {
        coreCode: error.code
      });
    }

    throw error;
  }
}

export function toScheduleResponse(
  record: ScheduleWithAvailabilityRecord | OwnerScheduleWithAvailabilityRecord
): GetScheduleResponse {
  const schedule = record.schedule;
  const slots = getScheduleSlots(schedule, record.candidateTimeOptions);
  const candidateOptionSlotsById = new Map(
    record.candidateTimeOptions.map((option) => [
      option.id,
      {
        startUtc: option.slotStartUtc.toISOString(),
        endUtc: option.slotEndUtc.toISOString()
      }
    ])
  );
  const maybeParticipantIdsByCandidateId = buildMaybeParticipantIdsByCandidateId(
    record.candidateVotes ?? [],
    record.participants
  );
  const preferenceStatsByCandidateId = buildCandidatePreferenceStatsByCandidateId(
    record.candidateVotes ?? [],
    record.participants
  );
  const results = calculateAvailabilitySummary(
    slots,
    record.participants.map((participant) => ({
      participantId: participant.id,
      availableSlots: slotsForParticipant(
        record.availabilitySlots,
        participant.id,
        record.candidateVotes ?? [],
        candidateOptionSlotsById
      )
    }))
  );

  return {
    schedule: toScheduleDetail(schedule, record.candidateTimeOptions),
    participants: record.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName
    })),
    results: toAvailabilityResults(
      results,
      maybeParticipantIdsByCandidateId,
      preferenceStatsByCandidateId
    )
  };
}

function slotsForParticipant(
  slots: readonly AvailabilitySlotRecord[],
  participantId: string,
  candidateVotes: readonly {
    readonly candidateTimeOptionId: string;
    readonly participantId: string;
    readonly response: string;
  }[],
  candidateOptionSlotsById: ReadonlyMap<
    string,
    { readonly startUtc: string; readonly endUtc: string }
  >
): Array<{ readonly startUtc: string; readonly endUtc: string }> {
  const slotRecordsByKey = new Map<
    string,
    { readonly startUtc: string; readonly endUtc: string }
  >();

  for (const slot of slots) {
    if (slot.participantId !== participantId) {
      continue;
    }

    const value = {
      startUtc: slot.slotStartUtc.toISOString(),
      endUtc: slot.slotEndUtc.toISOString()
    };
    slotRecordsByKey.set(`${value.startUtc}/${value.endUtc}`, value);
  }

  for (const vote of candidateVotes) {
    if (vote.participantId !== participantId || vote.response !== "available") {
      continue;
    }

    const optionSlot = candidateOptionSlotsById.get(vote.candidateTimeOptionId);

    if (optionSlot !== undefined) {
      slotRecordsByKey.set(`${optionSlot.startUtc}/${optionSlot.endUtc}`, optionSlot);
    }
  }

  return Array.from(slotRecordsByKey.values());
}

function buildMaybeParticipantIdsByCandidateId(
  candidateVotes: readonly {
    readonly candidateTimeOptionId: string;
    readonly participantId: string;
    readonly response: string;
  }[],
  participants: readonly { readonly id: string }[]
): ReadonlyMap<string, readonly string[]> {
  const participantOrder = new Map(
    participants.map((participant, index) => [participant.id, index])
  );
  const maybeIdsByCandidateId = new Map<string, Set<string>>();

  for (const vote of candidateVotes) {
    if (vote.response !== "maybe") {
      continue;
    }

    const participantIds = maybeIdsByCandidateId.get(vote.candidateTimeOptionId) ?? new Set();
    participantIds.add(vote.participantId);
    maybeIdsByCandidateId.set(vote.candidateTimeOptionId, participantIds);
  }

  return new Map(
    Array.from(maybeIdsByCandidateId.entries()).map(([candidateTimeOptionId, participantIds]) => [
      candidateTimeOptionId,
      Array.from(participantIds).sort(
        (a, b) =>
          (participantOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (participantOrder.get(b) ?? Number.MAX_SAFE_INTEGER)
      )
    ])
  );
}

interface CandidatePreferenceStats {
  readonly firstPreferenceParticipantIds: readonly string[];
  readonly preferenceRankCount: number;
  readonly preferenceRankSum: number;
}

function buildCandidatePreferenceStatsByCandidateId(
  candidateVotes: readonly CandidateVoteRecord[],
  participants: readonly { readonly id: string }[]
): ReadonlyMap<string, CandidatePreferenceStats> {
  const participantOrder = new Map(
    participants.map((participant, index) => [participant.id, index])
  );
  const mutableStatsByCandidateId = new Map<
    string,
    {
      readonly firstPreferenceParticipantIds: Set<string>;
      preferenceRankCount: number;
      preferenceRankSum: number;
    }
  >();

  for (const vote of candidateVotes) {
    if (vote.preferenceRank == null || vote.response === "unavailable") {
      continue;
    }

    const stats = mutableStatsByCandidateId.get(vote.candidateTimeOptionId) ?? {
      firstPreferenceParticipantIds: new Set<string>(),
      preferenceRankCount: 0,
      preferenceRankSum: 0
    };

    stats.preferenceRankCount += 1;
    stats.preferenceRankSum += vote.preferenceRank;

    if (vote.preferenceRank === 1) {
      stats.firstPreferenceParticipantIds.add(vote.participantId);
    }

    mutableStatsByCandidateId.set(vote.candidateTimeOptionId, stats);
  }

  return new Map(
    Array.from(mutableStatsByCandidateId.entries()).map(([candidateTimeOptionId, stats]) => [
      candidateTimeOptionId,
      {
        firstPreferenceParticipantIds: Array.from(stats.firstPreferenceParticipantIds).sort(
          (a, b) =>
            (participantOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
              (participantOrder.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b)
        ),
        preferenceRankCount: stats.preferenceRankCount,
        preferenceRankSum: stats.preferenceRankSum
      }
    ])
  );
}

function toAvailabilityResults(
  results: {
    readonly totalParticipantCount: number;
    readonly slotResults: readonly TimeSlotAvailability[];
    readonly everyoneAvailableSlots: readonly TimeSlotAvailability[];
    readonly everyoneAvailableBlocks: readonly AvailabilityBlock[];
    readonly rankedSlots: readonly TimeSlotAvailability[];
  },
  maybeParticipantIdsByCandidateId: ReadonlyMap<string, readonly string[]>,
  preferenceStatsByCandidateId: ReadonlyMap<string, CandidatePreferenceStats>
): AvailabilityResults {
  return {
    totalParticipantCount: results.totalParticipantCount,
    slotResults: results.slotResults.map((slot) =>
      toTimeSlotAvailability(slot, maybeParticipantIdsByCandidateId, preferenceStatsByCandidateId)
    ),
    everyoneAvailableSlots: results.everyoneAvailableSlots.map((slot) =>
      toTimeSlotAvailability(slot, maybeParticipantIdsByCandidateId, preferenceStatsByCandidateId)
    ),
    everyoneAvailableBlocks: results.everyoneAvailableBlocks.map(toAvailabilityBlock),
    rankedSlots: results.rankedSlots.map((slot) =>
      toTimeSlotAvailability(slot, maybeParticipantIdsByCandidateId, preferenceStatsByCandidateId)
    )
  };
}

function toTimeSlotAvailability(
  slot: TimeSlotAvailability,
  maybeParticipantIdsByCandidateId: ReadonlyMap<string, readonly string[]>,
  preferenceStatsByCandidateId: ReadonlyMap<string, CandidatePreferenceStats>
): TimeSlotAvailabilityDto {
  const maybeParticipantIds =
    slot.candidateTimeOptionId === undefined
      ? []
      : (maybeParticipantIdsByCandidateId.get(slot.candidateTimeOptionId) ?? []);
  const preferenceStats =
    slot.candidateTimeOptionId === undefined
      ? undefined
      : preferenceStatsByCandidateId.get(slot.candidateTimeOptionId);

  return {
    ...(slot.candidateTimeOptionId === undefined
      ? {}
      : { candidateTimeOptionId: slot.candidateTimeOptionId }),
    ...(slot.label === undefined ? {} : { label: slot.label }),
    startUtc: slot.startUtc,
    endUtc: slot.endUtc,
    timezone: slot.timezone,
    localStartDate: slot.localStartDate,
    localEndDate: slot.localEndDate,
    localStartTime: slot.localStartTime,
    localEndTime: slot.localEndTime,
    availableParticipantCount: slot.availableParticipantCount,
    availableParticipantIds: [...slot.availableParticipantIds],
    maybeParticipantCount: maybeParticipantIds.length,
    maybeParticipantIds: [...maybeParticipantIds],
    ...(preferenceStats === undefined
      ? {}
      : {
          firstPreferenceParticipantCount: preferenceStats.firstPreferenceParticipantIds.length,
          firstPreferenceParticipantIds: [...preferenceStats.firstPreferenceParticipantIds],
          preferenceRankCount: preferenceStats.preferenceRankCount,
          preferenceRankSum: preferenceStats.preferenceRankSum
        }),
    isEveryoneAvailable: slot.isEveryoneAvailable
  };
}

function toAvailabilityBlock(block: AvailabilityBlock): AvailabilityBlockDto {
  return {
    startUtc: block.startUtc,
    endUtc: block.endUtc,
    timezone: block.timezone,
    localStartDate: block.localStartDate,
    localEndDate: block.localEndDate,
    localStartTime: block.localStartTime,
    localEndTime: block.localEndTime,
    slotCount: block.slotCount,
    availableParticipantCount: block.availableParticipantCount,
    availableParticipantIds: [...block.availableParticipantIds]
  };
}
