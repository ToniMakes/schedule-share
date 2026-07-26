import type { ArchiveScheduleRequest, ArchiveScheduleResponse } from "@schedule-share/api-client";

import { verifyKey } from "../credentials";
import { HttpError } from "../errors";
import type { ArchiveScheduleRepository } from "./repository";

export interface ArchiveScheduleDependencies {
  readonly repository: ArchiveScheduleRepository;
}

export async function archiveScheduleRecord(
  publicId: string,
  input: ArchiveScheduleRequest,
  dependencies: ArchiveScheduleDependencies
): Promise<ArchiveScheduleResponse> {
  if (publicId.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Schedule public id is required.");
  }

  const record = await dependencies.repository.getOwnerScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  if (!verifyKey(input.ownerKey, record.schedule.ownerKeyHash)) {
    throw new HttpError(403, "INVALID_OWNER_KEY", "Owner key is invalid.");
  }

  if (record.schedule.status === "archived") {
    return {
      schedule: {
        publicId: record.schedule.publicId,
        status: "archived"
      }
    };
  }

  const archived = await dependencies.repository.archiveSchedule(record.schedule.id);

  if (archived === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  return {
    schedule: archived
  };
}
