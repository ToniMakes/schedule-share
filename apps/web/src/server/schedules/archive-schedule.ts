import type { ArchiveScheduleRequest, ArchiveScheduleResponse } from "@schedule-share/api-client";

import { HttpError } from "../errors";
import { assertOwnerKeyMatches } from "./access-keys";
import { assertSchedulePublicId } from "./path-validation";
import type { ArchiveScheduleRepository } from "./repository";

export interface ArchiveScheduleDependencies {
  readonly repository: ArchiveScheduleRepository;
}

export async function archiveScheduleRecord(
  publicId: string,
  input: ArchiveScheduleRequest,
  dependencies: ArchiveScheduleDependencies
): Promise<ArchiveScheduleResponse> {
  assertSchedulePublicId(publicId);

  const record = await dependencies.repository.getOwnerScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  assertOwnerKeyMatches(input.ownerKey, record.schedule.ownerKeyHash);

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
