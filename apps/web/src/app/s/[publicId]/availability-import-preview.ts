import type { AvailabilityPreviewResponse, ImportedBusyBlockDto } from "@schedule-share/api-client";

import type { SchedulePageLocale } from "./schedule-page-copy";

export interface PreviewBusyBlockSummary {
  readonly confidenceText?: string;
  readonly dateText: string;
  readonly key: string;
  readonly timeText: string;
  readonly title: string;
  readonly warnings: readonly string[];
}

interface PreviewWarningCopy {
  readonly classPeriodDefault: string;
  readonly classPeriodNeedsClockTimes: (context: string) => string;
  readonly csvNoBusyBlocks: string;
  readonly csvNoRows: string;
  readonly dateContextMissing: (context: string) => string;
  readonly genericMissingDate: string;
  readonly genericOutsideSchedule: string;
  readonly icsNoBusyBlocks: string;
  readonly icsNoEvents: string;
  readonly noBusyBlocksFound: string;
  readonly pastedTextNoBusyBlocks: string;
  readonly outsideSchedule: (context: string) => string;
  readonly templateNoMatch: string;
  readonly templateNoWindows: string;
  readonly templateWindowOutside: (weekday: string, timeRange: string) => string;
  readonly timeRangeMissing: (context: string) => string;
}

interface PreviewCopy {
  readonly busyBlockFallback: (index: number) => string;
  readonly confidenceHigh: (percent: number) => string;
  readonly confidenceLow: (percent: number) => string;
  readonly confidenceMedium: (percent: number) => string;
  readonly dateSeparator: string;
  readonly unknownDate: string;
  readonly warnings: PreviewWarningCopy;
  readonly weekdayLabels: readonly [string, string, string, string, string, string, string];
}

const previewCopy = {
  "zh-CN": {
    busyBlockFallback: (index) => `忙碌时段 ${index + 1}`,
    confidenceHigh: (percent) => `置信度 ${percent}% 高`,
    confidenceLow: (percent) => `置信度 ${percent}% 低`,
    confidenceMedium: (percent) => `置信度 ${percent}% 中`,
    dateSeparator: " · ",
    unknownDate: "日期未识别",
    weekdayLabels: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
    warnings: {
      classPeriodDefault: "课程节次已按默认作息表换算，请确认你的学校节次时间是否一致。",
      classPeriodNeedsClockTimes: (context) => `课程节次需要同时写明具体钟点：${context}`,
      csvNoBusyBlocks: "没有从 CSV 文件中识别到忙碌时间。",
      csvNoRows: "没有从 CSV 文件中读到可用行。",
      dateContextMissing: (context) => `没有找到日期或星期：${context}`,
      genericMissingDate: "有一段忙碌时间缺少日期或星期。",
      genericOutsideSchedule: "有一段忙碌时间不在当前日程可选范围内。",
      icsNoBusyBlocks: "没有从日历文件中识别到忙碌时间。",
      icsNoEvents: "没有从日历文件中找到事件。",
      noBusyBlocksFound: "没有识别到忙碌时间，已先保留全部可用时间。",
      pastedTextNoBusyBlocks: "没有从粘贴内容中识别到忙碌时间。",
      outsideSchedule: (context) => `不在当前日程可选范围内：${context}`,
      templateNoMatch: "模板没有匹配任何当前日程可选时间。",
      templateNoWindows: "模板没有包含每周可用时间。",
      templateWindowOutside: (weekday, timeRange) =>
        `模板窗口 ${weekday} ${timeRange} 不在当前日程可选范围内。`,
      timeRangeMissing: (context) => `没有找到明确时间段：${context}`
    }
  },
  en: {
    busyBlockFallback: (index) => `Busy block ${index + 1}`,
    confidenceHigh: (percent) => `Confidence ${percent}% high`,
    confidenceLow: (percent) => `Confidence ${percent}% low`,
    confidenceMedium: (percent) => `Confidence ${percent}% medium`,
    dateSeparator: " · ",
    unknownDate: "Date not recognized",
    weekdayLabels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    warnings: {
      classPeriodDefault:
        "Class periods were interpreted using the default timetable. Review if your school uses different period times.",
      classPeriodNeedsClockTimes: (context) =>
        `Class periods need explicit clock times: ${context}`,
      csvNoBusyBlocks: "No busy time blocks could be parsed from the CSV file.",
      csvNoRows: "No CSV rows could be parsed from the uploaded file.",
      dateContextMissing: (context) => `Could not find a date or weekday: ${context}`,
      genericMissingDate: "A busy block is missing a date or weekday.",
      genericOutsideSchedule: "A busy block is outside this schedule's selectable range.",
      icsNoBusyBlocks: "No busy time blocks could be parsed from the calendar file.",
      icsNoEvents: "No calendar events could be found in the ICS file.",
      noBusyBlocksFound:
        "No busy blocks were found, so all generated schedule slots remain selected.",
      pastedTextNoBusyBlocks: "No busy time blocks could be parsed from the pasted text.",
      outsideSchedule: (context) => `Outside this schedule's selectable range: ${context}`,
      templateNoMatch: "The template did not match any selectable schedule slot.",
      templateNoWindows: "The template contains no weekly availability windows.",
      templateWindowOutside: (weekday, timeRange) =>
        `Template window ${weekday} ${timeRange} is outside this schedule's selectable range.`,
      timeRangeMissing: (context) => `Could not find a clear time range: ${context}`
    }
  }
} satisfies Record<SchedulePageLocale, PreviewCopy>;

export function buildPreviewBusyBlockSummaries(
  result: AvailabilityPreviewResponse,
  locale: SchedulePageLocale = "zh-CN"
): PreviewBusyBlockSummary[] {
  const copy = previewCopy[locale];

  return result.busyBlocks.map((block, index) => ({
    ...(block.confidence === undefined
      ? {}
      : { confidenceText: previewConfidenceText(block.confidence, locale) }),
    dateText: previewBusyBlockDateText(block, locale),
    key: previewBusyBlockKey(block, index),
    timeText: `${block.startTime}-${block.endTime}`,
    title: block.sourceLabel?.trim() || copy.busyBlockFallback(index),
    warnings: uniqueWarnings(
      (block.warnings ?? []).map((warning) => toUserPreviewWarning(warning, locale))
    )
  }));
}

export function previewConfidenceText(
  confidence: number | undefined,
  locale: SchedulePageLocale = "zh-CN"
): string | undefined {
  if (confidence === undefined) {
    return undefined;
  }

  const percent = Math.round(confidence * 100);
  const copy = previewCopy[locale];

  if (confidence >= 0.85) {
    return copy.confidenceHigh(percent);
  }

  if (confidence >= 0.7) {
    return copy.confidenceMedium(percent);
  }

  return copy.confidenceLow(percent);
}

export function collectPreviewWarnings(
  result: AvailabilityPreviewResponse,
  locale: SchedulePageLocale = "zh-CN"
): string[] {
  return uniqueWarnings(
    [...result.warnings, ...result.busyBlocks.flatMap((block) => block.warnings ?? [])].map(
      (warning) => toUserPreviewWarning(warning, locale)
    )
  );
}

export function toUserPreviewWarning(
  warning: string,
  locale: SchedulePageLocale = "zh-CN"
): string {
  const copy = previewCopy[locale].warnings;
  const weekdayLabels = previewCopy[locale].weekdayLabels;
  const dateContext = /^Could not find a date or weekday in "(.+)"\.$/.exec(warning);

  if (dateContext !== null) {
    return copy.dateContextMissing(dateContext[1]!);
  }

  const timeContext = /^Could not find a time range in "(.+)"\.$/.exec(warning);

  if (timeContext !== null) {
    return copy.timeRangeMissing(timeContext[1]!);
  }

  const classPeriodContext = /^Class periods need explicit clock times in "(.+)"\.$/.exec(warning);

  if (classPeriodContext !== null) {
    return copy.classPeriodNeedsClockTimes(classPeriodContext[1]!);
  }

  if (
    warning ===
    "Class periods were interpreted using the default timetable; review if your school uses different period times."
  ) {
    return copy.classPeriodDefault;
  }

  const missingDateContext =
    /^Imported busy block "(.+)" is missing a local date or day of week\.$/.exec(warning);

  if (missingDateContext !== null) {
    return copy.dateContextMissing(missingDateContext[1]!);
  }

  const outsideScheduleContext =
    /^Imported busy block "(.+)" did not overlap any selectable schedule slot\.$/.exec(warning);

  if (outsideScheduleContext !== null) {
    return copy.outsideSchedule(outsideScheduleContext[1]!);
  }

  if (warning === "Imported busy block is missing a local date or day of week.") {
    return copy.genericMissingDate;
  }

  if (warning === "Imported busy block did not overlap any selectable schedule slot.") {
    return copy.genericOutsideSchedule;
  }

  if (warning === "No busy time blocks could be parsed from the pasted text.") {
    return copy.pastedTextNoBusyBlocks;
  }

  if (warning === "No busy blocks were found; all generated schedule slots remain selected.") {
    return copy.noBusyBlocksFound;
  }

  const templateWindowContext =
    /^Template window ([0-6]) ((?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d) did not include any selectable schedule slot\.$/.exec(
      warning
    );

  if (templateWindowContext !== null) {
    return copy.templateWindowOutside(
      weekdayLabels[Number(templateWindowContext[1]!)] ?? templateWindowContext[1]!,
      templateWindowContext[2]!
    );
  }

  if (warning === "Template contains no weekly availability windows.") {
    return copy.templateNoWindows;
  }

  if (warning === "Template did not match any selectable schedule slot.") {
    return copy.templateNoMatch;
  }

  if (warning === "No CSV rows could be parsed from the uploaded file.") {
    return copy.csvNoRows;
  }

  if (warning === "No busy time blocks could be parsed from the CSV file.") {
    return copy.csvNoBusyBlocks;
  }

  if (warning === "No calendar events could be found in the ICS file.") {
    return copy.icsNoEvents;
  }

  if (warning === "No busy time blocks could be parsed from the ICS file.") {
    return copy.icsNoBusyBlocks;
  }

  return warning;
}

function previewBusyBlockDateText(block: ImportedBusyBlockDto, locale: SchedulePageLocale): string {
  const copy = previewCopy[locale];
  const dateParts = [
    block.localDate === undefined ? undefined : formatLocalDate(block.localDate),
    block.dayOfWeek === undefined ? undefined : copy.weekdayLabels[block.dayOfWeek]
  ].filter((value): value is string => value !== undefined);

  return dateParts.length > 0 ? dateParts.join(copy.dateSeparator) : copy.unknownDate;
}

function formatLocalDate(value: string): string {
  const match = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/.exec(value);

  if (match?.groups === undefined) {
    return value;
  }

  return `${match.groups.year}/${Number(match.groups.month)}/${Number(match.groups.day)}`;
}

function previewBusyBlockKey(block: ImportedBusyBlockDto, index: number): string {
  return [
    index,
    block.sourceLabel ?? "busy",
    block.localDate ?? "",
    block.dayOfWeek ?? "",
    block.startTime,
    block.endTime
  ].join("-");
}

function uniqueWarnings(warnings: readonly string[]): string[] {
  return Array.from(new Set(warnings));
}
