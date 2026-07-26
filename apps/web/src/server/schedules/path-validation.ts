import { HttpError } from "../errors";

export function assertSchedulePublicId(publicId: string): void {
  if (publicId.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Schedule public id is required.");
  }
}

export function assertParticipantId(participantId: string): void {
  if (participantId.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Participant id is required.");
  }
}

export function assertScheduleParticipantPath(publicId: string, participantId: string): void {
  assertSchedulePublicId(publicId);
  assertParticipantId(participantId);
}
