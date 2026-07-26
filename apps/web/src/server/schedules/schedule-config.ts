import type {
  DailyWindow,
  DayOfWeek,
  LocalDate,
  LocalTime,
  SlotMinutes,
  TimeSlotConfig
} from "@schedule-share/core";
import type { StoredDailyWindow } from "@schedule-share/db";

import { HttpError } from "../errors";
import type { ScheduleDetailRecord } from "./repository";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function toTimeSlotConfig(schedule: ScheduleDetailRecord): TimeSlotConfig {
  return {
    timezone: schedule.timezone,
    dateRange: {
      start: toLocalDate(schedule.dateRangeStart),
      end: toLocalDate(schedule.dateRangeEnd)
    },
    slotMinutes: toSlotMinutes(schedule.slotMinutes),
    dailyWindows: schedule.dailyWindows.map(toDailyWindow)
  };
}

function toDailyWindow(window: StoredDailyWindow): DailyWindow {
  return {
    ...(window.daysOfWeek === undefined
      ? {}
      : {
          daysOfWeek: window.daysOfWeek.map(toDayOfWeek)
        }),
    startTime: toLocalTime(window.startTime),
    endTime: toLocalTime(window.endTime)
  };
}

function toDayOfWeek(value: number): DayOfWeek {
  if (Number.isInteger(value) && value >= 0 && value <= 6) {
    return value as DayOfWeek;
  }

  throw new HttpError(500, "INTERNAL_ERROR", "Stored schedule weekday is invalid.");
}

function toLocalDate(value: string): LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    throw new HttpError(500, "INTERNAL_ERROR", "Stored schedule date is invalid.");
  }

  return value as LocalDate;
}

function toLocalTime(value: string): LocalTime {
  if (!LOCAL_TIME_PATTERN.test(value)) {
    throw new HttpError(500, "INTERNAL_ERROR", "Stored schedule time is invalid.");
  }

  return value as LocalTime;
}

function toSlotMinutes(value: number): SlotMinutes {
  if (value === 15 || value === 30 || value === 60) {
    return value;
  }

  throw new HttpError(500, "UNSUPPORTED_SLOT_MINUTES", "Stored slot size is unsupported.");
}
