import type { DailyWindowInput, ScheduleDetail, TimeSlotDto } from "@schedule-share/api-client";
import { createTimeSlotFromUtcRange } from "@schedule-share/core";
import type { DailyWindow, TimeSlot } from "@schedule-share/core";

import type { CandidateTimeOptionRecord, ScheduleDetailRecord } from "./repository";
import { toTimeSlotConfig } from "./schedule-config";
import { getScheduleSlots } from "./schedule-slots";

export function toScheduleDetail(
  schedule: ScheduleDetailRecord,
  candidateTimeOptions: readonly CandidateTimeOptionRecord[] = []
): ScheduleDetail {
  const timeSlotConfig = toTimeSlotConfig(schedule);

  return {
    publicId: schedule.publicId,
    title: schedule.title,
    description: schedule.description,
    timezone: schedule.timezone,
    scheduleMode: schedule.scheduleMode,
    dateRange: {
      start: timeSlotConfig.dateRange.start,
      end: timeSlotConfig.dateRange.end
    },
    slotMinutes: timeSlotConfig.slotMinutes,
    dailyWindows: timeSlotConfig.dailyWindows.map(toDailyWindowInput),
    candidateWindows: getScheduleSlots(schedule, candidateTimeOptions).map(toTimeSlotDto),
    finalTime: toFinalTimeSlotDto(schedule),
    status: schedule.status
  };
}

export function toTimeSlotDto(slot: TimeSlot): TimeSlotDto {
  return {
    ...(slot.candidateTimeOptionId === undefined
      ? {}
      : { candidateTimeOptionId: slot.candidateTimeOptionId }),
    ...(slot.label === undefined ? {} : { label: slot.label }),
    startUtc: slot.startUtc,
    endUtc: slot.endUtc,
    timezone: slot.timezone,
    localStartDate: slot.localStartDate,
    localEndDate: slot.localEndDate,
    localStartTime: slot.localStartTime,
    localEndTime: slot.localEndTime
  };
}

function toDailyWindowInput(window: DailyWindow): DailyWindowInput {
  return {
    ...(window.daysOfWeek === undefined
      ? {}
      : {
          daysOfWeek: [...window.daysOfWeek]
        }),
    startTime: window.startTime,
    endTime: window.endTime
  };
}

function toFinalTimeSlotDto(schedule: ScheduleDetailRecord): TimeSlotDto | null {
  if (schedule.finalStartUtc === undefined || schedule.finalEndUtc === undefined) {
    return null;
  }

  if (schedule.finalStartUtc === null || schedule.finalEndUtc === null) {
    return null;
  }

  return toTimeSlotDto(
    createTimeSlotFromUtcRange({
      startUtc: schedule.finalStartUtc.toISOString(),
      endUtc: schedule.finalEndUtc.toISOString(),
      timezone: schedule.timezone
    })
  );
}
