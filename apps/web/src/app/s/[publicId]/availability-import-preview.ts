import type { AvailabilityPreviewResponse, ImportedBusyBlockDto } from "@schedule-share/api-client";

export interface PreviewBusyBlockSummary {
  readonly confidenceText?: string;
  readonly dateText: string;
  readonly key: string;
  readonly timeText: string;
  readonly title: string;
  readonly warnings: readonly string[];
}

const dayOfWeekLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export function buildPreviewBusyBlockSummaries(
  result: AvailabilityPreviewResponse
): PreviewBusyBlockSummary[] {
  return result.busyBlocks.map((block, index) => ({
    ...(block.confidence === undefined
      ? {}
      : { confidenceText: previewConfidenceText(block.confidence) }),
    dateText: previewBusyBlockDateText(block),
    key: previewBusyBlockKey(block, index),
    timeText: `${block.startTime}-${block.endTime}`,
    title: block.sourceLabel?.trim() || `忙碌时段 ${index + 1}`,
    warnings: uniqueWarnings((block.warnings ?? []).map(toUserPreviewWarning))
  }));
}

export function previewConfidenceText(confidence: number | undefined): string | undefined {
  if (confidence === undefined) {
    return undefined;
  }

  const percent = Math.round(confidence * 100);

  if (confidence >= 0.85) {
    return `置信度 ${percent}% 高`;
  }

  if (confidence >= 0.7) {
    return `置信度 ${percent}% 中`;
  }

  return `置信度 ${percent}% 低`;
}

export function collectPreviewWarnings(result: AvailabilityPreviewResponse): string[] {
  return uniqueWarnings(
    [...result.warnings, ...result.busyBlocks.flatMap((block) => block.warnings ?? [])].map(
      toUserPreviewWarning
    )
  );
}

export function toUserPreviewWarning(warning: string): string {
  const dateContext = /^Could not find a date or weekday in "(.+)"\.$/.exec(warning);

  if (dateContext !== null) {
    return `没有找到日期或星期：${dateContext[1]}`;
  }

  const timeContext = /^Could not find a time range in "(.+)"\.$/.exec(warning);

  if (timeContext !== null) {
    return `没有找到明确时间段：${timeContext[1]}`;
  }

  const classPeriodContext = /^Class periods need explicit clock times in "(.+)"\.$/.exec(warning);

  if (classPeriodContext !== null) {
    return `课程节次需要同时写明具体钟点：${classPeriodContext[1]}`;
  }

  if (
    warning ===
    "Class periods were interpreted using the default timetable; review if your school uses different period times."
  ) {
    return "课程节次已按默认作息表换算，请确认你的学校节次时间是否一致。";
  }

  const missingDateContext =
    /^Imported busy block "(.+)" is missing a local date or day of week\.$/.exec(warning);

  if (missingDateContext !== null) {
    return `没有找到日期或星期：${missingDateContext[1]}`;
  }

  const outsideScheduleContext =
    /^Imported busy block "(.+)" did not overlap any selectable schedule slot\.$/.exec(warning);

  if (outsideScheduleContext !== null) {
    return `不在当前日程可选范围内：${outsideScheduleContext[1]}`;
  }

  if (warning === "Imported busy block is missing a local date or day of week.") {
    return "有一段忙碌时间缺少日期或星期。";
  }

  if (warning === "Imported busy block did not overlap any selectable schedule slot.") {
    return "有一段忙碌时间不在当前日程可选范围内。";
  }

  if (warning === "No busy time blocks could be parsed from the pasted text.") {
    return "没有从粘贴内容中识别到忙碌时间。";
  }

  if (warning === "No busy blocks were found; all generated schedule slots remain selected.") {
    return "没有识别到忙碌时间，已先保留全部可用时间。";
  }

  const templateWindowContext =
    /^Template window ([0-6]) ((?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d) did not include any selectable schedule slot\.$/.exec(
      warning
    );

  if (templateWindowContext !== null) {
    return `模板窗口 ${dayOfWeekLabels[Number(templateWindowContext[1])]} ${templateWindowContext[2]} 不在当前日程可选范围内。`;
  }

  if (warning === "Template contains no weekly availability windows.") {
    return "模板没有包含每周可用时间。";
  }

  if (warning === "Template did not match any selectable schedule slot.") {
    return "模板没有匹配任何当前日程可选时间。";
  }

  if (warning === "No CSV rows could be parsed from the uploaded file.") {
    return "没有从 CSV 文件中读到可用行。";
  }

  if (warning === "No busy time blocks could be parsed from the CSV file.") {
    return "没有从 CSV 文件中识别到忙碌时间。";
  }

  if (warning === "No calendar events could be found in the ICS file.") {
    return "没有从日历文件中找到事件。";
  }

  if (warning === "No busy time blocks could be parsed from the ICS file.") {
    return "没有从日历文件中识别到忙碌时间。";
  }

  return warning;
}

function previewBusyBlockDateText(block: ImportedBusyBlockDto): string {
  const dateParts = [
    block.localDate === undefined ? undefined : formatLocalDate(block.localDate),
    block.dayOfWeek === undefined ? undefined : dayOfWeekLabels[block.dayOfWeek]
  ].filter((value): value is string => value !== undefined);

  return dateParts.length > 0 ? dateParts.join(" · ") : "日期未识别";
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
