import { verifyKey } from "../credentials";
import { HttpError } from "../errors";

export function assertOwnerKeyPresent(ownerKey: string): void {
  if (ownerKey.length === 0) {
    throw invalidOwnerKeyError();
  }
}

export function assertOwnerKeyMatches(ownerKey: string, expectedHash: string): void {
  if (!verifyKey(ownerKey, expectedHash)) {
    throw invalidOwnerKeyError();
  }
}

export function assertParticipantEditKeyPresent(editKey: string): void {
  if (editKey.length === 0) {
    throw invalidParticipantEditKeyError();
  }
}

export function assertParticipantEditKeyMatches(editKey: string, expectedHash: string): void {
  if (!verifyKey(editKey, expectedHash)) {
    throw invalidParticipantEditKeyError();
  }
}

function invalidOwnerKeyError(): HttpError {
  return new HttpError(403, "INVALID_OWNER_KEY", "Owner key is invalid.");
}

function invalidParticipantEditKeyError(): HttpError {
  return new HttpError(403, "INVALID_EDIT_KEY", "Participant edit key is invalid.");
}
