import type { LockScheduleRequest, LockScheduleResponse } from "@schedule-share/api-client";

import { verifyKey } from "../credentials";
import { HttpError } from "../errors";
import { assertSchedulePublicId } from "./path-validation";
import type { LockScheduleRepository } from "./repository";

export interface LockScheduleDependencies {
  readonly repository: LockScheduleRepository;
}

export async function lockScheduleRecord(
  publicId: string,
  input: LockScheduleRequest,
  dependencies: LockScheduleDependencies
): Promise<LockScheduleResponse> {
  assertSchedulePublicId(publicId);

  const record = await dependencies.repository.getOwnerScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  if (!verifyKey(input.ownerKey, record.schedule.ownerKeyHash)) {
    throw new HttpError(403, "INVALID_OWNER_KEY", "Owner key is invalid.");
  }

  if (record.schedule.status === "locked") {
    return {
      schedule: {
        publicId: record.schedule.publicId,
        status: "locked"
      }
    };
  }

  if (record.schedule.status !== "open") {
    throw new HttpError(409, "SCHEDULE_LOCKED", "This schedule no longer accepts changes.");
  }

  const locked = await dependencies.repository.lockSchedule(record.schedule.id);

  if (locked === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  return {
    schedule: locked
  };
}
