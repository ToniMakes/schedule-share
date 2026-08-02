import type {
  ConfirmFinalTimeRequest,
  ConfirmFinalTimeResponse,
  TimeSlotDto
} from "@schedule-share/api-client";
import { CoreError } from "@schedule-share/core";

import { HttpError } from "../errors";
import { assertOwnerKeyMatches } from "./access-keys";
import { toScheduleResponse } from "./get-schedule";
import { assertSchedulePublicId } from "./path-validation";
import type { ConfirmFinalTimeRepository } from "./repository";

export interface ConfirmFinalTimeDependencies {
  readonly repository: ConfirmFinalTimeRepository;
}

export async function confirmFinalTime(
  publicId: string,
  input: ConfirmFinalTimeRequest,
  dependencies: ConfirmFinalTimeDependencies
): Promise<ConfirmFinalTimeResponse> {
  assertSchedulePublicId(publicId);

  const record = await dependencies.repository.getOwnerScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  assertOwnerKeyMatches(input.ownerKey, record.schedule.ownerKeyHash);

  if (record.schedule.status === "archived") {
    throw new HttpError(409, "SCHEDULE_LOCKED", "This schedule no longer accepts changes.");
  }

  const scheduleView = toScheduleView(record);
  const selectedFinalTime = selectFinalTimeSlot(scheduleView, input);

  if (selectedFinalTime === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", finalTimeValidationMessage(scheduleView));
  }

  const confirmed = await dependencies.repository.confirmFinalTime(record.schedule.id, {
    startUtc: new Date(selectedFinalTime.startUtc),
    endUtc: new Date(selectedFinalTime.endUtc)
  });

  if (confirmed === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  return {
    schedule: {
      publicId: confirmed.publicId,
      status: "locked",
      finalTime: toFinalTimeSlot(selectedFinalTime)
    }
  };
}

function selectFinalTimeSlot(
  scheduleView: ReturnType<typeof toScheduleResponse>,
  input: Pick<ConfirmFinalTimeRequest, "endUtc" | "startUtc">
): TimeSlotDto | undefined {
  const selectableSlots =
    scheduleView.schedule.scheduleMode === "candidate_poll"
      ? scheduleView.schedule.candidateWindows
      : scheduleView.results.everyoneAvailableBlocks;

  return selectableSlots.find(
    (slot) => slot.startUtc === input.startUtc && slot.endUtc === input.endUtc
  );
}

function finalTimeValidationMessage(scheduleView: ReturnType<typeof toScheduleResponse>): string {
  if (scheduleView.schedule.scheduleMode === "candidate_poll") {
    return "Final time must match a candidate time option.";
  }

  return "Final time must match an everyone-available block.";
}

function toScheduleView(record: Parameters<typeof toScheduleResponse>[0]) {
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

function toFinalTimeSlot(slot: TimeSlotDto): TimeSlotDto {
  return {
    startUtc: slot.startUtc,
    endUtc: slot.endUtc,
    timezone: slot.timezone,
    localStartDate: slot.localStartDate,
    localEndDate: slot.localEndDate,
    localStartTime: slot.localStartTime,
    localEndTime: slot.localEndTime
  };
}
