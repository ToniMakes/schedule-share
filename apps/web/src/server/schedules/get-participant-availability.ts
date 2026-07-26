import type {
  AvailabilitySlotInput,
  GetParticipantAvailabilityResponse
} from "@schedule-share/api-client";
import { CoreError, generateTimeSlots } from "@schedule-share/core";

import { HttpError } from "../errors";
import { assertParticipantEditKeyMatches, assertParticipantEditKeyPresent } from "./access-keys";
import { assertScheduleParticipantPath } from "./path-validation";
import type {
  ParticipantAvailabilityWithScheduleRecord,
  ReadParticipantAvailabilityRepository
} from "./repository";
import { toScheduleDetail, toTimeSlotDto } from "./schedule-response";
import { toTimeSlotConfig } from "./schedule-config";

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
    schedule: toScheduleDetail(record.schedule),
    participant: {
      id: record.participant.id,
      displayName: record.participant.displayName,
      availableSlots: record.participant.availableSlots.map(toAvailabilitySlotInput)
    },
    slots: generateTimeSlots(toTimeSlotConfig(record.schedule)).map(toTimeSlotDto)
  };
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
