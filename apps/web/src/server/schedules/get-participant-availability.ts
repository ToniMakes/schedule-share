import type {
  AvailabilitySlotInput,
  CandidateVoteInput,
  GetParticipantAvailabilityResponse
} from "@schedule-share/api-client";
import { CoreError } from "@schedule-share/core";

import { HttpError } from "../errors";
import { assertParticipantEditKeyMatches, assertParticipantEditKeyPresent } from "./access-keys";
import { assertScheduleParticipantPath } from "./path-validation";
import type {
  ParticipantAvailabilityWithScheduleRecord,
  ReadParticipantAvailabilityRepository
} from "./repository";
import { toScheduleDetail, toTimeSlotDto } from "./schedule-response";
import { getScheduleSlots } from "./schedule-slots";

export interface GetParticipantAvailabilityDependencies {
  readonly repository: ReadParticipantAvailabilityRepository;
}

export async function getParticipantAvailabilityView(
  publicId: string,
  participantId: string,
  editKey: string,
  dependencies: GetParticipantAvailabilityDependencies
): Promise<GetParticipantAvailabilityResponse> {
  assertScheduleParticipantPath(publicId, participantId);
  assertParticipantEditKeyPresent(editKey);

  const record = await dependencies.repository.getParticipantAvailabilityByPublicId(
    publicId,
    participantId
  );

  if (record === undefined) {
    throw new HttpError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
  }

  assertParticipantEditKeyMatches(editKey, record.participant.editKeyHash);

  try {
    return toParticipantAvailabilityResponse(record);
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(500, "INTERNAL_ERROR", "Stored schedule configuration is invalid.", {
        coreCode: error.code
      });
    }

    throw error;
  }
}

function toParticipantAvailabilityResponse(
  record: ParticipantAvailabilityWithScheduleRecord
): GetParticipantAvailabilityResponse {
  return {
    schedule: toScheduleDetail(record.schedule, record.candidateTimeOptions),
    participant: {
      id: record.participant.id,
      displayName: record.participant.displayName,
      availableSlots: record.participant.availableSlots.map(toAvailabilitySlotInput),
      candidateVotes: toParticipantCandidateVotes(record)
    },
    slots: getScheduleSlots(record.schedule, record.candidateTimeOptions).map(toTimeSlotDto)
  };
}

function toParticipantCandidateVotes(
  record: ParticipantAvailabilityWithScheduleRecord
): CandidateVoteInput[] {
  const storedVotes = record.participant.candidateVotes ?? [];

  if (storedVotes.length > 0 || record.schedule.scheduleMode !== "candidate_poll") {
    return storedVotes.map((vote) => ({
      candidateTimeOptionId: vote.candidateTimeOptionId,
      ...(vote.preferenceRank == null ? {} : { preferenceRank: vote.preferenceRank }),
      response: vote.response
    }));
  }

  const availableSlotKeys = new Set(
    record.participant.availableSlots.map(
      (slot) => `${slot.slotStartUtc.toISOString()}/${slot.slotEndUtc.toISOString()}`
    )
  );

  return record.candidateTimeOptions
    .filter((option) =>
      availableSlotKeys.has(
        `${option.slotStartUtc.toISOString()}/${option.slotEndUtc.toISOString()}`
      )
    )
    .map((option) => ({
      candidateTimeOptionId: option.id,
      response: "available"
    }));
}

function toAvailabilitySlotInput(slot: {
  readonly slotStartUtc: Date;
  readonly slotEndUtc: Date;
}): AvailabilitySlotInput {
  return {
    startUtc: slot.slotStartUtc.toISOString(),
    endUtc: slot.slotEndUtc.toISOString()
  };
}
