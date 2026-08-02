import { importedBusyBlockSchema, type ImportedBusyBlockDto } from "@schedule-share/api-client";

import { HttpError } from "../errors";
import { isUploadedFile, readOptionalFormString, readRequiredFormString } from "./import-form-data";

export const ICS_IMPORT_MAX_BYTES = 1024 * 1024;
export const ICS_IMPORT_ALLOWED_TYPES = [
  "",
  "application/ics",
  "application/octet-stream",
  "text/calendar",
  "text/plain"
] as const;

interface ParsedContentLine {
  readonly name: string;
  readonly params: ReadonlyMap<string, string>;
  readonly value: string;
}

interface ParsedIcsDateTime {
  readonly isDateOnly: boolean;
  readonly localDate: string;
  readonly localTime: `${number}:${number}`;
  readonly timezone: string;
}

interface IcsEvent {
  readonly properties: readonly ParsedContentLine[];
}

type IcsDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DailyRecurrenceRule {
  readonly count?: number;
  readonly daysOfWeek?: readonly IcsDayOfWeek[];
  readonly interval: number;
  readonly until?: ParsedIcsDateTime;
}

interface WeeklyRecurrenceRule {
  readonly count?: number;
  readonly daysOfWeek: readonly IcsDayOfWeek[];
  readonly interval: number;
  readonly until?: ParsedIcsDateTime;
}

interface MonthlyByDayRule {
  readonly dayOfWeek: IcsDayOfWeek;
  readonly ordinal?: number;
}

interface MonthlyRecurrenceRule {
  readonly byDayRules: readonly MonthlyByDayRule[];
  readonly bySetPositions?: readonly number[];
  readonly count?: number;
  readonly daysOfMonth: readonly number[];
  readonly interval: number;
  readonly monthsOfYear?: readonly number[];
  readonly until?: ParsedIcsDateTime;
}

interface YearlyRecurrenceRule {
  readonly byDayRules: readonly MonthlyByDayRule[];
  readonly bySetPositions?: readonly number[];
  readonly count?: number;
  readonly daysOfMonth: readonly number[];
  readonly interval: number;
  readonly monthsOfYear: readonly number[];
  readonly until?: ParsedIcsDateTime;
}

type BoundedRecurrenceRule = Pick<
  DailyRecurrenceRule | WeeklyRecurrenceRule | MonthlyRecurrenceRule | YearlyRecurrenceRule,
  "until"
>;

interface ExdateSet {
  readonly dateKeys: ReadonlySet<string>;
  readonly dateTimeKeys: ReadonlySet<string>;
}

interface RdateOccurrence {
  readonly end?: ParsedIcsDateTime;
  readonly start: ParsedIcsDateTime;
}

export interface IcsImportFile {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
}

export interface IcsImportPreviewInput {
  readonly file: IcsImportFile;
  readonly interpretsAs: "busy";
  readonly timezone: string;
}

export interface IcsImportParseResult {
  readonly busyBlocks: readonly ImportedBusyBlockDto[];
  readonly confidence?: number;
  readonly warnings: readonly string[];
}

export interface IcsImportParseOptions {
  readonly maxGeneratedOccurrences?: number;
  readonly scheduleDateRangeEnd?: string;
  readonly scheduleDateRangeStart?: string;
}

const DEFAULT_RECURRING_EVENT_GENERATION_LIMIT = 500;

const WEEKDAY_CODES: ReadonlyMap<string, IcsDayOfWeek> = new Map([
  ["SU", 0],
  ["MO", 1],
  ["TU", 2],
  ["WE", 3],
  ["TH", 4],
  ["FR", 5],
  ["SA", 6]
] as const);
const ALL_ICS_DAYS_OF_WEEK: readonly IcsDayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const WINDOWS_TIMEZONE_ALIASES: ReadonlyMap<string, string> = new Map(
  (
    [
      ["aus eastern standard time", "Australia/Sydney"],
      ["aus eastern daylight time", "Australia/Sydney"],
      ["e. australia standard time", "Australia/Brisbane"],
      ["e. australia daylight time", "Australia/Brisbane"],
      ["tasmania standard time", "Australia/Hobart"],
      ["tasmania daylight time", "Australia/Hobart"],
      ["cen. australia standard time", "Australia/Adelaide"],
      ["cen. australia daylight time", "Australia/Adelaide"],
      ["aus central standard time", "Australia/Darwin"],
      ["w. australia standard time", "Australia/Perth"],
      ["w. australia daylight time", "Australia/Perth"],
      ["china standard time", "Asia/Shanghai"],
      ["singapore standard time", "Asia/Singapore"],
      ["taipei standard time", "Asia/Taipei"],
      ["tokyo standard time", "Asia/Tokyo"],
      ["korea standard time", "Asia/Seoul"],
      ["india standard time", "Asia/Kolkata"],
      ["eastern standard time", "America/New_York"],
      ["eastern daylight time", "America/New_York"],
      ["central standard time", "America/Chicago"],
      ["central daylight time", "America/Chicago"],
      ["mountain standard time", "America/Denver"],
      ["mountain daylight time", "America/Denver"],
      ["us mountain standard time", "America/Phoenix"],
      ["pacific standard time", "America/Los_Angeles"],
      ["pacific daylight time", "America/Los_Angeles"],
      ["alaskan standard time", "America/Anchorage"],
      ["alaskan daylight time", "America/Anchorage"],
      ["hawaiian standard time", "Pacific/Honolulu"],
      ["gmt standard time", "Europe/London"],
      ["w. europe standard time", "Europe/Berlin"],
      ["romance standard time", "Europe/Paris"],
      ["central europe standard time", "Europe/Budapest"],
      ["central european standard time", "Europe/Warsaw"]
    ] as const
  ).map(([alias, iana]) => [normalizeTimezoneAliasKey(alias), iana] as const)
);

export async function parseIcsImportFormDataFields(
  formData: FormData
): Promise<IcsImportPreviewInput> {
  const method = readRequiredFormString(formData, "method");

  if (method !== "ics_import") {
    throw new HttpError(
      400,
      "UNSUPPORTED_ENTRY_METHOD",
      "Multipart availability preview only supports ics_import."
    );
  }

  const timezone = readRequiredFormString(formData, "timezone");
  const interpretsAs = readOptionalFormString(formData, "interpretsAs") ?? "busy";

  if (timezone.length > 100) {
    throw new HttpError(400, "VALIDATION_ERROR", "Timezone is too long.");
  }

  if (interpretsAs !== "busy") {
    throw new HttpError(400, "VALIDATION_ERROR", "ICS imports must be interpreted as busy.");
  }

  const file = formData.get("file");

  if (!isUploadedFile(file)) {
    throw new HttpError(400, "VALIDATION_ERROR", "ICS file is required.");
  }

  const mimeType = file.type.toLowerCase();
  const filename = file.name || "calendar.ics";

  if (!isAllowedIcsFile(filename, mimeType)) {
    throw new HttpError(
      415,
      "IMPORT_UNSUPPORTED_FILE_TYPE",
      "ICS import supports .ics calendar files."
    );
  }

  if (file.size <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "ICS file is empty.");
  }

  if (file.size > ICS_IMPORT_MAX_BYTES) {
    throw new HttpError(413, "IMPORT_FILE_TOO_LARGE", "ICS file is too large.");
  }

  return {
    file: {
      bytes: new Uint8Array(await file.arrayBuffer()),
      filename,
      mimeType,
      size: file.size
    },
    interpretsAs,
    timezone
  };
}

export function parseIcsImportBusyBlocks(
  sourceText: string,
  fallbackTimezone: string,
  options: IcsImportParseOptions = {}
): IcsImportParseResult {
  const lines = unfoldIcsLines(sourceText);
  const events = extractEvents(lines);
  const recurrenceOverrideIndex = buildRecurrenceOverrideIndex(events);
  const freeBusyComponents = extractFreeBusyComponents(lines);
  const busyBlocks: ImportedBusyBlockDto[] = [];
  const warnings: string[] = [];

  if (events.length === 0 && freeBusyComponents.length === 0) {
    warnings.push("No calendar events could be found in the ICS file.");
  }

  for (const event of events) {
    busyBlocks.push(
      ...parseEventBusyBlocks(event, fallbackTimezone, recurrenceOverrideIndex, warnings, options)
    );
  }

  for (const freeBusyComponent of freeBusyComponents) {
    busyBlocks.push(...parseFreeBusyBusyBlocks(freeBusyComponent, fallbackTimezone, warnings));
  }

  if (busyBlocks.length === 0) {
    warnings.push("No busy time blocks could be parsed from the ICS file.");
  }

  return {
    busyBlocks,
    warnings,
    ...(busyBlocks.length === 0 ? {} : { confidence: warnings.length === 0 ? 0.9 : 0.82 })
  };
}

function parseEventBusyBlocks(
  event: IcsEvent,
  fallbackTimezone: string,
  recurrenceOverrideIndex: ReadonlyMap<string, readonly ParsedContentLine[]>,
  warnings: string[],
  options: IcsImportParseOptions
): ImportedBusyBlockDto[] {
  const status = readFirstPropertyValue(event, "STATUS")?.toUpperCase();
  const transparency = readFirstPropertyValue(event, "TRANSP")?.toUpperCase();

  if (status === "CANCELLED" || transparency === "TRANSPARENT") {
    return [];
  }

  const startProperty = readFirstProperty(event, "DTSTART");
  const endProperty = readFirstProperty(event, "DTEND");
  const summary = truncateLabel(unescapeIcsText(readFirstPropertyValue(event, "SUMMARY") ?? ""));

  if (startProperty === undefined) {
    warnings.push(`${eventLabel(summary)} is missing DTSTART.`);
    return [];
  }

  const start = parseIcsDateTime(startProperty, fallbackTimezone, warnings);
  const end =
    endProperty === undefined
      ? inferEndFromMissingEnd(start, readFirstPropertyValue(event, "DURATION"))
      : parseIcsDateTime(endProperty, start.timezone, warnings);

  if (end === undefined) {
    warnings.push(`${eventLabel(summary)} is missing DTEND or a supported DURATION.`);
    return [];
  }

  const recurrence = readFirstPropertyValue(event, "RRULE");
  const dailyRecurrence =
    recurrence === undefined ? undefined : parseDailyRecurrenceRule(recurrence, start, warnings);
  const weeklyRecurrence =
    recurrence === undefined ? undefined : parseWeeklyRecurrenceRule(recurrence, start, warnings);
  const monthlyRecurrence =
    recurrence === undefined ? undefined : parseMonthlyRecurrenceRule(recurrence, start, warnings);
  const yearlyRecurrence =
    recurrence === undefined ? undefined : parseYearlyRecurrenceRule(recurrence, start, warnings);
  const rdateOccurrences = parseRdateOccurrences(event, start.timezone, warnings);
  const recurrenceOverrideExclusions = recurrenceOverridePropertiesForEvent(
    event,
    recurrenceOverrideIndex
  );

  if (dailyRecurrence !== undefined) {
    const exclusions = parseExdateSet(
      event,
      start.timezone,
      warnings,
      recurrenceOverrideExclusions
    );
    const needsDatedOccurrences =
      dailyRecurrence.count !== undefined ||
      dailyRecurrence.until !== undefined ||
      dailyRecurrence.interval !== 1 ||
      hasExdateExclusions(exclusions);

    if (needsDatedOccurrences) {
      const blocks = buildDailyRecurrenceBusyBlocks({
        end,
        exclusions,
        options,
        recurrence: dailyRecurrence,
        sourceLabel: summary,
        start,
        warnings
      });

      if (blocks !== undefined) {
        return appendRdateBusyBlocks(blocks, {
          end,
          exclusions,
          rdateOccurrences,
          sourceLabel: summary,
          start
        });
      }

      warnings.push(
        `${eventLabel(summary)} uses a daily recurrence that needs a date range; only DTSTART was imported.`
      );
      return appendRdateBusyBlocks(
        buildDatedBusyBlocks({
          end,
          sourceLabel: summary,
          start
        }),
        {
          end,
          exclusions,
          rdateOccurrences,
          sourceLabel: summary,
          start
        }
      );
    }

    return appendRdateBusyBlocks(
      (dailyRecurrence.daysOfWeek ?? ALL_ICS_DAYS_OF_WEEK).map((dayOfWeek) =>
        buildBusyBlock({
          dayOfWeek,
          endTime: end.localTime,
          sourceLabel: summary,
          startTime: start.localTime,
          timezone: start.timezone
        })
      ),
      {
        end,
        exclusions,
        rdateOccurrences,
        sourceLabel: summary,
        start
      }
    );
  }

  if (weeklyRecurrence !== undefined) {
    const exclusions = parseExdateSet(
      event,
      start.timezone,
      warnings,
      recurrenceOverrideExclusions
    );
    const needsDatedOccurrences =
      weeklyRecurrence.count !== undefined ||
      weeklyRecurrence.until !== undefined ||
      weeklyRecurrence.interval !== 1 ||
      hasExdateExclusions(exclusions);

    if (needsDatedOccurrences) {
      const blocks = buildWeeklyRecurrenceBusyBlocks({
        end,
        exclusions,
        options,
        recurrence: weeklyRecurrence,
        sourceLabel: summary,
        start,
        warnings
      });

      if (blocks !== undefined) {
        return appendRdateBusyBlocks(blocks, {
          end,
          exclusions,
          rdateOccurrences,
          sourceLabel: summary,
          start
        });
      }

      warnings.push(
        `${eventLabel(summary)} uses a weekly recurrence that needs a date range; only DTSTART was imported.`
      );
      return appendRdateBusyBlocks(
        buildDatedBusyBlocks({
          end,
          sourceLabel: summary,
          start
        }),
        {
          end,
          exclusions,
          rdateOccurrences,
          sourceLabel: summary,
          start
        }
      );
    }

    return appendRdateBusyBlocks(
      weeklyRecurrence.daysOfWeek.map((dayOfWeek) =>
        buildBusyBlock({
          dayOfWeek,
          endTime: end.localTime,
          sourceLabel: summary,
          startTime: start.localTime,
          timezone: start.timezone
        })
      ),
      {
        end,
        exclusions,
        rdateOccurrences,
        sourceLabel: summary,
        start
      }
    );
  }

  if (monthlyRecurrence !== undefined) {
    const exclusions = parseExdateSet(
      event,
      start.timezone,
      warnings,
      recurrenceOverrideExclusions
    );
    const blocks = buildMonthlyRecurrenceBusyBlocks({
      end,
      exclusions,
      options,
      recurrence: monthlyRecurrence,
      sourceLabel: summary,
      start,
      warnings
    });

    if (blocks !== undefined) {
      return appendRdateBusyBlocks(blocks, {
        end,
        exclusions,
        rdateOccurrences,
        sourceLabel: summary,
        start
      });
    }

    warnings.push(
      `${eventLabel(summary)} uses a monthly recurrence that needs a date range; only DTSTART was imported.`
    );
    return appendRdateBusyBlocks(
      buildDatedBusyBlocks({
        end,
        sourceLabel: summary,
        start
      }),
      {
        end,
        exclusions,
        rdateOccurrences,
        sourceLabel: summary,
        start
      }
    );
  }

  if (yearlyRecurrence !== undefined) {
    const exclusions = parseExdateSet(
      event,
      start.timezone,
      warnings,
      recurrenceOverrideExclusions
    );
    const blocks = buildYearlyRecurrenceBusyBlocks({
      end,
      exclusions,
      options,
      recurrence: yearlyRecurrence,
      sourceLabel: summary,
      start,
      warnings
    });

    if (blocks !== undefined) {
      return appendRdateBusyBlocks(blocks, {
        end,
        exclusions,
        rdateOccurrences,
        sourceLabel: summary,
        start
      });
    }

    warnings.push(
      `${eventLabel(summary)} uses a yearly recurrence that needs a date range; only DTSTART was imported.`
    );
    return appendRdateBusyBlocks(
      buildDatedBusyBlocks({
        end,
        sourceLabel: summary,
        start
      }),
      {
        end,
        exclusions,
        rdateOccurrences,
        sourceLabel: summary,
        start
      }
    );
  }

  if (recurrence !== undefined) {
    warnings.push(
      `${eventLabel(summary)} uses an unsupported recurrence rule; only DTSTART was imported.`
    );
  }

  if (rdateOccurrences.length > 0) {
    const exclusions = parseExdateSet(
      event,
      start.timezone,
      warnings,
      recurrenceOverrideExclusions
    );
    const blocks = isExcludedOccurrence(exclusions, start.localDate, start.localTime)
      ? []
      : buildDatedBusyBlocks({
          end,
          sourceLabel: summary,
          start
        });

    return appendRdateBusyBlocks(blocks, {
      end,
      exclusions,
      rdateOccurrences,
      sourceLabel: summary,
      start
    });
  }

  return buildDatedBusyBlocks({
    end,
    sourceLabel: summary,
    start
  });
}

function parseFreeBusyBusyBlocks(
  freeBusyComponent: IcsEvent,
  fallbackTimezone: string,
  warnings: string[]
): ImportedBusyBlockDto[] {
  const sourceLabel =
    truncateLabel(
      unescapeIcsText(
        readFirstPropertyValue(freeBusyComponent, "SUMMARY") ??
          readFirstPropertyValue(freeBusyComponent, "COMMENT") ??
          "Calendar busy"
      )
    ) ?? "Calendar busy";
  const busyBlocks: ImportedBusyBlockDto[] = [];

  for (const property of readProperties(freeBusyComponent, "FREEBUSY")) {
    const fbType = property.params.get("FBTYPE")?.toUpperCase();

    if (fbType === "FREE") {
      continue;
    }

    const periods = property.value
      .split(",")
      .map((period) => period.trim())
      .filter((period) => period.length > 0);

    for (const period of periods) {
      const [startValue, endOrDuration, ...rest] = period.split("/");

      if (
        startValue === undefined ||
        endOrDuration === undefined ||
        rest.length > 0 ||
        startValue.length === 0 ||
        endOrDuration.length === 0
      ) {
        warnings.push(`Unsupported ICS FREEBUSY period "${period}" was ignored.`);
        continue;
      }

      try {
        const start = parseIcsDateTime(
          {
            name: property.name,
            params: property.params,
            value: startValue
          },
          fallbackTimezone,
          warnings
        );
        const end = /^\+?P/i.test(endOrDuration)
          ? inferEndFromDuration(start, endOrDuration)
          : parseIcsDateTime(
              {
                name: property.name,
                params: property.params,
                value: endOrDuration
              },
              start.timezone,
              warnings
            );

        if (end === undefined) {
          warnings.push(`Unsupported ICS FREEBUSY period "${period}" was ignored.`);
          continue;
        }

        busyBlocks.push(
          ...buildDatedBusyBlocks({
            end,
            sourceLabel,
            start
          })
        );
      } catch (error) {
        if (error instanceof HttpError) {
          warnings.push(`Unsupported ICS FREEBUSY period "${period}" was ignored.`);
          continue;
        }

        throw error;
      }
    }
  }

  return busyBlocks;
}

function buildDatedBusyBlocks(input: {
  readonly end: ParsedIcsDateTime;
  readonly sourceLabel: string | undefined;
  readonly start: ParsedIcsDateTime;
}): ImportedBusyBlockDto[] {
  const endsAtStartOfDate =
    !input.end.isDateOnly &&
    input.end.localTime === "00:00" &&
    input.end.localDate > input.start.localDate;
  const endDate = endsAtStartOfDate ? addDays(input.end.localDate, -1) : input.end.localDate;
  const dates =
    input.start.isDateOnly && input.end.isDateOnly
      ? dateRange(input.start.localDate, addDays(input.end.localDate, -1))
      : dateRange(input.start.localDate, endDate);

  if (dates.length === 0) {
    return [];
  }

  if (dates.length === 1) {
    return [
      buildBusyBlock({
        localDate: dates[0]!,
        endTime: input.end.isDateOnly || endsAtStartOfDate ? "23:59" : input.end.localTime,
        sourceLabel: input.sourceLabel,
        startTime: input.start.localTime,
        timezone: input.start.timezone
      })
    ];
  }

  return dates.map((date, index) =>
    buildBusyBlock({
      localDate: date,
      endTime:
        index === dates.length - 1 && !input.end.isDateOnly && !endsAtStartOfDate
          ? input.end.localTime
          : "23:59",
      sourceLabel: input.sourceLabel,
      startTime: index === 0 ? input.start.localTime : "00:00",
      timezone: input.start.timezone
    })
  );
}

function buildBusyBlock(input: {
  readonly dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly endTime: `${number}:${number}`;
  readonly localDate?: string;
  readonly sourceLabel: string | undefined;
  readonly startTime: `${number}:${number}`;
  readonly timezone: string;
}): ImportedBusyBlockDto {
  return importedBusyBlockSchema.parse({
    ...(input.sourceLabel === undefined ? {} : { sourceLabel: input.sourceLabel }),
    ...(input.localDate === undefined ? {} : { localDate: input.localDate }),
    ...(input.dayOfWeek === undefined ? {} : { dayOfWeek: input.dayOfWeek }),
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone,
    confidence: 0.9
  });
}

function unfoldIcsLines(sourceText: string): string[] {
  const lines = sourceText.replace(/^\uFEFF/, "").split(/\r?\n/);
  const unfolded: string[] = [];

  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] = `${unfolded[unfolded.length - 1]}${line.slice(1)}`;
      continue;
    }

    unfolded.push(line.trimEnd());
  }

  return unfolded.filter((line) => line.length > 0);
}

function extractEvents(lines: readonly string[]): IcsEvent[] {
  return extractComponents(lines, "VEVENT");
}

function extractFreeBusyComponents(lines: readonly string[]): IcsEvent[] {
  return extractComponents(lines, "VFREEBUSY");
}

function extractComponents(lines: readonly string[], componentName: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let currentLines: string[] | undefined;
  const beginLine = `BEGIN:${componentName}`;
  const endLine = `END:${componentName}`;

  for (const line of lines) {
    const normalized = line.toUpperCase();

    if (normalized === beginLine) {
      currentLines = [];
      continue;
    }

    if (normalized === endLine) {
      if (currentLines !== undefined) {
        events.push({
          properties: currentLines.map(parseContentLine).filter(isParsedContentLine)
        });
      }

      currentLines = undefined;
      continue;
    }

    currentLines?.push(line);
  }

  return events;
}

function parseContentLine(line: string): ParsedContentLine | undefined {
  const separatorIndex = line.indexOf(":");

  if (separatorIndex <= 0) {
    return undefined;
  }

  const nameAndParams = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [rawName, ...rawParams] = nameAndParams.split(";");
  const name = (rawName?.split(".").pop() ?? "").trim().toUpperCase();
  const params = new Map<string, string>();

  if (name.length === 0) {
    return undefined;
  }

  for (const rawParam of rawParams) {
    const [rawKey, ...rawValueParts] = rawParam.split("=");
    const key = rawKey?.trim().toUpperCase();
    const rawValue = rawValueParts.join("=");

    if (key === undefined || key.length === 0) {
      continue;
    }

    params.set(key, rawValue.replace(/^"|"$/g, ""));
  }

  return {
    name,
    params,
    value
  };
}

function parseIcsDateTime(
  property: ParsedContentLine,
  fallbackTimezone: string,
  warnings: string[]
): ParsedIcsDateTime {
  const value = property.value.trim();
  const isDateOnly =
    property.params.get("VALUE")?.toUpperCase() === "DATE" || /^\d{8}$/.test(value);
  const timezone = normalizeTimezone(property.params.get("TZID"), fallbackTimezone, warnings);

  if (isDateOnly) {
    return {
      isDateOnly: true,
      localDate: parseIcsDate(value),
      localTime: "00:00",
      timezone
    };
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value);

  if (match === null) {
    throw new HttpError(400, "VALIDATION_ERROR", `Unsupported ICS date-time value: ${value}.`);
  }

  if (match[7] === "Z") {
    return {
      isDateOnly: false,
      ...formatUtcDateInTimezone(
        new Date(
          Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
            Number(match[6] ?? "0")
          )
        ),
        timezone
      ),
      timezone
    };
  }

  return {
    isDateOnly: false,
    localDate: `${match[1]}-${match[2]}-${match[3]}`,
    localTime: `${match[4]}:${match[5]}` as `${number}:${number}`,
    timezone
  };
}

function parseIcsDate(value: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);

  if (match === null) {
    throw new HttpError(400, "VALIDATION_ERROR", `Unsupported ICS date value: ${value}.`);
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function inferEndFromDuration(
  start: ParsedIcsDateTime,
  duration: string | undefined
): ParsedIcsDateTime | undefined {
  const minutes = parseDurationMinutes(duration);

  if (minutes === undefined) {
    return undefined;
  }

  const end = addMinutesToLocalDateTime(start.localDate, start.localTime, minutes);

  return {
    isDateOnly: start.isDateOnly,
    localDate: end.localDate,
    localTime: end.localTime,
    timezone: start.timezone
  };
}

function inferEndFromMissingEnd(
  start: ParsedIcsDateTime,
  duration: string | undefined
): ParsedIcsDateTime | undefined {
  const durationEnd = inferEndFromDuration(start, duration);

  if (durationEnd !== undefined || duration !== undefined || !start.isDateOnly) {
    return durationEnd;
  }

  return {
    isDateOnly: true,
    localDate: addDays(start.localDate, 1),
    localTime: "00:00",
    timezone: start.timezone
  };
}

function parseDurationMinutes(duration: string | undefined): number | undefined {
  if (duration === undefined) {
    return undefined;
  }

  const normalizedDuration = duration.trim().toUpperCase();
  const weekMatch = /^\+?P(?<weeks>\d+)W$/.exec(normalizedDuration);

  if (weekMatch?.groups !== undefined) {
    const weeks = Number(weekMatch.groups.weeks);
    const totalMinutes = weeks * 7 * 24 * 60;

    return totalMinutes > 0 ? totalMinutes : undefined;
  }

  const match =
    /^\+?P(?:(?<days>\d+)D)?(?:T(?=.*\d[HMS])(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?)?$/.exec(
      normalizedDuration
    );

  if (match?.groups === undefined) {
    return undefined;
  }

  const days = Number(match.groups.days ?? "0");
  const hours = Number(match.groups.hours ?? "0");
  const minutes = Number(match.groups.minutes ?? "0");
  const seconds = Number(match.groups.seconds ?? "0");
  const totalMinutes = days * 24 * 60 + hours * 60 + minutes + Math.ceil(seconds / 60);

  return totalMinutes > 0 ? totalMinutes : undefined;
}

function parseDailyRecurrenceRule(
  rrule: string,
  start: ParsedIcsDateTime,
  warnings: string[]
): DailyRecurrenceRule | undefined {
  const rule = parseRecurrenceParts(rrule);

  if (rule.get("FREQ") !== "DAILY") {
    return undefined;
  }

  const count = parsePositiveInteger(rule.get("COUNT"));
  const interval = parsePositiveInteger(rule.get("INTERVAL")) ?? 1;
  const until = parseRecurrenceUntil(rule.get("UNTIL"), start, warnings);
  const daysOfWeek = parseDailyRecurrenceDays(rule.get("BYDAY"), warnings);

  if (rule.has("COUNT") && count === undefined) {
    warnings.push("Unsupported ICS RRULE COUNT was ignored.");
  }

  if (rule.has("INTERVAL") && interval === 1 && rule.get("INTERVAL") !== "1") {
    warnings.push("Unsupported ICS RRULE INTERVAL was interpreted as 1.");
  }

  return {
    interval,
    ...(count === undefined ? {} : { count }),
    ...(daysOfWeek === undefined ? {} : { daysOfWeek }),
    ...(until === undefined ? {} : { until })
  };
}

function parseWeeklyRecurrenceRule(
  rrule: string,
  start: ParsedIcsDateTime,
  warnings: string[]
): WeeklyRecurrenceRule | undefined {
  const rule = parseRecurrenceParts(rrule);

  if (rule.get("FREQ") !== "WEEKLY") {
    return undefined;
  }

  const count = parsePositiveInteger(rule.get("COUNT"));
  const interval = parsePositiveInteger(rule.get("INTERVAL")) ?? 1;
  const until = parseRecurrenceUntil(rule.get("UNTIL"), start, warnings);

  if (rule.has("COUNT") && count === undefined) {
    warnings.push("Unsupported ICS RRULE COUNT was ignored.");
  }

  if (rule.has("INTERVAL") && interval === 1 && rule.get("INTERVAL") !== "1") {
    warnings.push("Unsupported ICS RRULE INTERVAL was interpreted as 1.");
  }

  return {
    daysOfWeek: parseWeeklyRecurrenceDays(rule.get("BYDAY"), start.localDate),
    interval,
    ...(count === undefined ? {} : { count }),
    ...(until === undefined ? {} : { until })
  };
}

function parseMonthlyRecurrenceRule(
  rrule: string,
  start: ParsedIcsDateTime,
  warnings: string[]
): MonthlyRecurrenceRule | undefined {
  const rule = parseRecurrenceParts(rrule);

  if (rule.get("FREQ") !== "MONTHLY") {
    return undefined;
  }

  const count = parsePositiveInteger(rule.get("COUNT"));
  const interval = parsePositiveInteger(rule.get("INTERVAL")) ?? 1;
  const until = parseRecurrenceUntil(rule.get("UNTIL"), start, warnings);

  if (rule.has("COUNT") && count === undefined) {
    warnings.push("Unsupported ICS RRULE COUNT was ignored.");
  }

  if (rule.has("INTERVAL") && interval === 1 && rule.get("INTERVAL") !== "1") {
    warnings.push("Unsupported ICS RRULE INTERVAL was interpreted as 1.");
  }

  const byDayRules = parseMonthlyByDayRules(rule.get("BYDAY"), warnings);
  const monthsOfYear = parseMonthlyRecurrenceMonths(rule.get("BYMONTH"), warnings);
  const bySetPositions = parseRecurrenceSetPositions(rule.get("BYSETPOS"), warnings, "monthly");

  return {
    byDayRules,
    ...(bySetPositions === undefined ? {} : { bySetPositions }),
    daysOfMonth: parseMonthlyRecurrenceDays(
      rule.get("BYMONTHDAY"),
      start.localDate,
      byDayRules.length > 0,
      warnings
    ),
    interval,
    ...(monthsOfYear === undefined ? {} : { monthsOfYear }),
    ...(count === undefined ? {} : { count }),
    ...(until === undefined ? {} : { until })
  };
}

function parseYearlyRecurrenceRule(
  rrule: string,
  start: ParsedIcsDateTime,
  warnings: string[]
): YearlyRecurrenceRule | undefined {
  const rule = parseRecurrenceParts(rrule);

  if (rule.get("FREQ") !== "YEARLY") {
    return undefined;
  }

  const count = parsePositiveInteger(rule.get("COUNT"));
  const interval = parsePositiveInteger(rule.get("INTERVAL")) ?? 1;
  const until = parseRecurrenceUntil(rule.get("UNTIL"), start, warnings);

  if (rule.has("COUNT") && count === undefined) {
    warnings.push("Unsupported ICS RRULE COUNT was ignored.");
  }

  if (rule.has("INTERVAL") && interval === 1 && rule.get("INTERVAL") !== "1") {
    warnings.push("Unsupported ICS RRULE INTERVAL was interpreted as 1.");
  }

  const byDayRules = parseMonthlyByDayRules(rule.get("BYDAY"), warnings, "yearly");
  const bySetPositions = parseRecurrenceSetPositions(rule.get("BYSETPOS"), warnings, "yearly");

  return {
    byDayRules,
    ...(bySetPositions === undefined ? {} : { bySetPositions }),
    daysOfMonth: parseYearlyRecurrenceDays(
      rule.get("BYMONTHDAY"),
      start.localDate,
      byDayRules.length > 0,
      warnings
    ),
    interval,
    monthsOfYear: parseYearlyRecurrenceMonths(rule.get("BYMONTH"), start.localDate, warnings),
    ...(count === undefined ? {} : { count }),
    ...(until === undefined ? {} : { until })
  };
}

function parseRecurrenceParts(rrule: string): Map<string, string> {
  return new Map(
    rrule
      .split(";")
      .map((part): [string, string] => {
        const [rawKey, ...rawValueParts] = part.split("=");
        return [rawKey?.trim().toUpperCase() ?? "", rawValueParts.join("=").trim().toUpperCase()];
      })
      .filter((parts): parts is [string, string] => parts[0].length > 0 && parts[1].length > 0)
  );
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseRecurrenceUntil(
  value: string | undefined,
  start: ParsedIcsDateTime,
  warnings: string[]
): ParsedIcsDateTime | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    return parseIcsDateTime(
      {
        name: "UNTIL",
        params: new Map(),
        value
      },
      start.timezone,
      warnings
    );
  } catch (error) {
    if (error instanceof HttpError) {
      warnings.push(`Unsupported ICS RRULE UNTIL "${value}" was ignored.`);
      return undefined;
    }

    throw error;
  }
}

function parseWeeklyRecurrenceDays(byDay: string | undefined, startDate: string): IcsDayOfWeek[] {
  if (byDay === undefined) {
    return [dayOfWeekFromLocalDate(startDate)];
  }

  const days = byDay
    .split(",")
    .map((day) => WEEKDAY_CODES.get(day.replace(/^-?\d+/, "")))
    .filter((day): day is IcsDayOfWeek => day !== undefined);

  return days.length === 0 ? [dayOfWeekFromLocalDate(startDate)] : Array.from(new Set(days));
}

function parseDailyRecurrenceDays(
  byDay: string | undefined,
  warnings: string[]
): IcsDayOfWeek[] | undefined {
  if (byDay === undefined) {
    return undefined;
  }

  const rawDays = byDay
    .split(",")
    .map((day) => day.trim())
    .filter((day) => day.length > 0);
  const days = rawDays
    .map((day) => WEEKDAY_CODES.get(day.replace(/^-?\d+/, "")))
    .filter((day): day is IcsDayOfWeek => day !== undefined);

  if (days.length === 0) {
    warnings.push("Unsupported ICS daily BYDAY was ignored.");
    return [];
  }

  if (days.length < rawDays.length) {
    warnings.push("Some unsupported ICS daily BYDAY values were ignored.");
  }

  return Array.from(new Set(days));
}

function parseMonthlyRecurrenceMonths(
  byMonth: string | undefined,
  warnings: string[]
): number[] | undefined {
  if (byMonth === undefined) {
    return undefined;
  }

  const months = byMonth
    .split(",")
    .map((month) => month.trim())
    .filter((month) => /^\d+$/.test(month))
    .map(Number)
    .filter((month) => month >= 1 && month <= 12);

  if (months.length === 0) {
    warnings.push("Unsupported ICS monthly BYMONTH was ignored.");
    return undefined;
  }

  return [...new Set(months)].sort((a, b) => a - b);
}

function parseMonthlyRecurrenceDays(
  byMonthDay: string | undefined,
  startDate: string,
  hasByDayRules: boolean,
  warnings: string[]
): number[] {
  if (byMonthDay === undefined) {
    return hasByDayRules ? [] : [dayOfMonthFromLocalDate(startDate)];
  }

  const days = byMonthDay
    .split(",")
    .map((day) => day.trim())
    .filter((day) => /^-?\d+$/.test(day))
    .map(Number)
    .filter((day) => day !== 0 && Math.abs(day) <= 31);

  if (days.length === 0) {
    warnings.push("Unsupported ICS monthly BYMONTHDAY was ignored.");
    return hasByDayRules ? [] : [dayOfMonthFromLocalDate(startDate)];
  }

  return [...new Set(days)].sort(
    (a, b) => normalizedMonthDaySortValue(a) - normalizedMonthDaySortValue(b)
  );
}

function parseMonthlyByDayRules(
  byDay: string | undefined,
  warnings: string[],
  frequencyLabel = "monthly"
): MonthlyByDayRule[] {
  if (byDay === undefined) {
    return [];
  }

  const rawRules = byDay
    .split(",")
    .map((day) => day.trim())
    .filter((day) => day.length > 0);
  const parsedRules = rawRules
    .map((day): MonthlyByDayRule | undefined => {
      const match = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(day);

      if (match === null) {
        return undefined;
      }

      const ordinal = match[1] === undefined ? undefined : Number(match[1]);
      const dayOfWeek = WEEKDAY_CODES.get(match[2]!);

      if (
        dayOfWeek === undefined ||
        ordinal === 0 ||
        (ordinal !== undefined && (!Number.isSafeInteger(ordinal) || Math.abs(ordinal) > 5))
      ) {
        return undefined;
      }

      return {
        dayOfWeek,
        ...(ordinal === undefined ? {} : { ordinal })
      };
    })
    .filter((rule): rule is MonthlyByDayRule => rule !== undefined);

  if (parsedRules.length === 0) {
    warnings.push(`Unsupported ICS ${frequencyLabel} BYDAY was ignored.`);
    return [];
  }

  if (parsedRules.length < rawRules.length) {
    warnings.push(`Some unsupported ICS ${frequencyLabel} BYDAY values were ignored.`);
  }

  return Array.from(
    new Map(
      parsedRules.map((rule) => [`${rule.ordinal ?? "all"}:${rule.dayOfWeek}`, rule])
    ).values()
  );
}

function parseRecurrenceSetPositions(
  bySetPos: string | undefined,
  warnings: string[],
  frequencyLabel: "monthly" | "yearly"
): number[] | undefined {
  if (bySetPos === undefined) {
    return undefined;
  }

  const rawPositions = bySetPos
    .split(",")
    .map((position) => position.trim())
    .filter((position) => position.length > 0);
  const positions = rawPositions
    .filter((position) => /^[+-]?\d+$/.test(position))
    .map(Number)
    .filter(
      (position) => position !== 0 && Number.isSafeInteger(position) && Math.abs(position) <= 366
    );

  if (positions.length === 0) {
    warnings.push(`Unsupported ICS ${frequencyLabel} BYSETPOS was ignored.`);
    return undefined;
  }

  if (positions.length < rawPositions.length) {
    warnings.push(`Some unsupported ICS ${frequencyLabel} BYSETPOS values were ignored.`);
  }

  return [...new Set(positions)].sort((a, b) => a - b);
}

function parseYearlyRecurrenceMonths(
  byMonth: string | undefined,
  startDate: string,
  warnings: string[]
): number[] {
  if (byMonth === undefined) {
    return [monthFromLocalDate(startDate)];
  }

  const months = byMonth
    .split(",")
    .map((month) => month.trim())
    .filter((month) => /^\d+$/.test(month))
    .map(Number)
    .filter((month) => month >= 1 && month <= 12);

  if (months.length === 0) {
    warnings.push("Unsupported ICS yearly BYMONTH was ignored.");
    return [monthFromLocalDate(startDate)];
  }

  return [...new Set(months)].sort((a, b) => a - b);
}

function parseYearlyRecurrenceDays(
  byMonthDay: string | undefined,
  startDate: string,
  hasByDayRules: boolean,
  warnings: string[]
): number[] {
  if (byMonthDay === undefined) {
    return hasByDayRules ? [] : [dayOfMonthFromLocalDate(startDate)];
  }

  const days = byMonthDay
    .split(",")
    .map((day) => day.trim())
    .filter((day) => /^-?\d+$/.test(day))
    .map(Number)
    .filter((day) => day !== 0 && Math.abs(day) <= 31);

  if (days.length === 0) {
    warnings.push("Unsupported ICS yearly BYMONTHDAY was ignored.");
    return hasByDayRules ? [] : [dayOfMonthFromLocalDate(startDate)];
  }

  return [...new Set(days)].sort(
    (a, b) => normalizedMonthDaySortValue(a) - normalizedMonthDaySortValue(b)
  );
}

function buildRecurrenceOverrideIndex(
  events: readonly IcsEvent[]
): ReadonlyMap<string, readonly ParsedContentLine[]> {
  const recurrenceIdsByUid = new Map<string, ParsedContentLine[]>();

  for (const event of events) {
    const uid = readFirstPropertyValue(event, "UID")?.trim();
    const recurrenceId = readFirstProperty(event, "RECURRENCE-ID");

    if (uid === undefined || uid.length === 0 || recurrenceId === undefined) {
      continue;
    }

    const recurrenceIds = recurrenceIdsByUid.get(uid) ?? [];
    recurrenceIds.push(recurrenceId);
    recurrenceIdsByUid.set(uid, recurrenceIds);
  }

  return recurrenceIdsByUid;
}

function recurrenceOverridePropertiesForEvent(
  event: IcsEvent,
  recurrenceOverrideIndex: ReadonlyMap<string, readonly ParsedContentLine[]>
): readonly ParsedContentLine[] {
  if (readFirstProperty(event, "RECURRENCE-ID") !== undefined) {
    return [];
  }

  const uid = readFirstPropertyValue(event, "UID")?.trim();

  if (uid === undefined || uid.length === 0) {
    return [];
  }

  return recurrenceOverrideIndex.get(uid) ?? [];
}

function parseExdateSet(
  event: IcsEvent,
  fallbackTimezone: string,
  warnings: string[],
  recurrenceOverrideExclusions: readonly ParsedContentLine[] = []
): ExdateSet {
  const dateKeys = new Set<string>();
  const dateTimeKeys = new Set<string>();
  const exclusionProperties = [
    ...readProperties(event, "EXDATE").map((property) => ({
      property,
      propertyName: "EXDATE"
    })),
    ...recurrenceOverrideExclusions.map((property) => ({
      property,
      propertyName: "RECURRENCE-ID"
    }))
  ];

  for (const { property, propertyName } of exclusionProperties) {
    const values = property.value
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    for (const value of values) {
      try {
        const parsed = parseIcsDateTime(
          {
            name: property.name,
            params: property.params,
            value
          },
          fallbackTimezone,
          warnings
        );

        if (parsed.isDateOnly) {
          dateKeys.add(parsed.localDate);
        } else {
          dateTimeKeys.add(exdateDateTimeKey(parsed));
        }
      } catch (error) {
        if (error instanceof HttpError) {
          warnings.push(`Unsupported ICS ${propertyName} "${value}" was ignored.`);
          continue;
        }

        throw error;
      }
    }
  }

  return {
    dateKeys,
    dateTimeKeys
  };
}

function parseRdateOccurrences(
  event: IcsEvent,
  fallbackTimezone: string,
  warnings: string[]
): RdateOccurrence[] {
  const occurrences: RdateOccurrence[] = [];

  for (const property of readProperties(event, "RDATE")) {
    const values = property.value
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    for (const value of values) {
      try {
        const period = parseRdatePeriodOccurrence(property, value, fallbackTimezone, warnings);

        occurrences.push(
          period ?? {
            start: parseIcsDateTime(
              {
                name: property.name,
                params: property.params,
                value
              },
              fallbackTimezone,
              warnings
            )
          }
        );
      } catch (error) {
        if (error instanceof HttpError) {
          warnings.push(`Unsupported ICS RDATE "${value}" was ignored.`);
          continue;
        }

        throw error;
      }
    }
  }

  return uniqueRdateOccurrences(occurrences);
}

function parseRdatePeriodOccurrence(
  property: ParsedContentLine,
  value: string,
  fallbackTimezone: string,
  warnings: string[]
): RdateOccurrence | undefined {
  if (!value.includes("/")) {
    return undefined;
  }

  const [startValue, endOrDuration, ...rest] = value.split("/");

  if (
    startValue === undefined ||
    endOrDuration === undefined ||
    rest.length > 0 ||
    startValue.length === 0 ||
    endOrDuration.length === 0
  ) {
    throw new HttpError(400, "VALIDATION_ERROR", `Unsupported ICS RDATE period: ${value}.`);
  }

  const start = parseIcsDateTime(
    {
      name: property.name,
      params: property.params,
      value: startValue
    },
    fallbackTimezone,
    warnings
  );
  const end = /^\+?P/i.test(endOrDuration)
    ? inferEndFromDuration(start, endOrDuration)
    : parseIcsDateTime(
        {
          name: property.name,
          params: property.params,
          value: endOrDuration
        },
        start.timezone,
        warnings
      );

  if (end === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", `Unsupported ICS RDATE period: ${value}.`);
  }

  return {
    end,
    start
  };
}

function uniqueRdateOccurrences(occurrences: readonly RdateOccurrence[]): RdateOccurrence[] {
  const seen = new Set<string>();
  const uniqueOccurrences: RdateOccurrence[] = [];

  for (const occurrence of occurrences) {
    const key = [
      occurrence.start.localDate,
      occurrence.start.localTime,
      occurrence.start.timezone,
      occurrence.start.isDateOnly ? "date" : "date-time",
      occurrence.end?.localDate ?? "",
      occurrence.end?.localTime ?? "",
      occurrence.end?.timezone ?? "",
      occurrence.end?.isDateOnly === true ? "date" : "date-time"
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueOccurrences.push(occurrence);
  }

  return uniqueOccurrences;
}

function hasExdateExclusions(exclusions: ExdateSet): boolean {
  return exclusions.dateKeys.size > 0 || exclusions.dateTimeKeys.size > 0;
}

function appendRdateBusyBlocks(
  busyBlocks: readonly ImportedBusyBlockDto[],
  input: {
    readonly end: ParsedIcsDateTime;
    readonly exclusions: ExdateSet;
    readonly rdateOccurrences: readonly RdateOccurrence[];
    readonly sourceLabel: string | undefined;
    readonly start: ParsedIcsDateTime;
  }
): ImportedBusyBlockDto[] {
  if (input.rdateOccurrences.length === 0) {
    return [...busyBlocks];
  }

  return uniqueBusyBlocks([
    ...busyBlocks,
    ...input.rdateOccurrences.flatMap((occurrence) => {
      const localTime = occurrence.start.isDateOnly
        ? input.start.localTime
        : occurrence.start.localTime;

      if (isExcludedOccurrence(input.exclusions, occurrence.start.localDate, localTime)) {
        return [];
      }

      if (occurrence.end !== undefined) {
        return buildDatedBusyBlocks({
          end: occurrence.end,
          sourceLabel: input.sourceLabel,
          start: {
            ...occurrence.start,
            localTime
          }
        });
      }

      return buildRecurringOccurrenceBusyBlocks({
        end: input.end,
        localDate: occurrence.start.localDate,
        localTime,
        sourceLabel: input.sourceLabel,
        start: {
          ...input.start,
          timezone: occurrence.start.timezone
        }
      });
    })
  ]);
}

function uniqueBusyBlocks(busyBlocks: readonly ImportedBusyBlockDto[]): ImportedBusyBlockDto[] {
  const seen = new Set<string>();
  const uniqueBlocks: ImportedBusyBlockDto[] = [];

  for (const block of busyBlocks) {
    const key = [
      block.localDate ?? "",
      block.dayOfWeek?.toString() ?? "",
      block.startTime,
      block.endTime,
      block.timezone,
      block.sourceLabel ?? ""
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueBlocks.push(block);
  }

  return uniqueBlocks;
}

function buildDailyRecurrenceBusyBlocks(input: {
  readonly end: ParsedIcsDateTime;
  readonly exclusions: ExdateSet;
  readonly options: IcsImportParseOptions;
  readonly recurrence: DailyRecurrenceRule;
  readonly sourceLabel: string | undefined;
  readonly start: ParsedIcsDateTime;
  readonly warnings: string[];
}): ImportedBusyBlockDto[] | undefined {
  const upperDate = recurrenceGenerationUpperDate(input.recurrence, input.options);

  if (
    input.recurrence.count === undefined &&
    input.recurrence.until === undefined &&
    upperDate === undefined
  ) {
    return undefined;
  }

  const maxGeneratedOccurrences = Math.max(
    1,
    Math.floor(input.options.maxGeneratedOccurrences ?? DEFAULT_RECURRING_EVENT_GENERATION_LIMIT)
  );
  const lowerDate =
    input.options.scheduleDateRangeStart === undefined
      ? input.start.localDate
      : addDays(input.options.scheduleDateRangeStart, -1);
  const busyBlocks: ImportedBusyBlockDto[] = [];
  let generatedOccurrences = 0;

  for (let date = input.start.localDate; ; date = addDays(date, 1)) {
    if (upperDate !== undefined && date > upperDate) {
      break;
    }

    if (!dateMatchesDailyRecurrence(date, input.start.localDate, input.recurrence)) {
      continue;
    }

    if (isOccurrenceAfterUntil(date, input.start.localTime, input.recurrence.until)) {
      break;
    }

    generatedOccurrences += 1;

    if (generatedOccurrences > maxGeneratedOccurrences) {
      input.warnings.push(
        `Recurring calendar event expansion stopped after ${maxGeneratedOccurrences} occurrences.`
      );
      break;
    }

    if (
      date >= lowerDate &&
      (upperDate === undefined || date <= upperDate) &&
      !isExcludedOccurrence(input.exclusions, date, input.start.localTime)
    ) {
      busyBlocks.push(
        ...buildRecurringOccurrenceBusyBlocks({
          end: input.end,
          localDate: date,
          sourceLabel: input.sourceLabel,
          start: input.start
        })
      );
    }

    if (input.recurrence.count !== undefined && generatedOccurrences >= input.recurrence.count) {
      break;
    }
  }

  return busyBlocks;
}

function buildWeeklyRecurrenceBusyBlocks(input: {
  readonly end: ParsedIcsDateTime;
  readonly exclusions: ExdateSet;
  readonly options: IcsImportParseOptions;
  readonly recurrence: WeeklyRecurrenceRule;
  readonly sourceLabel: string | undefined;
  readonly start: ParsedIcsDateTime;
  readonly warnings: string[];
}): ImportedBusyBlockDto[] | undefined {
  const upperDate = recurrenceGenerationUpperDate(input.recurrence, input.options);

  if (
    input.recurrence.count === undefined &&
    input.recurrence.until === undefined &&
    upperDate === undefined
  ) {
    return undefined;
  }

  const maxGeneratedOccurrences = Math.max(
    1,
    Math.floor(input.options.maxGeneratedOccurrences ?? DEFAULT_RECURRING_EVENT_GENERATION_LIMIT)
  );
  const lowerDate =
    input.options.scheduleDateRangeStart === undefined
      ? input.start.localDate
      : addDays(input.options.scheduleDateRangeStart, -1);
  const busyBlocks: ImportedBusyBlockDto[] = [];
  let generatedOccurrences = 0;

  for (let date = input.start.localDate; ; date = addDays(date, 1)) {
    if (upperDate !== undefined && date > upperDate) {
      break;
    }

    if (!dateMatchesWeeklyRecurrence(date, input.start.localDate, input.recurrence)) {
      continue;
    }

    if (isOccurrenceAfterUntil(date, input.start.localTime, input.recurrence.until)) {
      break;
    }

    generatedOccurrences += 1;

    if (generatedOccurrences > maxGeneratedOccurrences) {
      input.warnings.push(
        `Recurring calendar event expansion stopped after ${maxGeneratedOccurrences} occurrences.`
      );
      break;
    }

    if (
      date >= lowerDate &&
      (upperDate === undefined || date <= upperDate) &&
      !isExcludedOccurrence(input.exclusions, date, input.start.localTime)
    ) {
      busyBlocks.push(
        ...buildRecurringOccurrenceBusyBlocks({
          end: input.end,
          localDate: date,
          sourceLabel: input.sourceLabel,
          start: input.start
        })
      );
    }

    if (input.recurrence.count !== undefined && generatedOccurrences >= input.recurrence.count) {
      break;
    }
  }

  return busyBlocks;
}

function buildMonthlyRecurrenceBusyBlocks(input: {
  readonly end: ParsedIcsDateTime;
  readonly exclusions: ExdateSet;
  readonly options: IcsImportParseOptions;
  readonly recurrence: MonthlyRecurrenceRule;
  readonly sourceLabel: string | undefined;
  readonly start: ParsedIcsDateTime;
  readonly warnings: string[];
}): ImportedBusyBlockDto[] | undefined {
  const upperDate = recurrenceGenerationUpperDate(input.recurrence, input.options);

  if (
    input.recurrence.count === undefined &&
    input.recurrence.until === undefined &&
    upperDate === undefined
  ) {
    return undefined;
  }

  const maxGeneratedOccurrences = Math.max(
    1,
    Math.floor(input.options.maxGeneratedOccurrences ?? DEFAULT_RECURRING_EVENT_GENERATION_LIMIT)
  );
  const lowerDate =
    input.options.scheduleDateRangeStart === undefined
      ? input.start.localDate
      : addDays(input.options.scheduleDateRangeStart, -1);
  const busyBlocks: ImportedBusyBlockDto[] = [];
  let generatedOccurrences = 0;
  let scannedMonths = 0;
  const maxScannedMonths = maxGeneratedOccurrences * 120;

  for (let monthOffset = 0; ; monthOffset += input.recurrence.interval) {
    scannedMonths += 1;

    if (scannedMonths > maxScannedMonths) {
      input.warnings.push(
        `Recurring calendar event expansion stopped after scanning ${maxScannedMonths} months.`
      );
      return busyBlocks;
    }

    const occurrenceDates = monthlyOccurrenceDates(
      input.start.localDate,
      input.recurrence.monthsOfYear,
      input.recurrence.daysOfMonth,
      input.recurrence.byDayRules,
      input.recurrence.bySetPositions,
      monthOffset
    );

    for (const date of occurrenceDates) {
      if (date < input.start.localDate) {
        continue;
      }

      if (upperDate !== undefined && date > upperDate) {
        return busyBlocks;
      }

      if (isOccurrenceAfterUntil(date, input.start.localTime, input.recurrence.until)) {
        return busyBlocks;
      }

      generatedOccurrences += 1;

      if (generatedOccurrences > maxGeneratedOccurrences) {
        input.warnings.push(
          `Recurring calendar event expansion stopped after ${maxGeneratedOccurrences} occurrences.`
        );
        return busyBlocks;
      }

      if (
        date >= lowerDate &&
        !isExcludedOccurrence(input.exclusions, date, input.start.localTime)
      ) {
        busyBlocks.push(
          ...buildRecurringOccurrenceBusyBlocks({
            end: input.end,
            localDate: date,
            sourceLabel: input.sourceLabel,
            start: input.start
          })
        );
      }

      if (input.recurrence.count !== undefined && generatedOccurrences >= input.recurrence.count) {
        return busyBlocks;
      }
    }
  }
}

function buildYearlyRecurrenceBusyBlocks(input: {
  readonly end: ParsedIcsDateTime;
  readonly exclusions: ExdateSet;
  readonly options: IcsImportParseOptions;
  readonly recurrence: YearlyRecurrenceRule;
  readonly sourceLabel: string | undefined;
  readonly start: ParsedIcsDateTime;
  readonly warnings: string[];
}): ImportedBusyBlockDto[] | undefined {
  const upperDate = recurrenceGenerationUpperDate(input.recurrence, input.options);

  if (
    input.recurrence.count === undefined &&
    input.recurrence.until === undefined &&
    upperDate === undefined
  ) {
    return undefined;
  }

  const maxGeneratedOccurrences = Math.max(
    1,
    Math.floor(input.options.maxGeneratedOccurrences ?? DEFAULT_RECURRING_EVENT_GENERATION_LIMIT)
  );
  const lowerDate =
    input.options.scheduleDateRangeStart === undefined
      ? input.start.localDate
      : addDays(input.options.scheduleDateRangeStart, -1);
  const busyBlocks: ImportedBusyBlockDto[] = [];
  let generatedOccurrences = 0;
  let scannedYears = 0;
  const maxScannedYears = maxGeneratedOccurrences * 10;

  for (let yearOffset = 0; ; yearOffset += input.recurrence.interval) {
    scannedYears += 1;

    if (scannedYears > maxScannedYears) {
      input.warnings.push(
        `Recurring calendar event expansion stopped after scanning ${maxScannedYears} years.`
      );
      return busyBlocks;
    }

    const occurrenceDates = yearlyOccurrenceDates(
      input.start.localDate,
      input.recurrence.monthsOfYear,
      input.recurrence.daysOfMonth,
      input.recurrence.byDayRules,
      input.recurrence.bySetPositions,
      yearOffset
    );

    for (const date of occurrenceDates) {
      if (date < input.start.localDate) {
        continue;
      }

      if (upperDate !== undefined && date > upperDate) {
        return busyBlocks;
      }

      if (isOccurrenceAfterUntil(date, input.start.localTime, input.recurrence.until)) {
        return busyBlocks;
      }

      generatedOccurrences += 1;

      if (generatedOccurrences > maxGeneratedOccurrences) {
        input.warnings.push(
          `Recurring calendar event expansion stopped after ${maxGeneratedOccurrences} occurrences.`
        );
        return busyBlocks;
      }

      if (
        date >= lowerDate &&
        !isExcludedOccurrence(input.exclusions, date, input.start.localTime)
      ) {
        busyBlocks.push(
          ...buildRecurringOccurrenceBusyBlocks({
            end: input.end,
            localDate: date,
            sourceLabel: input.sourceLabel,
            start: input.start
          })
        );
      }

      if (input.recurrence.count !== undefined && generatedOccurrences >= input.recurrence.count) {
        return busyBlocks;
      }
    }
  }
}

function buildRecurringOccurrenceBusyBlocks(input: {
  readonly end: ParsedIcsDateTime;
  readonly localDate: string;
  readonly localTime?: `${number}:${number}`;
  readonly sourceLabel: string | undefined;
  readonly start: ParsedIcsDateTime;
}): ImportedBusyBlockDto[] {
  const durationMinutes = localDateTimeDurationMinutes(input.start, input.end);
  const localTime = input.localTime ?? input.start.localTime;
  const end = addMinutesToLocalDateTime(input.localDate, localTime, durationMinutes);

  return buildDatedBusyBlocks({
    end: {
      ...input.end,
      localDate: end.localDate,
      localTime: end.localTime
    },
    sourceLabel: input.sourceLabel,
    start: {
      ...input.start,
      localDate: input.localDate,
      localTime
    }
  });
}

function recurrenceGenerationUpperDate(
  recurrence: BoundedRecurrenceRule,
  options: IcsImportParseOptions
): string | undefined {
  const dates = [
    recurrence.until?.localDate,
    options.scheduleDateRangeEnd === undefined
      ? undefined
      : addDays(options.scheduleDateRangeEnd, 1)
  ].filter((date): date is string => date !== undefined);

  if (dates.length === 0) {
    return undefined;
  }

  return dates.reduce((earliest, date) => (date < earliest ? date : earliest));
}

function monthlyOccurrenceDates(
  startDate: string,
  monthsOfYear: readonly number[] | undefined,
  daysOfMonth: readonly number[],
  byDayRules: readonly MonthlyByDayRule[],
  bySetPositions: readonly number[] | undefined,
  monthOffset: number
): string[] {
  const { month, year } = addMonthOffsetToLocalDate(startDate, monthOffset);

  if (monthsOfYear !== undefined && !monthsOfYear.includes(month)) {
    return [];
  }

  const dates = [
    ...daysOfMonth.map((dayOfMonth) => occurrenceDateFromMonthDay(year, month, dayOfMonth)),
    ...byDayRules.flatMap((rule) => occurrenceDateFromMonthlyByDay(year, month, rule))
  ].filter((date): date is string => date !== undefined);

  return applyRecurrenceSetPositions(Array.from(new Set(dates)).sort(), bySetPositions);
}

function occurrenceDateFromMonthlyByDay(
  year: number,
  month: number,
  rule: MonthlyByDayRule
): string[] {
  const maxDay = daysInMonth(year, month);
  const matchedDates: string[] = [];

  if (rule.ordinal === undefined) {
    for (let day = 1; day <= maxDay; day += 1) {
      const date = formatLocalDate(year, month, day);

      if (dayOfWeekFromLocalDate(date) === rule.dayOfWeek) {
        matchedDates.push(date);
      }
    }

    return matchedDates;
  }

  const step = rule.ordinal > 0 ? 1 : -1;
  let matchedDays = 0;

  for (let day = rule.ordinal > 0 ? 1 : maxDay; day >= 1 && day <= maxDay; day += step) {
    const date = formatLocalDate(year, month, day);

    if (dayOfWeekFromLocalDate(date) !== rule.dayOfWeek) {
      continue;
    }

    matchedDays += 1;

    if (matchedDays === Math.abs(rule.ordinal)) {
      return [date];
    }
  }

  return [];
}

function yearlyOccurrenceDates(
  startDate: string,
  monthsOfYear: readonly number[],
  daysOfMonth: readonly number[],
  byDayRules: readonly MonthlyByDayRule[],
  bySetPositions: readonly number[] | undefined,
  yearOffset: number
): string[] {
  const year = addYearOffsetToLocalDate(startDate, yearOffset);
  const dates = monthsOfYear
    .flatMap((month) => [
      ...daysOfMonth.map((dayOfMonth) => occurrenceDateFromMonthDay(year, month, dayOfMonth)),
      ...byDayRules.flatMap((rule) => occurrenceDateFromMonthlyByDay(year, month, rule))
    ])
    .filter((date): date is string => date !== undefined);

  return applyRecurrenceSetPositions(Array.from(new Set(dates)).sort(), bySetPositions);
}

function applyRecurrenceSetPositions(
  dates: readonly string[],
  bySetPositions: readonly number[] | undefined
): string[] {
  if (bySetPositions === undefined) {
    return [...dates];
  }

  const selectedDates = bySetPositions
    .map((position) => (position > 0 ? dates[position - 1] : dates[dates.length + position]))
    .filter((date): date is string => date !== undefined);

  return Array.from(new Set(selectedDates)).sort();
}

function formatLocalDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function occurrenceDateFromMonthDay(
  year: number,
  month: number,
  dayOfMonth: number
): string | undefined {
  const maxDay = daysInMonth(year, month);
  const normalizedDay = dayOfMonth < 0 ? maxDay + dayOfMonth + 1 : dayOfMonth;

  if (normalizedDay < 1 || normalizedDay > maxDay) {
    return undefined;
  }

  return formatLocalDate(year, month, normalizedDay);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0, 0, 0, 0, 0)).getUTCDate();
}

function normalizedMonthDaySortValue(dayOfMonth: number): number {
  return dayOfMonth < 0 ? 32 + Math.abs(dayOfMonth) : dayOfMonth;
}

function dateMatchesWeeklyRecurrence(
  localDate: string,
  startDate: string,
  recurrence: WeeklyRecurrenceRule
): boolean {
  if (!recurrence.daysOfWeek.includes(dayOfWeekFromLocalDate(localDate))) {
    return false;
  }

  const daysSinceStart = daysBetween(startDate, localDate);

  if (daysSinceStart < 0) {
    return false;
  }

  return Math.floor(daysSinceStart / 7) % recurrence.interval === 0;
}

function dateMatchesDailyRecurrence(
  localDate: string,
  startDate: string,
  recurrence: DailyRecurrenceRule
): boolean {
  const daysSinceStart = daysBetween(startDate, localDate);

  if (daysSinceStart < 0 || daysSinceStart % recurrence.interval !== 0) {
    return false;
  }

  return (
    recurrence.daysOfWeek === undefined ||
    recurrence.daysOfWeek.includes(dayOfWeekFromLocalDate(localDate))
  );
}

function isOccurrenceAfterUntil(
  localDate: string,
  localTime: `${number}:${number}`,
  until: ParsedIcsDateTime | undefined
): boolean {
  if (until === undefined) {
    return false;
  }

  if (until.isDateOnly) {
    return localDate > until.localDate;
  }

  if (localDate !== until.localDate) {
    return localDate > until.localDate;
  }

  return compareLocalTimes(localTime, until.localTime) > 0;
}
function addMonthOffsetToLocalDate(
  localDate: string,
  monthOffset: number
): { readonly month: number; readonly year: number } {
  const [year, month] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + monthOffset, 1, 0, 0, 0, 0));

  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear()
  };
}

function addYearOffsetToLocalDate(localDate: string, yearOffset: number): number {
  const [year] = localDate.split("-").map(Number);

  return year! + yearOffset;
}

function isExcludedOccurrence(
  exclusions: ExdateSet,
  localDate: string,
  localTime: `${number}:${number}`
): boolean {
  return (
    exclusions.dateKeys.has(localDate) || exclusions.dateTimeKeys.has(`${localDate}T${localTime}`)
  );
}

function exdateDateTimeKey(value: ParsedIcsDateTime): string {
  return `${value.localDate}T${value.localTime}`;
}

function localDateTimeDurationMinutes(start: ParsedIcsDateTime, end: ParsedIcsDateTime): number {
  return (
    daysBetween(start.localDate, end.localDate) * 24 * 60 +
    compareLocalTimes(end.localTime, start.localTime)
  );
}

function compareLocalTimes(a: `${number}:${number}`, b: `${number}:${number}`): number {
  return localTimeToMinutes(a) - localTimeToMinutes(b);
}

function localTimeToMinutes(value: `${number}:${number}`): number {
  const [hours, minutes] = value.split(":").map(Number);

  return hours! * 60 + minutes!;
}

function readFirstProperty(event: IcsEvent, name: string): ParsedContentLine | undefined {
  return event.properties.find((property) => property.name === name);
}

function readProperties(event: IcsEvent, name: string): ParsedContentLine[] {
  return event.properties.filter((property) => property.name === name);
}

function readFirstPropertyValue(event: IcsEvent, name: string): string | undefined {
  return readFirstProperty(event, name)?.value.trim();
}

function normalizeTimezone(
  timezone: string | undefined,
  fallbackTimezone: string,
  warnings: string[]
): string {
  if (timezone === undefined || timezone.trim().length === 0) {
    return fallbackTimezone;
  }

  const trimmedTimezone = timezone.trim();

  if (isSupportedTimezone(trimmedTimezone)) {
    return trimmedTimezone;
  }

  const mappedTimezone = WINDOWS_TIMEZONE_ALIASES.get(normalizeTimezoneAliasKey(trimmedTimezone));

  if (mappedTimezone !== undefined && isSupportedTimezone(mappedTimezone)) {
    return mappedTimezone;
  }

  warnings.push(
    `Unsupported ICS timezone "${trimmedTimezone}" was interpreted as ${fallbackTimezone}.`
  );
  return fallbackTimezone;
}

function normalizeTimezoneAliasKey(timezone: string): string {
  return timezone.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

function isSupportedTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function formatUtcDateInTimezone(
  date: Date,
  timezone: string
): Pick<ParsedIcsDateTime, "localDate" | "localTime"> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    localDate: `${values.get("year")}-${values.get("month")}-${values.get("day")}`,
    localTime: `${values.get("hour")}:${values.get("minute")}` as `${number}:${number}`
  };
}

function addMinutesToLocalDateTime(
  localDate: string,
  localTime: `${number}:${number}`,
  minutesToAdd: number
): Pick<ParsedIcsDateTime, "localDate" | "localTime"> {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute! + minutesToAdd, 0, 0));

  return {
    localDate: toUtcLocalDate(date),
    localTime: `${date.getUTCHours().toString().padStart(2, "0")}:${date
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")}` as `${number}:${number}`
  };
}

function dateRange(startDate: string, endDate: string): string[] {
  if (endDate < startDate) {
    return [];
  }

  const dates: string[] = [];

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    dates.push(date);
  }

  return dates;
}

function daysBetween(startDate: string, endDate: string): number {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = Date.UTC(startYear!, startMonth! - 1, startDay!, 0, 0, 0, 0);
  const end = Date.UTC(endYear!, endMonth! - 1, endDay!, 0, 0, 0, 0);

  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function addDays(localDate: string, daysToAdd: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + daysToAdd, 0, 0, 0, 0));

  return toUtcLocalDate(date);
}

function dayOfWeekFromLocalDate(localDate: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [year, month, day] = localDate.split("-").map(Number);

  return new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function dayOfMonthFromLocalDate(localDate: string): number {
  return Number(localDate.split("-")[2]);
}

function monthFromLocalDate(localDate: string): number {
  return Number(localDate.split("-")[1]);
}

function toUtcLocalDate(date: Date): string {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function unescapeIcsText(value: string): string {
  return value
    .replaceAll(/\\n/gi, "\n")
    .replaceAll("\\,", ",")
    .replaceAll("\\;", ";")
    .replaceAll("\\\\", "\\")
    .trim();
}

function truncateLabel(value: string): string | undefined {
  const normalized = value.replaceAll(/\s+/g, " ").trim();

  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.slice(0, 200);
}

function eventLabel(summary: string | undefined): string {
  return summary === undefined ? "Calendar event" : `Calendar event "${summary}"`;
}

function isAllowedIcsFile(filename: string, mimeType: string): boolean {
  return (
    filename.toLowerCase().endsWith(".ics") ||
    ICS_IMPORT_ALLOWED_TYPES.includes(mimeType as (typeof ICS_IMPORT_ALLOWED_TYPES)[number])
  );
}

function isParsedContentLine(line: ParsedContentLine | undefined): line is ParsedContentLine {
  return line !== undefined;
}
