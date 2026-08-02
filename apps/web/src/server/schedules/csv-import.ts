import type { ImportedBusyBlockDto } from "@schedule-share/api-client";

import { HttpError } from "../errors";
import { isUploadedFile, readOptionalFormString, readRequiredFormString } from "./import-form-data";
import { parseTextImportBusyBlocks, type TextImportParseOptions } from "./text-import";

export const CSV_IMPORT_MAX_BYTES = 1024 * 1024;
export const CSV_IMPORT_ALLOWED_TYPES = [
  "",
  "application/csv",
  "application/octet-stream",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain"
] as const;
const CSV_FREE_TEXT_DELIMITER_TOKENS: ReadonlyArray<readonly [string, string]> = [
  [",", "__CSV_IMPORT_COMMA__"],
  [";", "__CSV_IMPORT_SEMICOLON__"],
  ["，", "__CSV_IMPORT_FULLWIDTH_COMMA__"],
  ["；", "__CSV_IMPORT_FULLWIDTH_SEMICOLON__"]
];
const BARE_COURSE_PERIOD_CELL_PATTERN =
  /^(?:第\s*)?(?<start>\d{1,2})(?:\s*(?:-|–|—|~|至|到|,|，|、|\/|\bto\b)\s*(?<end>\d{1,2}))?\s*(?:节|periods?)?$/i;
const COURSE_PERIOD_HEADER_ALIASES = [
  "classperiod",
  "classperiods",
  "courseperiod",
  "courseperiods",
  "lesson",
  "lessons",
  "period",
  "periods",
  "课程节次",
  "节次",
  "小节"
] as const;

export interface CsvImportFile {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
}

export interface CsvImportPreviewInput {
  readonly file: CsvImportFile;
  readonly interpretsAs: "busy";
  readonly timezone: string;
}

export interface CsvImportParseResult {
  readonly busyBlocks: readonly ImportedBusyBlockDto[];
  readonly confidence?: number;
  readonly warnings: readonly string[];
}

interface RowOrientedHeader {
  readonly dateIndex: number;
  readonly labelIndex?: number;
  readonly noteIndexes: readonly number[];
  readonly endIndex?: number;
  readonly startIndex?: number;
  readonly timeIndex?: number;
  readonly timeIndexKind?: "course_period" | "time";
}

interface RowOrientedCarryContext {
  readonly date?: string;
  readonly timeRange?: string;
}

interface RowOrientedLineAttempt {
  readonly continuationNote?: string;
  readonly line?: string;
  readonly nextCarryContext: RowOrientedCarryContext;
}

export async function parseCsvImportFormDataFields(
  formData: FormData
): Promise<CsvImportPreviewInput> {
  const method = readRequiredFormString(formData, "method");

  if (method !== "csv_import") {
    throw new HttpError(
      400,
      "UNSUPPORTED_ENTRY_METHOD",
      "Multipart availability preview only supports csv_import."
    );
  }

  const timezone = readRequiredFormString(formData, "timezone");
  const interpretsAs = readOptionalFormString(formData, "interpretsAs") ?? "busy";

  if (timezone.length > 100) {
    throw new HttpError(400, "VALIDATION_ERROR", "Timezone is too long.");
  }

  if (interpretsAs !== "busy") {
    throw new HttpError(400, "VALIDATION_ERROR", "CSV imports must be interpreted as busy.");
  }

  const file = formData.get("file");

  if (!isUploadedFile(file)) {
    throw new HttpError(400, "VALIDATION_ERROR", "CSV file is required.");
  }

  const mimeType = file.type.toLowerCase();
  const filename = file.name || "schedule.csv";

  if (!isAllowedCsvFile(filename, mimeType)) {
    throw new HttpError(415, "IMPORT_UNSUPPORTED_FILE_TYPE", "CSV import supports .csv files.");
  }

  if (file.size <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "CSV file is empty.");
  }

  if (file.size > CSV_IMPORT_MAX_BYTES) {
    throw new HttpError(413, "IMPORT_FILE_TOO_LARGE", "CSV file is too large.");
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

export function parseCsvImportBusyBlocks(
  sourceText: string,
  timezone: string,
  options: TextImportParseOptions = {}
): CsvImportParseResult {
  const rows = parseCsvRows(sourceText).filter((row) => row.some((cell) => cell.trim().length > 0));

  if (rows.length === 0) {
    return {
      busyBlocks: [],
      warnings: [
        "No CSV rows could be parsed from the uploaded file.",
        "No busy time blocks could be parsed from the CSV file."
      ]
    };
  }

  const rowOrientedText = buildRowOrientedText(rows);

  if (rowOrientedText !== undefined) {
    const parsed = parseTextImportBusyBlocks(rowOrientedText, timezone, options);

    return {
      busyBlocks: parsed.busyBlocks.map(withCsvConfidence),
      warnings: csvWarnings(parsed.warnings),
      confidence: csvConfidence(parsed.busyBlocks, parsed.warnings)
    };
  }

  const parsed = parseTextImportBusyBlocks(toTsv(rows), timezone, options);

  return {
    busyBlocks: parsed.busyBlocks.map(withCsvConfidence),
    warnings: csvWarnings(parsed.warnings),
    confidence: csvConfidence(parsed.busyBlocks, parsed.warnings)
  };
}

function parseCsvRows(sourceText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    const nextChar = sourceText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      row.push(cell.trim());
      cell = "";

      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }

      row = [];

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      continue;
    }

    cell += char;
  }

  row.push(cell.trim());

  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function buildRowOrientedText(rows: readonly (readonly string[])[]): string | undefined {
  const header = rows[0];

  if (header === undefined) {
    return undefined;
  }

  const rowHeader = parseRowOrientedHeader(header);

  if (rowHeader === undefined) {
    return undefined;
  }

  const lines: string[] = [];
  let carryContext: RowOrientedCarryContext = {};

  for (const row of rows.slice(1)) {
    const line = buildRowOrientedLine(row, rowHeader, carryContext);
    carryContext = line.nextCarryContext;

    if (line.continuationNote !== undefined) {
      const previousLine = lines.at(-1);

      if (previousLine !== undefined) {
        lines[lines.length - 1] = `${previousLine} ${protectCsvFreeTextCell(
          line.continuationNote
        )}`;
      }

      continue;
    }

    if (line.line !== undefined) {
      lines.push(line.line);
    }
  }

  return lines.length === 0 ? undefined : lines.join("\n");
}

function parseRowOrientedHeader(header: readonly string[]): RowOrientedHeader | undefined {
  const normalizedHeader = header.map(normalizeHeaderCell);
  const timeIndex = findHeaderIndex(normalizedHeader, [
    "period",
    "slot",
    "time",
    "timerange",
    "timeslot",
    "when",
    "时段",
    "时间",
    "时间段",
    "上课时间",
    "排班时间",
    "班次时间",
    "节次"
  ]);
  const startIndex = findHeaderIndex(normalizedHeader, [
    "begin",
    "begins",
    "clockin",
    "from",
    "in",
    "shiftstart",
    "start",
    "startat",
    "starttime",
    "starts",
    "上班",
    "上班时间",
    "开始",
    "开始时间",
    "起始",
    "起始时间"
  ]);
  const endIndex = findHeaderIndex(normalizedHeader, [
    "clockout",
    "end",
    "endat",
    "ends",
    "endtime",
    "finish",
    "finishes",
    "out",
    "shiftend",
    "to",
    "下班",
    "下班时间",
    "截止",
    "截止时间",
    "结束",
    "结束时间"
  ]);
  const dateIndex = findHeaderIndex(normalizedHeader, [
    "date",
    "day",
    "dayofweek",
    "eventdate",
    "classdate",
    "shiftdate",
    "startdate",
    "workdate",
    "week",
    "weekday",
    "日期",
    "工作日期",
    "开始日期",
    "排班日期",
    "上课日期",
    "星期",
    "周几"
  ]);
  const labelIndex = findHeaderIndex(normalizedHeader, [
    "activity",
    "class",
    "course",
    "coursecode",
    "coursename",
    "description",
    "event",
    "label",
    "module",
    "name",
    "notes",
    "shift",
    "subject",
    "summary",
    "task",
    "title",
    "事项",
    "名称",
    "备注",
    "活动",
    "班次",
    "科目",
    "说明",
    "课程",
    "课程代码",
    "课程名称"
  ]);
  const noteIndexes = findHeaderIndexes(normalizedHeader, [
    "comment",
    "comments",
    "detail",
    "details",
    "note",
    "notes",
    "remark",
    "remarks",
    "说明",
    "备注",
    "详情",
    "注意事项"
  ]).filter((noteIndex) => noteIndex !== labelIndex);
  const timeIndexKind =
    timeIndex === undefined
      ? undefined
      : isCoursePeriodHeaderCell(header[timeIndex] ?? "")
        ? "course_period"
        : "time";

  if (
    dateIndex === undefined ||
    ((startIndex === undefined || endIndex === undefined) && timeIndex === undefined)
  ) {
    return undefined;
  }

  return {
    dateIndex,
    ...(endIndex === undefined ? {} : { endIndex }),
    ...(labelIndex === undefined ? {} : { labelIndex }),
    noteIndexes,
    ...(startIndex === undefined ? {} : { startIndex }),
    ...(timeIndex === undefined ? {} : { timeIndex }),
    ...(timeIndexKind === undefined ? {} : { timeIndexKind })
  };
}

function buildRowOrientedLine(
  row: readonly string[],
  header: RowOrientedHeader,
  carryContext: RowOrientedCarryContext
): RowOrientedLineAttempt {
  const explicitDate = row[header.dateIndex]?.trim() || undefined;
  const date = explicitDate ?? carryContext.date;
  const label =
    header.labelIndex === undefined ? undefined : row[header.labelIndex]?.trim() || undefined;
  const note = rowOrientedNoteText(row, header);
  const explicitTimeRange = rowOrientedTimeRangeText(row, header);
  const timeRange = explicitTimeRange ?? carryContext.timeRange;
  const nextCarryContext: RowOrientedCarryContext = {
    ...(date === undefined ? {} : { date }),
    ...(timeRange === undefined ? {} : { timeRange })
  };

  if (
    explicitDate === undefined &&
    explicitTimeRange === undefined &&
    label === undefined &&
    note !== undefined
  ) {
    return {
      continuationNote: note,
      nextCarryContext
    };
  }

  if (date === undefined || date.length === 0 || timeRange === undefined) {
    return {
      nextCarryContext
    };
  }

  return {
    line: [
      date,
      timeRange,
      label === undefined ? label : protectCsvFreeTextCell(label),
      note === undefined ? note : protectCsvFreeTextCell(note)
    ]
      .filter(Boolean)
      .join(" "),
    nextCarryContext
  };
}

function rowOrientedNoteText(
  row: readonly string[],
  header: Pick<RowOrientedHeader, "noteIndexes">
): string | undefined {
  const notes = header.noteIndexes
    .map((index) => row[index]?.trim())
    .filter((note): note is string => note !== undefined && note.length > 0);

  return notes.length === 0 ? undefined : notes.join(" ");
}

function rowOrientedTimeRangeText(
  row: readonly string[],
  header: RowOrientedHeader
): string | undefined {
  if (header.startIndex !== undefined && header.endIndex !== undefined) {
    const start = row[header.startIndex]?.trim();
    const end = row[header.endIndex]?.trim();

    if (start !== undefined && start.length > 0 && end !== undefined && end.length > 0) {
      return `${start}-${end}`;
    }
  }

  if (header.timeIndex === undefined) {
    return undefined;
  }

  const time = row[header.timeIndex]?.trim();

  if (time === undefined || time.length === 0) {
    return undefined;
  }

  return header.timeIndexKind === "course_period"
    ? (normalizeBareCoursePeriodText(time) ?? time)
    : time;
}

function normalizeBareCoursePeriodText(value: string): string | undefined {
  const match = BARE_COURSE_PERIOD_CELL_PATTERN.exec(value.trim());

  if (match?.groups === undefined) {
    return undefined;
  }

  const startPeriod = Number(match.groups.start);
  const endPeriod = match.groups.end === undefined ? startPeriod : Number(match.groups.end);

  if (
    !Number.isInteger(startPeriod) ||
    !Number.isInteger(endPeriod) ||
    startPeriod <= 0 ||
    endPeriod <= 0 ||
    startPeriod > endPeriod
  ) {
    return undefined;
  }

  return startPeriod === endPeriod
    ? `${startPeriod} period`
    : `${startPeriod}-${endPeriod} periods`;
}

function isCoursePeriodHeaderCell(value: string): boolean {
  return COURSE_PERIOD_HEADER_ALIASES.includes(
    normalizeHeaderCell(value) as (typeof COURSE_PERIOD_HEADER_ALIASES)[number]
  );
}

function findHeaderIndex(
  normalizedHeader: readonly string[],
  aliases: readonly string[]
): number | undefined {
  const index = normalizedHeader.findIndex((cell) => aliases.includes(cell));

  return index === -1 ? undefined : index;
}

function findHeaderIndexes(
  normalizedHeader: readonly string[],
  aliases: readonly string[]
): number[] {
  return normalizedHeader.flatMap((cell, index) => (aliases.includes(cell) ? [index] : []));
}

function normalizeHeaderCell(value: string): string {
  return value.toLowerCase().replaceAll(/[\s_()/.-]+/g, "");
}

function toTsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.join("\t")).join("\n");
}

function withCsvConfidence(block: ImportedBusyBlockDto): ImportedBusyBlockDto {
  return {
    ...block,
    ...(block.sourceLabel === undefined
      ? {}
      : { sourceLabel: restoreCsvFreeTextCell(block.sourceLabel) }),
    confidence: Math.max(block.confidence ?? 0, 0.75)
  };
}

function csvConfidence(
  busyBlocks: readonly ImportedBusyBlockDto[],
  warnings: readonly string[]
): number | undefined {
  if (busyBlocks.length === 0) {
    return undefined;
  }

  return warnings.length === 0 ? 0.75 : 0.68;
}

function csvWarnings(warnings: readonly string[]): string[] {
  return warnings.map((warning) => {
    const csvWarning =
      warning === "No busy time blocks could be parsed from the pasted text."
        ? "No busy time blocks could be parsed from the CSV file."
        : warning;

    return restoreCsvFreeTextCell(csvWarning);
  });
}

function protectCsvFreeTextCell(value: string): string {
  const normalizedValue = value.replace(/\r\n|\n|\r/g, " ");

  return CSV_FREE_TEXT_DELIMITER_TOKENS.reduce(
    (result, [delimiter, token]) => result.replaceAll(delimiter, token),
    normalizedValue
  );
}

function restoreCsvFreeTextCell(value: string): string {
  return CSV_FREE_TEXT_DELIMITER_TOKENS.reduce(
    (result, [delimiter, token]) => result.replaceAll(token, delimiter),
    value
  );
}

function isAllowedCsvFile(filename: string, mimeType: string): boolean {
  return (
    filename.toLowerCase().endsWith(".csv") ||
    CSV_IMPORT_ALLOWED_TYPES.includes(mimeType as (typeof CSV_IMPORT_ALLOWED_TYPES)[number])
  );
}
