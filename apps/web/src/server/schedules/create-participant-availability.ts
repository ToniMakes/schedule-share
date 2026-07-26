import type {
  CreateParticipantAvailabilityRequest,
  CreateParticipantAvailabilityResponse
} from "@schedule-share/api-client";

import { hashKey, randomToken } from "../credentials";
import { HttpError } from "../errors";
import { buildAbsoluteUrl } from "../urls";
import { validateAvailabilitySlotsForSchedule } from "./availability-validation";
import { assertSchedulePublicId } from "./path-validation";
import type { CreateParticipantAvailabilityRepository } from "./repository";

export interface CreateParticipantAvailabilityDependencies {
  readonly baseUrl: string;
  readonly editKeyFactory?: () => string;
  readonly repository: CreateParticipantAvailabilityRepository;
}

export async function createParticipantAvailabilityRecord(
  publicId: string,
  input: CreateParticipantAvailabilityRequest,
  dependencies: CreateParticipantAvailabilityDependencies
): Promise<CreateParticipantAvailabilityResponse> {
  assertSchedulePublicId(publicId);

  const record = await dependencies.repository.getScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  if (record.schedule.status !== "open") {
    throw new HttpError(409, "SCHEDULE_LOCKED", "This schedule no longer accepts changes.");
  }

  validateAvailabilitySlotsForSchedule(record.schedule, input.availableSlots);

  const editKey = dependencies.editKeyFactory?.() ?? randomToken(24);
  const participant = await dependencies.repository.createParticipantAvailability({
    scheduleId: record.schedule.id,
    displayName: input.displayName,
    editKeyHash: hashKey(editKey),
    availabilitySlots: input.availableSlots.map((slot) => ({
      slotStartUtc: new Date(slot.startUtc),
      slotEndUtc: new Date(slot.endUtc)
    }))
  });

  return {
    participant,
    editUrl: buildAbsoluteUrl(dependencies.baseUrl, `/s/${publicId}/edit/${participant.id}`, {
      key: editKey
    })
  };
}
