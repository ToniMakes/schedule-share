import {
  createCandidateTimeWindowFromLocal,
  generateTimeSlots,
  type LocalDate,
  type LocalTime,
  type SlotMinutes
} from "@schedule-share/core";
import type { CreateScheduleRequest } from "@schedule-share/api-client";
import type { MessageKey } from "./i18n";

export interface CandidateRowForm {
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface ScheduleForm {
  readonly title: string;
  readonly description: string;
  readonly timezone: string;
  readonly mode: "availability_grid" | "candidate_poll";
  readonly startDate: string;
  readonly endDate: string;
  readonly slotMinutes: SlotMinutes;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly candidates: readonly CandidateRowForm[];
}

export type ScheduleFormResult =
  | { readonly ok: true; readonly request: CreateScheduleRequest }
  | { readonly ok: false; readonly error: MessageKey };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Validates the form and converts it to an API request; time rules stay in packages/core. */
export function buildCreateScheduleRequest(form: ScheduleForm): ScheduleFormResult {
  const title = form.title.trim();
  if (!title) return fail("createTitleRequired");
  const timezone = form.timezone.trim();
  if (!isValidTimezone(timezone)) return fail("createTimezoneInvalid");

  const description = form.description.trim();
  const base = {
    title,
    timezone,
    slotMinutes: form.slotMinutes,
    ...(description ? { description } : {})
  };

  try {
    if (form.mode === "availability_grid") {
      if (!isRealDate(form.startDate) || !isRealDate(form.endDate))
        return fail("createDateInvalid");
      if (form.startDate > form.endDate) return fail("createDateOrder");
      if (!isValidTimeRange(form.windowStart, form.windowEnd)) return fail("createTimeInvalid");

      const slots = generateTimeSlots({
        timezone,
        dateRange: { start: form.startDate as LocalDate, end: form.endDate as LocalDate },
        slotMinutes: form.slotMinutes,
        dailyWindows: [
          { startTime: form.windowStart as LocalTime, endTime: form.windowEnd as LocalTime }
        ]
      });
      if (slots.length === 0) return fail("createNoSlots");

      return {
        ok: true,
        request: {
          ...base,
          scheduleMode: "availability_grid",
          dateRange: { start: form.startDate, end: form.endDate },
          dailyWindows: [{ startTime: form.windowStart, endTime: form.windowEnd }]
        }
      };
    }

    if (form.candidates.length === 0) return fail("createCandidateRequired");
    const candidateWindows = [];
    for (const row of form.candidates) {
      if (!isRealDate(row.date)) return fail("createDateInvalid");
      if (!isValidTimeRange(row.startTime, row.endTime)) return fail("createTimeInvalid");
      candidateWindows.push(
        createCandidateTimeWindowFromLocal({
          localDate: row.date as LocalDate,
          startTime: row.startTime as LocalTime,
          endTime: row.endTime as LocalTime,
          timezone
        })
      );
    }
    return { ok: true, request: { ...base, scheduleMode: "candidate_poll", candidateWindows } };
  } catch {
    return fail("createNoSlots");
  }
}

function isValidTimeRange(start: string, end: string): boolean {
  return TIME_PATTERN.test(start) && TIME_PATTERN.test(end) && start !== end;
}

export function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isValidTimezone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function localToday(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function createDefaultScheduleForm(timezone: string, today = localToday()): ScheduleForm {
  const tomorrow = addDays(today, 1);
  return {
    title: "",
    description: "",
    timezone,
    mode: "availability_grid",
    startDate: tomorrow,
    endDate: addDays(tomorrow, 6),
    slotMinutes: 30,
    windowStart: "09:00",
    windowEnd: "17:00",
    candidates: [{ date: tomorrow, startTime: "10:00", endTime: "11:00" }]
  };
}

function fail(error: MessageKey): ScheduleFormResult {
  return { ok: false, error };
}
