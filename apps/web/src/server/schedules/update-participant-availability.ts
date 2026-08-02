import type {
  UpdateParticipantAvailabilityRequest,
  UpdateParticipantAvailabilityResponse
} from "@schedule-share/api-client";

import { HttpError } from "../errors";
import { assertParticipantEditKeyMatches } from "./access-keys";
import { normalizeAvailabilitySubmissionForSchedule } from "./availability-validation";
import { assertScheduleParticipantPath } from "./path-validation";
import type { UpdateParticipantAvailabilityRepository } from "./repository";

export interface UpdateParticipantAvailabilityDependencies {
  readonly repository: UpdateParticipantAvailabilityRepository;
}

export async function updateParticipantAvailabilityRecord(
  publicId: string,
  participantId: string,
  input: UpdateParticipantAvailabilityRequest,
  dependencies: UpdateParticipantAvailabilityDependencies
): Promise<UpdateParticipantAvailabilityResponse> {
  assertScheduleParticipantPath(publicId, participantId);

  const record = await dependencies.repository.getParticipantAvailabilityByPublicId(
    publicId,
    participantId
  );

  if (record === undefined) {
    throw new HttpError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
  }

  assertParticipantEditKeyMatches(input.editKey, record.participant.editKeyHash);

  if (record.schedule.status !== "open") {
    throw new HttpError(409, "SCHEDULE_LOCKED", "This schedule no longer accepts changes.");
  }

  const submission = normalizeAvailabilitySubmissionForSchedule(
    record.schedule,
    input.availableSlots,
    record.candidateTimeOptions,
    input.candidateVotes
  );

  const participant = await dependencies.repository.updateParticipantAvailability({
    scheduleId: record.schedule.id,
    participantId,
    displayName: input.displayName,
    availabilitySlots: submission.availabilitySlots.map((slot) => ({
      slotStartUtc: new Date(slot.startUtc),
      slotEndUtc: new Date(slot.endUtc)
    })),
    candidateVotes: submission.candidateVotes
  });

  if (participant === undefined) {
    throw new HttpError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
  }

  return {
    participant
  };
}
