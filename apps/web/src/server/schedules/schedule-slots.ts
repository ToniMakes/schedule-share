import { createCandidateTimeSlots, generateTimeSlots, type TimeSlot } from "@schedule-share/core";

import type { CandidateTimeOptionRecord, ScheduleDetailRecord } from "./repository";
import { toTimeSlotConfig } from "./schedule-config";

export function getScheduleSlots(
  schedule: ScheduleDetailRecord,
  candidateTimeOptions: readonly CandidateTimeOptionRecord[]
): TimeSlot[] {
  if (schedule.scheduleMode === "candidate_poll") {
    return createCandidateTimeSlots({
      timezone: schedule.timezone,
      candidateWindows: candidateTimeOptions.map((option) => ({
        id: option.id,
        ...(option.label === null ? {} : { label: option.label }),
        startUtc: option.slotStartUtc.toISOString(),
        endUtc: option.slotEndUtc.toISOString()
      }))
    });
  }

  return generateTimeSlots(toTimeSlotConfig(schedule));
}
