import type { DailyWindowInput, ScheduleDetail, TimeSlotDto } from "@schedule-share/api-client";
import type { DailyWindow, TimeSlot } from "@schedule-share/core";

import type { ScheduleDetailRecord } from "./repository";
import { toTimeSlotConfig } from "./schedule-config";

export function toScheduleDetail(schedule: ScheduleDetailRecord): ScheduleDetail {
  const timeSlotConfig = toTimeSlotConfig(schedule);

  return {
    publicId: schedule.publicId,
    title: schedule.title,
    description: schedule.description,
    timezone: schedule.timezone,
    dateRange: {
      start: timeSlotConfig.dateRange.start,
      end: timeSlotConfig.dateRange.end
    },
    slotMinutes: timeSlotConfig.slotMinutes,
    dailyWindows: timeSlotConfig.dailyWindows.map(toDailyWindowInput),
    status: schedule.status
  };
}

export function toTimeSlotDto(slot: TimeSlot): TimeSlotDto {
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
