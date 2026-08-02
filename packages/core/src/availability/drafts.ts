import { DateTime, Interval } from "luxon";

import { fail } from "../errors";
import type {
  AvailabilityDraft,
  AvailabilityEntryMethod,
  AvailabilitySlot,
  AvailabilityTemplate,
  ImportedBusyBlock,
  LocalDate,
  LocalTime,
  TimeSlot,
  TimeSlotConfig,
  WeeklyAvailabilityWindow
} from "../domain/types";
import { generateTimeSlots, normalizeUtcIso, slotKey } from "../time/slots";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const BUSY_BLOCK_ENTRY_METHODS = new Set<AvailabilityEntryMethod>([
  "image_import",
  "text_import",
  "csv_import",
  "ics_import"
]);

interface CreateAvailabilityDraftBaseInput {
  readonly config: TimeSlotConfig;
  readonly entryMethod: AvailabilityEntryMethod;
  readonly warnings?: readonly string[];
  readonly confidence?: number;
}

export interface CreateAvailabilityDraftFromAvailableSlotsInput extends CreateAvailabilityDraftBaseInput {
  readonly availableSlots: readonly AvailabilitySlot[];
}

export interface CreateAvailabilityDraftFromBusyBlocksInput extends CreateAvailabilityDraftBaseInput {
  readonly busyBlocks: readonly ImportedBusyBlock[];
}

export interface CreateAvailabilityDraftFromTemplateInput {
  readonly config: TimeSlotConfig;
  readonly template: AvailabilityTemplate;
  readonly warnings?: readonly string[];
}

interface BusyInterval {
  readonly block: ImportedBusyBlock;
  readonly interval: Interval;
}

interface TemplateInterval {
  readonly interval: Interval;
  readonly window: WeeklyAvailabilityWindow;
}

export function createAvailabilityDraftFromAvailableSlots(
  input: CreateAvailabilityDraftFromAvailableSlotsInput
): AvailabilityDraft {
  const slots = generateTimeSlots(input.config);
  const slotsByKey = new Map(slots.map((slot) => [slotKey(slot.startUtc, slot.endUtc), slot]));
  const selectedSlots = new Map<string, AvailabilitySlot>();

  validateConfidence(input.confidence);

  for (const availableSlot of input.availableSlots) {
    const key = slotKey(availableSlot.startUtc, availableSlot.endUtc);

    if (!slotsByKey.has(key)) {
      fail("SLOT_OUT_OF_RANGE", "Availability draft contains a slot outside this schedule.");
    }

    selectedSlots.set(key, {
      startUtc: normalizeUtcIso(availableSlot.startUtc),
      endUtc: normalizeUtcIso(availableSlot.endUtc)
    });
  }

  return {
    entryMethod: input.entryMethod,
    availableSlots: sortAvailabilitySlots(Array.from(selectedSlots.values())),
    busyBlocks: [],
    warnings: uniqueWarnings(input.warnings ?? []),
    ...(input.confidence === undefined ? {} : { confidence: input.confidence })
  };
}

export function createAvailabilityDraftFromBusyBlocks(
  input: CreateAvailabilityDraftFromBusyBlocksInput
): AvailabilityDraft {
  if (!BUSY_BLOCK_ENTRY_METHODS.has(input.entryMethod)) {
    fail("UNSUPPORTED_ENTRY_METHOD", "Busy block imports must use an import entry method.");
  }

  validateConfidence(input.confidence);

  const slots = generateTimeSlots(input.config);
  const warnings = [...(input.warnings ?? [])];

  if (input.busyBlocks.length === 0) {
    warnings.push("No busy blocks were found; all generated schedule slots remain selected.");
  }

  const busyIntervals = buildBusyIntervals(input.busyBlocks, slots, warnings);
  const overlappingBusyBlocks = new Set<ImportedBusyBlock>();
  const availableSlots = slots
    .filter((slot) => {
      const slotInterval = intervalFromUtcIso(slot.startUtc, slot.endUtc);
      const overlapping = busyIntervals.filter((busy) =>
        intervalsOverlap(slotInterval, busy.interval)
      );

      for (const busy of overlapping) {
        overlappingBusyBlocks.add(busy.block);
      }

      return overlapping.length === 0;
    })
    .map(toAvailabilitySlot);

  for (const block of input.busyBlocks) {
    if (!overlappingBusyBlocks.has(block)) {
      warnings.push(`${busyBlockLabel(block)} did not overlap any selectable schedule slot.`);
    }
  }

  return {
    entryMethod: input.entryMethod,
    availableSlots,
    busyBlocks: input.busyBlocks,
    warnings: uniqueWarnings([
      ...warnings,
      ...input.busyBlocks.flatMap((block) => block.warnings ?? [])
    ]),
    ...(input.confidence === undefined ? {} : { confidence: input.confidence })
  };
}

export function createAvailabilityDraftFromTemplate(
  input: CreateAvailabilityDraftFromTemplateInput
): AvailabilityDraft {
  const slots = generateTimeSlots(input.config);
  const warnings = [...(input.warnings ?? [])];

  validateAvailabilityTemplate(input.template);

  if (input.template.weeklyWindows.length === 0) {
    warnings.push("Template contains no weekly availability windows.");
  }

  const templateIntervals = buildTemplateIntervals(input.template, slots);
  const availableSlots = slots
    .filter((slot) => {
      const slotInterval = intervalFromUtcIso(slot.startUtc, slot.endUtc);

      return templateIntervals.some((templateInterval) =>
        intervalContains(templateInterval.interval, slotInterval)
      );
    })
    .map(toAvailabilitySlot);

  for (const window of input.template.weeklyWindows) {
    const matchedAnySlot = slots.some((slot) => {
      const slotInterval = intervalFromUtcIso(slot.startUtc, slot.endUtc);

      return templateIntervals.some(
        (templateInterval) =>
          templateInterval.window === window &&
          intervalContains(templateInterval.interval, slotInterval)
      );
    });

    if (!matchedAnySlot) {
      warnings.push(`${templateWindowLabel(window)} did not include any selectable schedule slot.`);
    }
  }

  if (input.template.weeklyWindows.length > 0 && availableSlots.length === 0) {
    warnings.push("Template did not match any selectable schedule slot.");
  }

  return {
    entryMethod: "template",
    availableSlots,
    busyBlocks: [],
    warnings: uniqueWarnings(warnings)
  };
}

function buildBusyIntervals(
  blocks: readonly ImportedBusyBlock[],
  slots: readonly TimeSlot[],
  warnings: string[]
): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  const scheduleRange = scheduleUtcRange(slots);

  for (const block of blocks) {
    validateBusyBlock(block);

    if (block.localDate !== undefined) {
      intervals.push({
        block,
        interval: busyBlockIntervalForDate(block, block.localDate)
      });
      continue;
    }

    if (block.dayOfWeek === undefined) {
      warnings.push(`${busyBlockLabel(block)} is missing a local date or day of week.`);
      continue;
    }

    if (scheduleRange === undefined) {
      continue;
    }

    intervals.push(...recurringBusyBlockIntervals(block, scheduleRange));
  }

  return intervals;
}

function buildTemplateIntervals(
  template: AvailabilityTemplate,
  slots: readonly TimeSlot[]
): TemplateInterval[] {
  const intervals: TemplateInterval[] = [];
  const scheduleRange = scheduleUtcRange(slots);

  if (scheduleRange === undefined) {
    return intervals;
  }

  const start = scheduleRange.start!.setZone(template.timezone).minus({ days: 1 }).startOf("day");
  const end = scheduleRange.end!.setZone(template.timezone).plus({ days: 1 }).startOf("day");

  for (let day = start; day.toMillis() <= end.toMillis(); day = day.plus({ days: 1 })) {
    const dayOfWeek = toDayOfWeek(day);
    const localDate = toIsoDate(day);

    for (const window of template.weeklyWindows) {
      if (window.dayOfWeek !== dayOfWeek) {
        continue;
      }

      intervals.push({
        interval: templateWindowIntervalForDate(template, window, localDate),
        window
      });
    }
  }

  return intervals;
}

function recurringBusyBlockIntervals(
  block: ImportedBusyBlock,
  scheduleRange: Interval
): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  const start = scheduleRange.start!.setZone(block.timezone).minus({ days: 1 }).startOf("day");
  const end = scheduleRange.end!.setZone(block.timezone).plus({ days: 1 }).startOf("day");

  for (let day = start; day.toMillis() <= end.toMillis(); day = day.plus({ days: 1 })) {
    if (toDayOfWeek(day) !== block.dayOfWeek) {
      continue;
    }

    intervals.push({
      block,
      interval: busyBlockIntervalForDate(block, toIsoDate(day))
    });
  }

  return intervals;
}

function busyBlockIntervalForDate(block: ImportedBusyBlock, localDate: LocalDate): Interval {
  const start = parseLocalDateTime(localDate, block.startTime, block.timezone);
  let end = parseLocalDateTime(localDate, block.endTime, block.timezone);

  if (compareLocalTimes(block.endTime, block.startTime) <= 0) {
    end = end.plus({ days: 1 });
  }

  if (end.toMillis() <= start.toMillis()) {
    fail("INVALID_IMPORT_SOURCE", "Busy block end must be after start.");
  }

  return Interval.fromDateTimes(start.toUTC(), end.toUTC());
}

function templateWindowIntervalForDate(
  template: AvailabilityTemplate,
  window: WeeklyAvailabilityWindow,
  localDate: LocalDate
): Interval {
  const start = parseLocalDateTime(localDate, window.startTime, template.timezone);
  let end = parseLocalDateTime(localDate, window.endTime, template.timezone);

  if (compareLocalTimes(window.endTime, window.startTime) <= 0) {
    end = end.plus({ days: 1 });
  }

  if (end.toMillis() <= start.toMillis()) {
    fail("INVALID_TEMPLATE_SOURCE", "Template window end must be after start.");
  }

  return Interval.fromDateTimes(start.toUTC(), end.toUTC());
}

function scheduleUtcRange(slots: readonly TimeSlot[]): Interval | undefined {
  if (slots.length === 0) {
    return undefined;
  }

  let start = DateTime.fromISO(normalizeUtcIso(slots[0]!.startUtc));
  let end = DateTime.fromISO(normalizeUtcIso(slots[0]!.endUtc));

  for (const slot of slots.slice(1)) {
    const slotStart = DateTime.fromISO(normalizeUtcIso(slot.startUtc));
    const slotEnd = DateTime.fromISO(normalizeUtcIso(slot.endUtc));

    if (slotStart.toMillis() < start.toMillis()) {
      start = slotStart;
    }

    if (slotEnd.toMillis() > end.toMillis()) {
      end = slotEnd;
    }
  }

  return Interval.fromDateTimes(start, end);
}

function intervalFromUtcIso(startUtc: string, endUtc: string): Interval {
  const start = DateTime.fromISO(normalizeUtcIso(startUtc));
  const end = DateTime.fromISO(normalizeUtcIso(endUtc));

  return Interval.fromDateTimes(start, end);
}

function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.overlaps(b);
}

function intervalContains(container: Interval, candidate: Interval): boolean {
  return (
    container.start!.toMillis() <= candidate.start!.toMillis() &&
    container.end!.toMillis() >= candidate.end!.toMillis()
  );
}

function validateAvailabilityTemplate(template: AvailabilityTemplate): void {
  validateTimezone(template.timezone);

  for (const window of template.weeklyWindows) {
    validateTemplateWindow(window);
  }
}

function validateTemplateWindow(window: WeeklyAvailabilityWindow): void {
  validateLocalTime(window.startTime);
  validateLocalTime(window.endTime);

  if (window.startTime === window.endTime) {
    fail("INVALID_TEMPLATE_SOURCE", "Template window start and end time cannot be the same.");
  }

  if (!Number.isInteger(window.dayOfWeek) || window.dayOfWeek < 0 || window.dayOfWeek > 6) {
    fail("INVALID_TEMPLATE_SOURCE", "Template window day of week must be an integer from 0 to 6.");
  }
}

function validateBusyBlock(block: ImportedBusyBlock): void {
  validateTimezone(block.timezone);
  validateLocalTime(block.startTime);
  validateLocalTime(block.endTime);
  validateConfidence(block.confidence);

  if (block.startTime === block.endTime) {
    fail("INVALID_IMPORT_SOURCE", "Busy block start and end time cannot be the same.");
  }

  if (block.localDate !== undefined) {
    parseLocalDate(block.localDate, block.timezone);
  }

  if (
    block.dayOfWeek !== undefined &&
    (!Number.isInteger(block.dayOfWeek) || block.dayOfWeek < 0 || block.dayOfWeek > 6)
  ) {
    fail("INVALID_IMPORT_SOURCE", "Busy block day of week must be an integer from 0 to 6.");
  }
}

function validateConfidence(value: number | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isFinite(value) || value < 0 || value > 1) {
    fail("INVALID_IMPORT_SOURCE", "Confidence must be between 0 and 1.");
  }
}

function validateTimezone(timezone: string): void {
  if (!DateTime.now().setZone(timezone).isValid) {
    fail("INVALID_TIMEZONE", `Unsupported IANA timezone: ${timezone}`);
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
  parseLocalDate(date, timezone);
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

function compareLocalTimes(a: LocalTime, b: LocalTime): number {
  return localTimeToMinutes(a) - localTimeToMinutes(b);
}

function localTimeToMinutes(value: LocalTime): number {
  const match = LOCAL_TIME_PATTERN.exec(value);

  if (match === null) {
    fail("INVALID_LOCAL_TIME", `Invalid local time: ${value}`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function toDayOfWeek(localDay: DateTime): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return (localDay.weekday % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function toIsoDate(value: DateTime): LocalDate {
  const date = value.toISODate();

  if (date === null) {
    fail("INVALID_LOCAL_DATE", "Could not format local date.");
  }

  return date as LocalDate;
}

function toAvailabilitySlot(slot: TimeSlot): AvailabilitySlot {
  return {
    startUtc: slot.startUtc,
    endUtc: slot.endUtc
  };
}

function sortAvailabilitySlots(slots: readonly AvailabilitySlot[]): AvailabilitySlot[] {
  return [...slots].sort((a, b) =>
    normalizeUtcIso(a.startUtc).localeCompare(normalizeUtcIso(b.startUtc))
  );
}

function busyBlockLabel(block: ImportedBusyBlock): string {
  return block.sourceLabel === undefined || block.sourceLabel.trim().length === 0
    ? "Imported busy block"
    : `Imported busy block "${block.sourceLabel.trim()}"`;
}

function templateWindowLabel(window: WeeklyAvailabilityWindow): string {
  return `Template window ${window.dayOfWeek} ${window.startTime}-${window.endTime}`;
}

function uniqueWarnings(warnings: readonly string[]): string[] {
  return Array.from(new Set(warnings.filter((warning) => warning.trim().length > 0)));
}
