import type { GetScheduleResponse } from "@schedule-share/api-client";
import { CoreError } from "@schedule-share/core";

import { verifyKey } from "../credentials";
import { HttpError } from "../errors";
import { toScheduleResponse } from "./get-schedule";
import type { ReadOwnerScheduleRepository } from "./repository";

export interface GetOwnerScheduleDependencies {
  readonly repository: ReadOwnerScheduleRepository;
}

export async function getOwnerScheduleView(
  publicId: string,
  ownerKey: string,
  dependencies: GetOwnerScheduleDependencies
): Promise<GetScheduleResponse> {
  if (publicId.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Schedule public id is required.");
  }

  if (ownerKey.length === 0) {
    throw new HttpError(403, "INVALID_OWNER_KEY", "Owner key is invalid.");
  }

  const record = await dependencies.repository.getOwnerScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  if (!verifyKey(ownerKey, record.schedule.ownerKeyHash)) {
    throw new HttpError(403, "INVALID_OWNER_KEY", "Owner key is invalid.");
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
