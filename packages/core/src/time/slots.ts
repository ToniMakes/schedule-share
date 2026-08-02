import { DateTime } from "luxon";

import { fail } from "../errors";
import type {
  CandidateTimeSlot,
  CandidateTimeWindow,
  DailyWindow,
  DayOfWeek,
  LocalDate,
  LocalCandidateTimeWindow,
  LocalTime,
  SlotMinutes,
  TimeSlot,
  TimeSlotConfig
} from "../domain/types";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const SUPPORTED_SLOT_MINUTES = new Set<number>([15, 30, 60]);

export function generateTimeSlots(config: TimeSlotConfig): TimeSlot[] {
  validateTimeSlotConfig(config);

  const slotsByKey = new Map<string, TimeSlot>();
  const startDate = parseLocalDate(config.dateRange.start, config.timezone);
  const endDate = parseLocalDate(config.dateRange.end, config.timezone);

  for (
    let localDay = startDate;
    localDay.toMillis() <= endDate.toMillis();
    localDay = localDay.plus({ days: 1 })
  ) {
    const dayOfWeek = toDayOfWeek(localDay);
    const windows = config.dailyWindows.filter((window) => appliesToDay(window, dayOfWeek));

    for (const window of windows) {
      const windowStart = parseLocalDateTime(
        toIsoDate(localDay),
        window.startTime,
        config.timezone
      );
      let windowEnd = parseLocalDateTime(toIsoDate(localDay), window.endTime, config.timezone);

      if (compareLocalTimes(window.endTime, window.startTime) <= 0) {
        windowEnd = windowEnd.plus({ days: 1 });
      }

      for (
        let cursor = windowStart;
        cursor.plus({ minutes: config.slotMinutes }).toMillis() <= windowEnd.toMillis();
        cursor = cursor.plus({ minutes: config.slotMinutes })
      ) {
        const slotEnd = cursor.plus({ minutes: config.slotMinutes });
        const slot = toTimeSlot(cursor, slotEnd, config.timezone);
        slotsByKey.set(slotKey(slot.startUtc, slot.endUtc), slot);
      }
    }
  }

  return Array.from(slotsByKey.values()).sort(compareSlots);
}

export function createCandidateTimeSlots(input: {
  readonly candidateWindows: readonly CandidateTimeWindow[];
  readonly timezone: string;
}): CandidateTimeSlot[] {
  validateTimezone(input.timezone);

  if (input.candidateWindows.length === 0) {
    fail("INVALID_CANDIDATE_TIME", "At least one candidate time is required.");
  }

  const slotsByKey = new Map<string, CandidateTimeSlot>();

  for (const window of input.candidateWindows) {
    const key = slotKey(window.startUtc, window.endUtc);

    if (slotsByKey.has(key)) {
      fail("DUPLICATE_SLOT", "Candidate times cannot contain duplicate ranges.");
    }

    const start = DateTime.fromISO(normalizeUtcIso(window.startUtc), { setZone: true });
    const end = DateTime.fromISO(normalizeUtcIso(window.endUtc), { setZone: true });
    const slot = toTimeSlot(start, end, input.timezone);

    slotsByKey.set(key, {
      ...slot,
      ...(window.id === undefined ? {} : { candidateTimeOptionId: window.id }),
      ...(window.label === undefined || window.label.trim().length === 0
        ? {}
        : { label: window.label.trim() })
    });
  }

  return Array.from(slotsByKey.values()).sort(compareSlots);
}

export function createCandidateTimeWindowFromLocal(
  input: LocalCandidateTimeWindow
): CandidateTimeWindow {
  validateTimezone(input.timezone);
  const start = parseLocalDateTime(input.localDate, input.startTime, input.timezone);
  let end = parseLocalDateTime(input.localDate, input.endTime, input.timezone);

  if (compareLocalTimes(input.endTime, input.startTime) <= 0) {
    end = end.plus({ days: 1 });
  }

  return {
    ...(input.label === undefined || input.label.trim().length === 0
      ? {}
      : { label: input.label.trim() }),
    startUtc: toUtcIso(start),
    endUtc: toUtcIso(end)
  };
}

export function createTimeSlotFromUtcRange(input: {
  readonly endUtc: string;
  readonly startUtc: string;
  readonly timezone: string;
}): TimeSlot {
  validateTimezone(input.timezone);

  const start = DateTime.fromISO(normalizeUtcIso(input.startUtc), { setZone: true });
  const end = DateTime.fromISO(normalizeUtcIso(input.endUtc), { setZone: true });

  return toTimeSlot(start, end, input.timezone);
}

export function slotKey(startUtc: string, endUtc: string): string {
  const normalizedStart = normalizeUtcIso(startUtc);
  const normalizedEnd = normalizeUtcIso(endUtc);

  if (DateTime.fromISO(normalizedEnd).toMillis() <= DateTime.fromISO(normalizedStart).toMillis()) {
    fail("INVALID_TIME_RANGE", "Slot end must be after slot start.");
  }

  return `${normalizedStart}/${normalizedEnd}`;
}

export function normalizeUtcIso(value: string): string {
  if (!ISO_OFFSET_PATTERN.test(value)) {
    fail("INVALID_TIME_RANGE", `Timestamp must include a timezone offset: ${value}`);
  }

  const parsed = DateTime.fromISO(value, { setZone: true });

  if (!parsed.isValid) {
    fail("INVALID_TIME_RANGE", `Invalid UTC timestamp: ${value}`);
  }

  return toUtcIso(parsed);
}

export function compareSlots(a: TimeSlot, b: TimeSlot): number {
  return normalizeUtcIso(a.startUtc).localeCompare(normalizeUtcIso(b.startUtc));
}

function validateTimeSlotConfig(config: TimeSlotConfig): void {
  validateTimezone(config.timezone);
  validateSlotMinutes(config.slotMinutes);

  const startDate = parseLocalDate(config.dateRange.start, config.timezone);
  const endDate = parseLocalDate(config.dateRange.end, config.timezone);

  if (startDate.toMillis() > endDate.toMillis()) {
    fail("INVALID_DATE_RANGE", "Date range start must be on or before date range end.");
  }

  if (config.dailyWindows.length === 0) {
    fail("INVALID_DAILY_WINDOW", "At least one daily window is required.");
  }

  for (const window of config.dailyWindows) {
    validateDailyWindow(window);
  }
}

function validateTimezone(timezone: string): void {
  if (!DateTime.now().setZone(timezone).isValid) {
    fail("INVALID_TIMEZONE", `Unsupported IANA timezone: ${timezone}`);
  }
}

function validateSlotMinutes(slotMinutes: SlotMinutes): void {
  if (!SUPPORTED_SLOT_MINUTES.has(slotMinutes)) {
    fail("UNSUPPORTED_SLOT_MINUTES", "Slot minutes must be 15, 30, or 60.");
  }
}

function validateDailyWindow(window: DailyWindow): void {
  validateLocalTime(window.startTime);
  validateLocalTime(window.endTime);

  if (window.startTime === window.endTime) {
    fail("INVALID_DAILY_WINDOW", "Daily window start and end time cannot be the same.");
  }

  if (window.daysOfWeek !== undefined && window.daysOfWeek.length === 0) {
    fail("INVALID_DAILY_WINDOW", "daysOfWeek cannot be empty when provided.");
  }

  for (const day of window.daysOfWeek ?? []) {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      fail("INVALID_DAILY_WINDOW", "daysOfWeek values must be integers from 0 to 6.");
    }
  }
}

function parseLocalDate(value: LocalDate, timezone: string): DateTime {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    fail("INVALID_LOCAL_DATE", `Invalid local date: ${value}`);
  }

  const parsed = DateTime.fromISO(value, { zone: timezone }).startOf("day");

  if (!parsed.isValid || parsed.toISODate() !== value) {
    fail("INVALID_LOCAL_DATE", `Invalid local date: ${value}`);
  }

  return parsed;
}

function parseLocalDateTime(date: LocalDate, time: LocalTime, timezone: string): DateTime {
  validateLocalTime(time);

  const parsed = DateTime.fromISO(`${date}T${time}`, { zone: timezone });

  if (!parsed.isValid) {
    fail("INVALID_LOCAL_TIME", `Invalid local date time: ${date} ${time}`);
  }

  return parsed;
}

function validateLocalTime(value: LocalTime): void {
  if (!LOCAL_TIME_PATTERN.test(value)) {
    fail("INVALID_LOCAL_TIME", `Invalid local time: ${value}`);
  }
}

function appliesToDay(window: DailyWindow, dayOfWeek: DayOfWeek): boolean {
  return window.daysOfWeek === undefined || window.daysOfWeek.includes(dayOfWeek);
}

function toDayOfWeek(localDay: DateTime): DayOfWeek {
  return (localDay.weekday % 7) as DayOfWeek;
}

function compareLocalTimes(a: LocalTime, b: LocalTime): number {
  return localTimeToMinutes(a) - localTimeToMinutes(b);
}

function localTimeToMinutes(value: LocalTime): number {
  const match = LOCAL_TIME_PATTERN.exec(value);

  if (match === null) {
    fail("INVALID_LOCAL_TIME", `Invalid local time: ${value}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours * 60 + minutes;
}

function toTimeSlot(start: DateTime, end: DateTime, timezone: string): TimeSlot {
  const localStart = start.setZone(timezone);
  const localEnd = end.setZone(timezone);

  if (end.toMillis() <= start.toMillis()) {
    fail("INVALID_TIME_RANGE", "Slot end must be after slot start.");
  }

  return {
    startUtc: toUtcIso(start),
    endUtc: toUtcIso(end),
    timezone,
    localStartDate: toIsoDate(localStart),
    localEndDate: toIsoDate(localEnd),
    localStartTime: toLocalTime(localStart),
    localEndTime: toLocalTime(localEnd)
  };
}

function toUtcIso(value: DateTime): string {
  const iso = value.toUTC().toISO({
    suppressMilliseconds: false
  });

  if (iso === null) {
    fail("INVALID_TIME_RANGE", "Could not convert timestamp to UTC ISO.");
  }

  return iso;
}

function toIsoDate(value: DateTime): LocalDate {
  const date = value.toISODate();

  if (date === null) {
    fail("INVALID_LOCAL_DATE", "Could not format local date.");
  }

  return date as LocalDate;
}

function toLocalTime(value: DateTime): LocalTime {
  return value.toFormat("HH:mm") as LocalTime;
}
