import {
  calculateAvailabilitySummary,
  CoreError,
  generateTimeSlots,
  type AvailabilitySlot
} from "@schedule-share/core";

import { HttpError } from "../errors";
import type { ScheduleDetailRecord } from "./repository";
import { toTimeSlotConfig } from "./schedule-config";

export function validateAvailabilitySlotsForSchedule(
  schedule: ScheduleDetailRecord,
  availableSlots: readonly AvailabilitySlot[]
): void {
  try {
    calculateAvailabilitySummary(generateTimeSlots(toTimeSlotConfig(schedule)), [
      {
        participantId: "submitted-participant",
        availableSlots
      }
    ]);
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(400, coreErrorCode(error), error.message, {
        coreCode: error.code
      });
    }

    throw error;
  }
}

function coreErrorCode(error: CoreError): "SLOT_OUT_OF_RANGE" | "VALIDATION_ERROR" {
  return error.code === "SLOT_OUT_OF_RANGE" ? "SLOT_OUT_OF_RANGE" : "VALIDATION_ERROR";
}
