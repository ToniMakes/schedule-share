import type { GetScheduleResponse } from "@schedule-share/api-client";
import { CoreError } from "@schedule-share/core";

import { HttpError } from "../errors";
import { assertOwnerKeyMatches, assertOwnerKeyPresent } from "./access-keys";
import { toScheduleResponse } from "./get-schedule";
import { assertSchedulePublicId } from "./path-validation";
import type { ReadOwnerScheduleRepository } from "./repository";

export interface GetOwnerScheduleDependencies {
  readonly repository: ReadOwnerScheduleRepository;
}

export async function getOwnerScheduleView(
  publicId: string,
  ownerKey: string,
  dependencies: GetOwnerScheduleDependencies
): Promise<GetScheduleResponse> {
  assertSchedulePublicId(publicId);
  assertOwnerKeyPresent(ownerKey);

  const record = await dependencies.repository.getOwnerScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  assertOwnerKeyMatches(ownerKey, record.schedule.ownerKeyHash);

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
