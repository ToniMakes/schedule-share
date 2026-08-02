import type { ImportedBusyBlockDto } from "@schedule-share/api-client";

const LOCAL_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/;
const DURATION_UNIT_PATTERN = String.raw`hours?|hrs?|hr|h|minutes?|mins?|min|小时|鐘頭|钟头|分钟|分`;
const DATE_WITH_SLASH_PATTERN = new RegExp(
  String.raw`\b(?:(?<year>\d{4})[/.])?(?<month>0?[1-9]|1[0-2])[/.](?<day>0?[1-9]|[12]\d|3[01])\b(?!\s*(?:${DURATION_UNIT_PATTERN})(?![A-Za-z]))`,
  "i"
);
const CHINESE_DATE_PATTERN =
  /(?:(?<year>\d{4})\s*年\s*)?(?<month>0?[1-9]|1[0-2])\s*月\s*(?<day>0?[1-9]|[12]\d|3[01])\s*(?:日|号)?/;
const ENGLISH_MONTH_PATTERN = String.raw`jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?`;
const ENGLISH_MONTH_DATE_PATTERN = new RegExp(
  String.raw`\b(?<monthName>${ENGLISH_MONTH_PATTERN})\.?\s+(?<day>0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?!\s*[:：.点时])(?:,?\s+(?<year>\d{4}))?\b`,
  "i"
);
const ENGLISH_DAY_MONTH_DATE_PATTERN = new RegExp(
  String.raw`\b(?<day>0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?<monthName>${ENGLISH_MONTH_PATTERN})\.?(?:,?\s+(?<year>\d{4}))?\b`,
  "i"
);
const ENGLISH_MONTH_DATE_COMMA_PATTERN = new RegExp(
  String.raw`\b((?:${ENGLISH_MONTH_PATTERN})\.?\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?),\s+(\d{4})\b`,
  "gi"
);
const ENGLISH_DAY_MONTH_DATE_COMMA_PATTERN = new RegExp(
  String.raw`\b((?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?:${ENGLISH_MONTH_PATTERN})\.?),\s+(\d{4})\b`,
  "gi"
);
const ENGLISH_MONTH_DATE_TRAILING_COMMA_PATTERN = new RegExp(
  String.raw`\b((?:${ENGLISH_MONTH_PATTERN})\.?\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?),(?!\s*\d{4}\b)\s+`,
  "gi"
);
const ENGLISH_DAY_MONTH_DATE_TRAILING_COMMA_PATTERN = new RegExp(
  String.raw`\b((?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?:${ENGLISH_MONTH_PATTERN})\.?),(?!\s*\d{4}\b)\s+`,
  "gi"
);
const FREE_TEXT_DATE_COMMA_PLACEHOLDER = "__SCHEDULE_SHARE_DATE_COMMA__";
const MERIDIEM_PATTERN = String.raw`am|pm|a\.m\.|p\.m\.|AM|PM|A\.M\.|P\.M\.|上午|早上|下午|晚上|中午`;
const TIME_WORD_PATTERN = String.raw`noon|midnight`;
const TIME_RANGE_SEPARATOR_PATTERN = String.raw`-|–|—|~|\b[Tt][Oo]\b|\b[Uu]ntil\b|\b[Tt]ill\b|至|到`;
const TIME_RANGE_PATTERN = new RegExp(
  String.raw`(?<!\d)(?:\b(?<startWord>${TIME_WORD_PATTERN})\b|(?<startMeridiemPrefix>${MERIDIEM_PATTERN})?\s*(?<startHour>[01]?\d|2[0-3])(?:(?:[:：.点时](?<startMinute>[0-5]\d))|[点时])?\s*分?\s*(?<startMeridiemSuffix>${MERIDIEM_PATTERN})?)\s*(?:${TIME_RANGE_SEPARATOR_PATTERN})\s*(?:\b(?<endWord>${TIME_WORD_PATTERN})\b|(?<endMeridiemPrefix>${MERIDIEM_PATTERN})?\s*(?<endHour>[01]?\d|2[0-3])(?:(?:[:：.点时](?<endMinute>[0-5]\d))|[点时])?\s*分?\s*(?<endMeridiemSuffix>${MERIDIEM_PATTERN})?)(?!\d)`,
  "gi"
);
const BETWEEN_TIME_RANGE_PATTERN = new RegExp(
  String.raw`\bbetween\s+(?:\b(?<startWord>${TIME_WORD_PATTERN})\b|(?<startMeridiemPrefix>${MERIDIEM_PATTERN})?\s*(?<startHour>[01]?\d|2[0-3])(?:(?:[:：.点时](?<startMinute>[0-5]\d))|[点时])?\s*分?\s*(?<startMeridiemSuffix>${MERIDIEM_PATTERN})?)\s+\band\b\s+(?:\b(?<endWord>${TIME_WORD_PATTERN})\b|(?<endMeridiemPrefix>${MERIDIEM_PATTERN})?\s*(?<endHour>[01]?\d|2[0-3])(?:(?:[:：.点时](?<endMinute>[0-5]\d))|[点时])?\s*分?\s*(?<endMeridiemSuffix>${MERIDIEM_PATTERN})?)(?!\d)`,
  "gi"
);
const TIME_DURATION_PATTERN = new RegExp(
  String.raw`(?<!\d)(?:\b(?<startWord>${TIME_WORD_PATTERN})\b|(?<startMeridiemPrefix>${MERIDIEM_PATTERN})?\s*(?<startHour>[01]?\d|2[0-3])(?:(?:[:：.点时](?<startMinute>[0-5]\d))|[点时])?\s*分?\s*(?<startMeridiemSuffix>${MERIDIEM_PATTERN})?)\s*(?:\bfor\b\s*)?(?<durationValue>\d+(?:\.\d+)?)\s*(?<durationUnit>${DURATION_UNIT_PATTERN})(?:\s*(?:and\s*)?(?<extraDurationValue>\d+(?:\.\d+)?)\s*(?<extraDurationUnit>${DURATION_UNIT_PATTERN}))?`,
  "gi"
);
const COURSE_PERIOD_PATTERN =
  /(?:第\s*)?\d+\s*(?:-|–|—|~|至|到)\s*\d+\s*节|(?:第\s*)?\d+\s*节|\bperiods?\s*\d+(?:\s*(?:-|–|—|~|\bto\b)\s*\d+)?\b|\b\d+(?:\s*(?:-|–|—|~|\bto\b)\s*\d+)?\s*periods?\b/i;
const COURSE_PERIOD_RANGE_PATTERNS = [
  /(?:第\s*)?(?<start>\d{1,2})\s*(?:(?:-|–|—|~|至|到)\s*(?<end>\d{1,2}))?\s*节/gi,
  /\bperiods?\s*(?<start>\d{1,2})(?:\s*(?:-|–|—|~|\bto\b)\s*(?<end>\d{1,2}))?\b/gi,
  /\b(?<start>\d{1,2})(?:\s*(?:-|–|—|~|\bto\b)\s*(?<end>\d{1,2}))?\s*periods?\b/gi
] as const;
const BARE_COURSE_PERIOD_CELL_PATTERN =
  /^(?:第\s*)?(?<start>\d{1,2})(?:\s*(?:-|–|—|~|至|到|,|，|、|\/|\bto\b)\s*(?<end>\d{1,2}))?\s*(?:节|periods?)?$/i;
const DEFAULT_COURSE_PERIOD_WARNING =
  "Class periods were interpreted using the default timetable; review if your school uses different period times.";
const DEFAULT_COURSE_PERIOD_TIMES: ReadonlyMap<
  number,
  {
    readonly endTime: `${number}:${number}`;
    readonly startTime: `${number}:${number}`;
  }
> = new Map([
  [1, { startTime: "08:00", endTime: "08:45" }],
  [2, { startTime: "08:55", endTime: "09:40" }],
  [3, { startTime: "10:00", endTime: "10:45" }],
  [4, { startTime: "10:55", endTime: "11:40" }],
  [5, { startTime: "13:30", endTime: "14:15" }],
  [6, { startTime: "14:25", endTime: "15:10" }],
  [7, { startTime: "15:30", endTime: "16:15" }],
  [8, { startTime: "16:25", endTime: "17:10" }],
  [9, { startTime: "18:30", endTime: "19:15" }],
  [10, { startTime: "19:25", endTime: "20:10" }],
  [11, { startTime: "20:20", endTime: "21:05" }],
  [12, { startTime: "21:15", endTime: "22:00" }]
] as const);
const COURSE_PERIOD_DEFINITION_RESIDUE_PATTERN =
  /^(?:class|periods?|timetable|schedule|times?|节次|时间|上课时间|作息表?|课程节次|默认作息表|\s)*$/i;
const STANDALONE_TIME_PATTERN = new RegExp(
  String.raw`^(?:${TIME_WORD_PATTERN}|(?:${MERIDIEM_PATTERN})?\s*(?:[01]?\d|2[0-3])(?:(?:[:：.点时][0-5]\d)|[点时])?\s*分?\s*(?:${MERIDIEM_PATTERN})?)$`,
  "i"
);
const DATE_HEADER_ALIASES = [
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
] as const;
const TIME_COLUMN_HEADER_ALIASES = [
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
] as const;
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
const START_HEADER_ALIASES = [
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
] as const;
const END_HEADER_ALIASES = [
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
] as const;
const LABEL_HEADER_ALIASES = [
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
] as const;
const NOTE_HEADER_ALIASES = [
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
] as const;
const IGNORABLE_IMPORT_NOTE_PATTERNS = [
  /^(?:generated|exported|created|printed|downloaded)\s+(?:by|on|at|from)\b/i,
  /^(?:last\s+)?(?:updated|modified)\s+(?:by|on|at)\b/i,
  /^(?:page|p\.)\s*\d+(?:\s*(?:of|\/)\s*\d+)?$/i,
  /^(?:grand\s+total|subtotal|total)\b/i,
  /^(?:schedule|roster|timetable|calendar)\s*(?:[-:：]\s*)?(?:for\s+)?(?:week|term|semester|month)\b.*$/i,
  /^(?:class|course|shift|staff|employee)\s+(?:schedule|roster|timetable|calendar)\b.*$/i,
  /^(?:week|term|semester|month)\s+\d+\b.*$/i,
  /^(?:summary|overview)\b(?:\s*[:：-]\s*.*)?$/i,
  /^(?:notes?|remarks?|source|disclaimer)\s*:/i,
  /^(?:roster|schedule|timetable)\s+(?:export|report)$/i,
  /^(?:由.+)?(?:导出|生成|打印|下载)(?:于|自|时间|日期)?\b/,
  /^(?:最后)?(?:更新|修改)(?:于|时间|日期)?\b/,
  /^第\s*\d+\s*页(?:\s*\/\s*共\s*\d+\s*页)?$/,
  /^(?:共\s*\d+\s*页|总计|合计|小计)\b/,
  /^(?:第\s*\d+\s*周|周次|学期|月份|汇总|概览)\b/,
  /^(?:说明|备注|注|来源|免责声明)\s*[:：]/
] as const;
const FREE_TEXT_LIST_PREFIX_PATTERN = /^(?:[-*•·]\s+|\d{1,3}\s*[.)、]\s+|[a-z]\s*[.)]\s+)/i;
const FREE_TEXT_STATUS_PREFIX_PATTERN =
  /^(?:(?:busy|blocked|unavailable|not\s+available|occupied|conflict)\s*[:：-]\s*|(?:忙碌|忙|没空|不可用|冲突)\s*[:：-]\s*)/i;

const DAY_ALIASES: ReadonlyArray<{
  readonly dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly aliases: readonly string[];
}> = [
  {
    dayOfWeek: 0,
    aliases: ["sun", "sunday", "周日", "周天", "星期日", "星期天", "礼拜日", "礼拜天"]
  },
  {
    dayOfWeek: 1,
    aliases: ["mon", "monday", "周一", "星期一", "礼拜一"]
  },
  {
    dayOfWeek: 2,
    aliases: ["tue", "tues", "tuesday", "周二", "星期二", "礼拜二"]
  },
  {
    dayOfWeek: 3,
    aliases: ["wed", "wednesday", "周三", "星期三", "礼拜三"]
  },
  {
    dayOfWeek: 4,
    aliases: ["thu", "thur", "thurs", "thursday", "周四", "星期四", "礼拜四"]
  },
  {
    dayOfWeek: 5,
    aliases: ["fri", "friday", "周五", "星期五", "礼拜五"]
  },
  {
    dayOfWeek: 6,
    aliases: ["sat", "saturday", "周六", "星期六", "礼拜六"]
  }
];

export interface TextImportParseResult {
  readonly busyBlocks: readonly ImportedBusyBlockDto[];
  readonly confidence?: number;
  readonly warnings: readonly string[];
}

export interface TextImportParseOptions {
  readonly defaultYear?: number;
}

interface CoursePeriodTime {
  readonly endTime: `${number}:${number}`;
  readonly startTime: `${number}:${number}`;
}

type CoursePeriodTimeMap = ReadonlyMap<number, CoursePeriodTime>;

export function parseTextImportBusyBlocks(
  sourceText: string,
  timezone: string,
  options: TextImportParseOptions = {}
): TextImportParseResult {
  const extractedCoursePeriods = extractCoursePeriodTimetable(sourceText, options.defaultYear);
  const parsedTables = parsePastedTables(
    extractedCoursePeriods.remainingText,
    timezone,
    options,
    extractedCoursePeriods.coursePeriodTimes
  );
  const chunks = parsedTables.remainingText
    .split(/\r?\n/)
    .flatMap((line) =>
      isIgnorableImportNoteText(line)
        ? []
        : splitFreeTextChunks(line, options.defaultYear, extractedCoursePeriods.coursePeriodTimes)
    )
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
  const busyBlocks: ImportedBusyBlockDto[] = [...parsedTables.busyBlocks];
  const warnings: string[] = [...parsedTables.warnings];
  let previousContext: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate"> | undefined;

  for (const rawChunk of chunks) {
    const chunk = normalizeFreeTextChunk(rawChunk);
    const timeRanges = findTimeRanges(chunk, extractedCoursePeriods.coursePeriodTimes);

    if (timeRanges.length === 0) {
      if (isIgnorableImportNoteText(chunk)) {
        continue;
      }

      warnings.push(timeRangeWarning(chunk));
      continue;
    }

    const context = findDateContext(chunk, options.defaultYear) ?? previousContext;

    if (
      context === undefined ||
      (context.localDate === undefined && context.dayOfWeek === undefined)
    ) {
      warnings.push(`Could not find a date or weekday in "${chunk}".`);
      continue;
    }

    previousContext = context;
    pushDefaultCoursePeriodWarning(timeRanges, warnings);

    for (const timeRange of timeRanges) {
      busyBlocks.push({
        sourceLabel: timeRanges.length === 1 ? chunk : `${chunk} (${timeRange.label})`,
        ...context,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        timezone,
        confidence: 0.65
      });
    }
  }

  if (busyBlocks.length === 0) {
    warnings.push("No busy time blocks could be parsed from the pasted text.");
  }

  const confidence =
    busyBlocks.length === 0
      ? undefined
      : Math.min(...busyBlocks.map((block) => block.confidence ?? 0.65));

  return {
    busyBlocks,
    warnings,
    ...(confidence === undefined ? {} : { confidence })
  };
}

interface PastedTableParseResult {
  readonly busyBlocks: readonly ImportedBusyBlockDto[];
  readonly remainingText: string;
  readonly warnings: readonly string[];
}

interface ParsedTableBlock {
  readonly busyBlocks: readonly ImportedBusyBlockDto[];
  readonly recognized: boolean;
  readonly warnings: readonly string[];
}

interface TableColumnContext {
  readonly context: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate">;
  readonly header: string;
  readonly headerIndex: number;
  readonly headerTimeRanges: readonly ParsedTimeRange[];
  readonly timeColumnKind?: TimeColumnKind;
  readonly timeColumnIndex?: number;
}

type TimeColumnKind = "course_period" | "time";

interface SplitHeaderTimeRanges {
  readonly rowIndexes: ReadonlySet<number>;
  readonly timeRangesByColumn: ReadonlyMap<number, readonly ParsedTimeRange[]>;
}

interface RowOrientedHeader {
  readonly dateIndex: number;
  readonly labelIndex?: number;
  readonly noteIndexes: readonly number[];
  readonly endIndex?: number;
  readonly startIndex?: number;
  readonly timeIndex?: number;
  readonly timeIndexKind?: TimeColumnKind;
}

interface RowOrientedCarryContext {
  readonly date?: string;
  readonly timeRange?: ParsedTimeRange;
}

interface RowOrientedParseAttempt {
  readonly block?: ImportedBusyBlockDto;
  readonly continuationNote?: string;
  readonly nextCarryContext: RowOrientedCarryContext;
  readonly shouldWarn: boolean;
  readonly usedDefaultCoursePeriodTimes?: boolean;
}

interface ParsedTimeRange {
  readonly endTime: `${number}:${number}`;
  readonly label: string;
  readonly startTime: `${number}:${number}`;
  readonly usesDefaultCoursePeriodTimes?: boolean;
}

interface IndexedParsedTimeRange extends ParsedTimeRange {
  readonly endIndex: number;
  readonly index: number;
}

interface CoursePeriodMatch {
  readonly endIndex: number;
  readonly endPeriod: number;
  readonly index: number;
  readonly label: string;
  readonly startPeriod: number;
}

interface CoursePeriodTimeLookup {
  readonly time: CoursePeriodTime;
  readonly usesDefaultCoursePeriodTimes: boolean;
}

interface CoursePeriodTimeDefinition {
  readonly endTime: `${number}:${number}`;
  readonly period: number;
  readonly startTime: `${number}:${number}`;
}

interface ExtractedCoursePeriodTimetable {
  readonly coursePeriodTimes: CoursePeriodTimeMap;
  readonly remainingText: string;
}

function extractCoursePeriodTimetable(
  sourceText: string,
  defaultYear: number | undefined
): ExtractedCoursePeriodTimetable {
  const coursePeriodTimes = new Map<number, CoursePeriodTime>();
  const remainingLines: string[] = [];

  for (const line of sourceText.split(/\r?\n/)) {
    const definition = parseCoursePeriodTimeDefinitionLine(line, defaultYear);

    if (definition === undefined) {
      remainingLines.push(line);
      continue;
    }

    coursePeriodTimes.set(definition.period, {
      startTime: definition.startTime,
      endTime: definition.endTime
    });
  }

  return {
    coursePeriodTimes,
    remainingText: remainingLines.join("\n")
  };
}

function parseCoursePeriodTimeDefinitionLine(
  line: string,
  defaultYear: number | undefined
): CoursePeriodTimeDefinition | undefined {
  const text = line.trim();

  if (text.length === 0 || findDateContext(text, defaultYear) !== undefined) {
    return undefined;
  }

  const timeRanges = findExplicitTimeRanges(stripDateTextForTimeSearch(text));

  if (timeRanges.length !== 1) {
    return undefined;
  }

  const timeRange = timeRanges[0]!;
  const explicitPeriodMatches = findCoursePeriodMatches(text);
  const periodMatches = (
    explicitPeriodMatches.length === 0
      ? findBareCoursePeriodDefinitionMatches(text, timeRange)
      : explicitPeriodMatches
  ).filter((match) => match.startPeriod === match.endPeriod);

  if (periodMatches.length !== 1) {
    return undefined;
  }

  const periodMatch = periodMatches[0]!;

  if (rangesOverlap(periodMatch.index, periodMatch.endIndex, timeRange.index, timeRange.endIndex)) {
    return undefined;
  }

  const residue = normalizeCoursePeriodDefinitionResidue(
    removeTextRanges(text, [periodMatch, timeRange])
  );

  if (residue.length > 0 && !COURSE_PERIOD_DEFINITION_RESIDUE_PATTERN.test(residue)) {
    return undefined;
  }

  return {
    period: periodMatch.startPeriod,
    startTime: timeRange.startTime,
    endTime: timeRange.endTime
  };
}

function findBareCoursePeriodDefinitionMatches(
  text: string,
  timeRange: IndexedParsedTimeRange
): CoursePeriodMatch[] {
  return Array.from(text.matchAll(/\b(?<start>\d{1,2})\b/g))
    .map((match) => {
      if (match.groups === undefined) {
        return undefined;
      }

      const index = match.index ?? 0;
      const endIndex = index + match[0].length;

      if (rangesOverlap(index, endIndex, timeRange.index, timeRange.endIndex)) {
        return undefined;
      }

      const period = Number(match.groups.start);

      if (!Number.isInteger(period) || period <= 0) {
        return undefined;
      }

      return {
        index,
        endIndex,
        startPeriod: period,
        endPeriod: period,
        label: match[0].trim()
      };
    })
    .filter((match): match is CoursePeriodMatch => match !== undefined);
}

function normalizeCoursePeriodDefinitionResidue(value: string): string {
  return value
    .replace(/[|,，;；:：()[\]{}_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function removeTextRanges(
  value: string,
  ranges: readonly {
    readonly endIndex: number;
    readonly index: number;
  }[]
): string {
  return [...ranges]
    .sort((left, right) => right.index - left.index)
    .reduce(
      (result, range) => `${result.slice(0, range.index)} ${result.slice(range.endIndex)}`,
      value
    );
}

function parsePastedTables(
  sourceText: string,
  timezone: string,
  options: TextImportParseOptions,
  coursePeriodTimes: CoursePeriodTimeMap
): PastedTableParseResult {
  const lines = sourceText.split(/\r?\n/);
  const consumedLineIndexes = new Set<number>();
  const busyBlocks: ImportedBusyBlockDto[] = [];
  const warnings: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (consumedLineIndexes.has(index) || !isTableLine(lines[index] ?? "")) {
      continue;
    }

    const tableLines: string[] = [];
    const tableLineIndexes: number[] = [];
    let cursor = index;

    while (cursor < lines.length && isTableLine(lines[cursor] ?? "")) {
      tableLines.push(lines[cursor] ?? "");
      tableLineIndexes.push(cursor);
      cursor += 1;
    }

    if (tableLines.length < 2) {
      continue;
    }

    const parsedTable = parsePastedTableBlock(tableLines, timezone, options, coursePeriodTimes);

    if (
      !parsedTable.recognized ||
      (parsedTable.busyBlocks.length === 0 && !tableLinesHaveKnownHeader(tableLines))
    ) {
      continue;
    }

    for (const lineIndex of tableLineIndexes) {
      consumedLineIndexes.add(lineIndex);
    }

    busyBlocks.push(...parsedTable.busyBlocks);
    warnings.push(...parsedTable.warnings);
    index = cursor - 1;
  }

  return {
    busyBlocks,
    remainingText: lines.filter((_, index) => !consumedLineIndexes.has(index)).join("\n"),
    warnings
  };
}

function parsePastedTableBlock(
  lines: readonly string[],
  timezone: string,
  options: TextImportParseOptions,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTableBlock {
  const rows = lines
    .map((line) => splitTableCells(line))
    .filter((cells): cells is string[] => cells !== undefined && !isMarkdownSeparatorRow(cells));

  return parsePastedTableRows(rows, timezone, options, coursePeriodTimes);
}

function tableLinesHaveKnownHeader(lines: readonly string[]): boolean {
  return lines.some((line) => splitTableCells(line)?.some((cell) => isKnownTableHeaderCell(cell)));
}

function parsePastedTableRows(
  rows: readonly (readonly string[])[],
  timezone: string,
  options: TextImportParseOptions,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTableBlock {
  const rowOriented = parseRowOrientedTableRows(rows, timezone, options, coursePeriodTimes);

  if (rowOriented.recognized) {
    return rowOriented;
  }

  return parseColumnOrientedTableRows(rows, timezone, options, coursePeriodTimes);
}

function parseColumnOrientedTableRows(
  rows: readonly (readonly string[])[],
  timezone: string,
  options: TextImportParseOptions,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTableBlock {
  if (rows.length < 2) {
    return {
      busyBlocks: [],
      recognized: false,
      warnings: []
    };
  }

  const candidates: ParsedTableBlock[] = [];
  const maxHeaderStartIndex = Math.min(2, rows.length - 2);

  for (let headerStartIndex = 0; headerStartIndex <= maxHeaderStartIndex; headerStartIndex += 1) {
    const maxHeaderRowCount = Math.min(4, rows.length - headerStartIndex - 1);

    for (let headerRowCount = 1; headerRowCount <= maxHeaderRowCount; headerRowCount += 1) {
      const headerRows = rows.slice(headerStartIndex, headerStartIndex + headerRowCount);
      const dataRows = rows.slice(headerStartIndex + headerRowCount);
      const parsedTable = parseColumnOrientedTableCandidate(
        headerRows,
        dataRows,
        timezone,
        options,
        coursePeriodTimes
      );

      if (parsedTable.recognized) {
        candidates.push(parsedTable);
      }
    }
  }

  const bestCandidate = candidates.sort(compareParsedTableCandidates)[0];

  return (
    bestCandidate ?? {
      busyBlocks: [],
      recognized: false,
      warnings: []
    }
  );
}

function parseColumnOrientedTableCandidate(
  headerRows: readonly (readonly string[])[],
  dataRows: readonly (readonly string[])[],
  timezone: string,
  options: TextImportParseOptions,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTableBlock {
  if (headerRows.length === 0 || dataRows.length === 0) {
    return {
      busyBlocks: [],
      recognized: false,
      warnings: []
    };
  }

  const columnContexts = buildTableColumnContexts(
    headerRows,
    options.defaultYear,
    coursePeriodTimes
  );

  if (columnContexts.length === 0) {
    return {
      busyBlocks: [],
      recognized: false,
      warnings: []
    };
  }

  const firstContextColumnIndex = columnContexts[0]?.headerIndex ?? 0;
  const busyBlocks: ImportedBusyBlockDto[] = [];
  const warnings: string[] = [];

  for (const row of dataRows) {
    if (isIgnorableTableRow(row)) {
      continue;
    }

    const rowTimeContext = findTableRowTimeContext(row, firstContextColumnIndex, coursePeriodTimes);
    let warnedForRow = false;

    for (const columnContext of columnContexts) {
      const cellIndex =
        columnContext.headerIndex +
        (columnContext.timeColumnIndex === undefined ? rowTimeContext.cellIndexOffset : 0);
      const cell = row[cellIndex]?.trim() ?? "";

      if (isEmptyScheduleCell(cell)) {
        continue;
      }

      const timeRanges = findColumnTimeRanges(
        row,
        columnContext,
        rowTimeContext,
        coursePeriodTimes
      );

      if (timeRanges.length === 0) {
        if (!warnedForRow) {
          warnings.push(timeRangeWarning(row.join(" ")));
          warnedForRow = true;
        }

        continue;
      }

      pushDefaultCoursePeriodWarning(timeRanges, warnings);

      for (const timeRange of timeRanges) {
        busyBlocks.push({
          sourceLabel: `${cell} (${columnContext.header} ${timeRange.label})`,
          ...columnContext.context,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime,
          timezone,
          confidence: 0.7
        });
      }
    }
  }

  return {
    busyBlocks,
    recognized: true,
    warnings
  };
}

function findColumnTimeRanges(
  row: readonly string[],
  columnContext: TableColumnContext,
  rowTimeContext: {
    readonly timeRanges: readonly ParsedTimeRange[];
  },
  coursePeriodTimes: CoursePeriodTimeMap
): readonly ParsedTimeRange[] {
  if (columnContext.headerTimeRanges.length > 0) {
    return columnContext.headerTimeRanges;
  }

  if (columnContext.timeColumnIndex === undefined) {
    return rowTimeContext.timeRanges;
  }

  return findTimeRangesForTimeColumn(
    row[columnContext.timeColumnIndex] ?? "",
    columnContext.timeColumnKind,
    coursePeriodTimes
  );
}

function compareParsedTableCandidates(left: ParsedTableBlock, right: ParsedTableBlock): number {
  const leftScore = tableCandidateScore(left);
  const rightScore = tableCandidateScore(right);

  return rightScore - leftScore;
}

function tableCandidateScore(candidate: ParsedTableBlock): number {
  return candidate.busyBlocks.length * 10 - candidate.warnings.length;
}

function buildTableColumnContexts(
  headerRows: readonly (readonly string[])[],
  defaultYear: number | undefined,
  coursePeriodTimes: CoursePeriodTimeMap
): TableColumnContext[] {
  const maxColumnCount = Math.max(...headerRows.map((headerRow) => headerRow.length));
  const timeColumnIndexes = findTimeColumnIndexes(headerRows, maxColumnCount);
  const timeColumnKinds = findTimeColumnKinds(headerRows, timeColumnIndexes);
  const splitHeaderTimeRanges = findSplitHeaderTimeRanges(
    headerRows,
    maxColumnCount,
    coursePeriodTimes
  );
  const carriedHeaderRows = headerRows.map((headerRow) =>
    buildCarriedHeaderContexts(headerRow, maxColumnCount, defaultYear)
  );
  const columnContexts: TableColumnContext[] = [];

  for (let headerIndex = 0; headerIndex < maxColumnCount; headerIndex += 1) {
    if (timeColumnIndexes.includes(headerIndex)) {
      continue;
    }

    let context: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate"> | undefined;
    const headerParts: string[] = [];
    const headerTimeRanges: ParsedTimeRange[] = [];

    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex += 1) {
      const cell = headerRows[rowIndex]?.[headerIndex]?.trim() ?? "";
      const isSplitTimeHeaderCell = splitHeaderTimeRanges.rowIndexes.has(rowIndex);
      const cellTimeRanges = isSplitTimeHeaderCell ? [] : findTimeRanges(cell, coursePeriodTimes);
      const headerPartWithoutTimeRanges = isSplitTimeHeaderCell ? "" : removeTimeRangeText(cell);
      const explicitContext = cell.length === 0 ? undefined : findDateContext(cell, defaultYear);
      const carriedContext = carriedHeaderRows[rowIndex]?.[headerIndex];
      const contextPart =
        explicitContext === undefined
          ? carriedContext
          : {
              context: explicitContext,
              header: cell
            };

      if (contextPart !== undefined) {
        context = mergeDateContexts(context, contextPart.context);
        const contextHeader =
          contextPart.header === cell ? headerPartWithoutTimeRanges : contextPart.header;

        if (contextHeader.length > 0) {
          headerParts.push(contextHeader);
        }
      }

      if (cellTimeRanges.length > 0) {
        headerTimeRanges.push(...cellTimeRanges);
      }

      if (headerPartWithoutTimeRanges.length > 0) {
        headerParts.push(headerPartWithoutTimeRanges);
      }
    }

    headerTimeRanges.push(...(splitHeaderTimeRanges.timeRangesByColumn.get(headerIndex) ?? []));

    if (context === undefined) {
      continue;
    }

    const timeColumnIndex = nearestTimeColumnIndex(timeColumnIndexes, headerIndex);
    const timeColumnKind =
      timeColumnIndex === undefined ? undefined : timeColumnKinds.get(timeColumnIndex);

    columnContexts.push({
      context,
      header: uniqueTextParts(headerParts).join(" "),
      headerTimeRanges,
      headerIndex,
      ...(timeColumnKind === undefined ? {} : { timeColumnKind }),
      ...(timeColumnIndex === undefined ? {} : { timeColumnIndex })
    });
  }

  return columnContexts;
}

function findTimeColumnKinds(
  headerRows: readonly (readonly string[])[],
  timeColumnIndexes: readonly number[]
): ReadonlyMap<number, TimeColumnKind> {
  const timeColumnKinds = new Map<number, TimeColumnKind>();

  for (const timeColumnIndex of timeColumnIndexes) {
    timeColumnKinds.set(
      timeColumnIndex,
      headerRows.some((headerRow) => isCoursePeriodHeaderCell(headerRow[timeColumnIndex] ?? ""))
        ? "course_period"
        : "time"
    );
  }

  return timeColumnKinds;
}

function findSplitHeaderTimeRanges(
  headerRows: readonly (readonly string[])[],
  maxColumnCount: number,
  coursePeriodTimes: CoursePeriodTimeMap
): SplitHeaderTimeRanges {
  const startRowIndex = headerRows.findIndex(isStartHeaderRow);
  const endRowIndex = headerRows.findIndex(isEndHeaderRow);
  const rowIndexes = new Set<number>();
  const timeRangesByColumn = new Map<number, readonly ParsedTimeRange[]>();

  if (startRowIndex === -1 || endRowIndex === -1) {
    return {
      rowIndexes,
      timeRangesByColumn
    };
  }

  rowIndexes.add(startRowIndex);
  rowIndexes.add(endRowIndex);

  const startRow = headerRows[startRowIndex] ?? [];
  const endRow = headerRows[endRowIndex] ?? [];

  for (let headerIndex = 0; headerIndex < maxColumnCount; headerIndex += 1) {
    const start = startRow[headerIndex]?.trim() ?? "";
    const end = endRow[headerIndex]?.trim() ?? "";
    const timeRange = parseSplitHeaderTimeRange(start, end, coursePeriodTimes);

    if (timeRange !== undefined) {
      timeRangesByColumn.set(headerIndex, [timeRange]);
    }
  }

  return {
    rowIndexes,
    timeRangesByColumn
  };
}

function isStartHeaderRow(row: readonly string[]): boolean {
  return isStartHeaderCell(row[0] ?? "");
}

function isEndHeaderRow(row: readonly string[]): boolean {
  return isEndHeaderCell(row[0] ?? "");
}

function isStartHeaderCell(value: string): boolean {
  return START_HEADER_ALIASES.includes(
    normalizeHeaderCell(value) as (typeof START_HEADER_ALIASES)[number]
  );
}

function isEndHeaderCell(value: string): boolean {
  return END_HEADER_ALIASES.includes(
    normalizeHeaderCell(value) as (typeof END_HEADER_ALIASES)[number]
  );
}

function parseSplitHeaderTimeRange(
  start: string,
  end: string,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTimeRange | undefined {
  if (!isStandaloneTimeCell(start) || !isStandaloneTimeCell(end)) {
    return undefined;
  }

  return findTimeRanges(`${start}-${end}`, coursePeriodTimes)[0];
}

function findTimeColumnIndexes(
  headerRows: readonly (readonly string[])[],
  maxColumnCount: number
): number[] {
  const timeColumnIndexes: number[] = [];

  for (let headerIndex = 0; headerIndex < maxColumnCount; headerIndex += 1) {
    if (headerRows.some((headerRow) => isTimeHeaderCell(headerRow[headerIndex] ?? ""))) {
      timeColumnIndexes.push(headerIndex);
    }
  }

  return timeColumnIndexes;
}

function nearestTimeColumnIndex(
  timeColumnIndexes: readonly number[],
  headerIndex: number
): number | undefined {
  return timeColumnIndexes.filter((timeColumnIndex) => timeColumnIndex < headerIndex).at(-1);
}

function isTimeHeaderCell(value: string): boolean {
  return TIME_COLUMN_HEADER_ALIASES.includes(
    normalizeHeaderCell(value) as (typeof TIME_COLUMN_HEADER_ALIASES)[number]
  );
}

function isCoursePeriodHeaderCell(value: string): boolean {
  return COURSE_PERIOD_HEADER_ALIASES.includes(
    normalizeHeaderCell(value) as (typeof COURSE_PERIOD_HEADER_ALIASES)[number]
  );
}

function buildCarriedHeaderContexts(
  headerRow: readonly string[],
  maxColumnCount: number,
  defaultYear: number | undefined
): Array<
  | {
      readonly context: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate">;
      readonly header: string;
    }
  | undefined
> {
  const carriedContexts: Array<
    | {
        readonly context: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate">;
        readonly header: string;
      }
    | undefined
  > = [];
  let activeContext:
    | {
        readonly context: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate">;
        readonly header: string;
      }
    | undefined;

  for (let headerIndex = 0; headerIndex < maxColumnCount; headerIndex += 1) {
    const cell = headerRow[headerIndex]?.trim() ?? "";
    const context = cell.length === 0 ? undefined : findDateContext(cell, defaultYear);

    if (context !== undefined) {
      activeContext = {
        context,
        header: cell
      };
    }

    carriedContexts[headerIndex] = activeContext;
  }

  return carriedContexts;
}

function mergeDateContexts(
  current: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate"> | undefined,
  next: Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate">
): Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate"> {
  return {
    ...(current?.localDate === undefined ? {} : { localDate: current.localDate }),
    ...(current?.dayOfWeek === undefined ? {} : { dayOfWeek: current.dayOfWeek }),
    ...(next.localDate === undefined || current?.localDate !== undefined
      ? {}
      : { localDate: next.localDate }),
    ...(next.dayOfWeek === undefined || current?.dayOfWeek !== undefined
      ? {}
      : { dayOfWeek: next.dayOfWeek })
  };
}

function uniqueTextParts(parts: readonly string[]): string[] {
  const seen = new Set<string>();
  const uniqueParts: string[] = [];

  for (const part of parts) {
    const normalizedPart = part.trim();

    if (normalizedPart.length === 0 || seen.has(normalizedPart)) {
      continue;
    }

    seen.add(normalizedPart);
    uniqueParts.push(normalizedPart);
  }

  return uniqueParts;
}

function isIgnorableTableRow(row: readonly string[]): boolean {
  const text = row
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0)
    .join(" ");

  return text.length === 0 || isIgnorableImportNoteText(text);
}

function isIgnorableImportNoteText(value: string): boolean {
  const normalized = value.trim().replaceAll(/\s+/g, " ");

  return (
    normalized.length === 0 ||
    (findTimeRanges(normalized).length === 0 &&
      IGNORABLE_IMPORT_NOTE_PATTERNS.some((pattern) => pattern.test(normalized)))
  );
}

function normalizeFreeTextChunk(value: string): string {
  let normalized = value.trim();

  while (true) {
    const next = normalized
      .replace(FREE_TEXT_LIST_PREFIX_PATTERN, "")
      .replace(FREE_TEXT_STATUS_PREFIX_PATTERN, "")
      .trim();

    if (next === normalized) {
      return normalized;
    }

    normalized = next;
  }
}

function splitFreeTextChunks(
  line: string,
  defaultYear: number | undefined,
  coursePeriodTimes: CoursePeriodTimeMap
): string[] {
  const protectedLine = protectEnglishDateCommas(line);
  const { chunks, separators } = splitFreeTextChunksWithSeparators(protectedLine);

  return mergeDateContextCommaChunks(chunks, separators, defaultYear, coursePeriodTimes).map(
    (chunk) => chunk.replaceAll(FREE_TEXT_DATE_COMMA_PLACEHOLDER, ",")
  );
}

function splitFreeTextChunksWithSeparators(line: string): {
  readonly chunks: readonly string[];
  readonly separators: readonly string[];
} {
  const chunks: string[] = [];
  const separators: string[] = [];
  let currentChunk = "";

  for (const character of line) {
    if (character === "," || character === "，" || character === ";" || character === "；") {
      chunks.push(currentChunk);
      separators.push(character);
      currentChunk = "";
      continue;
    }

    currentChunk += character;
  }

  chunks.push(currentChunk);

  return {
    chunks,
    separators
  };
}

function mergeDateContextCommaChunks(
  chunks: readonly string[],
  separators: readonly string[],
  defaultYear: number | undefined,
  coursePeriodTimes: CoursePeriodTimeMap
): string[] {
  const mergedChunks: string[] = [];
  let index = 0;

  while (index < chunks.length) {
    let chunk = chunks[index] ?? "";

    while (
      index < separators.length &&
      isCommaSeparator(separators[index] ?? "") &&
      shouldMergeDateContextCommaChunk(
        chunk,
        chunks[index + 1] ?? "",
        defaultYear,
        coursePeriodTimes
      )
    ) {
      chunk = `${chunk}${FREE_TEXT_DATE_COMMA_PLACEHOLDER}${chunks[index + 1] ?? ""}`;
      index += 1;
    }

    mergedChunks.push(chunk);
    index += 1;
  }

  return mergedChunks;
}

function isCommaSeparator(separator: string): boolean {
  return separator === "," || separator === "，";
}

function shouldMergeDateContextCommaChunk(
  currentChunk: string,
  nextChunk: string,
  defaultYear: number | undefined,
  coursePeriodTimes: CoursePeriodTimeMap
): boolean {
  const current = currentChunk.replaceAll(FREE_TEXT_DATE_COMMA_PLACEHOLDER, ",").trim();
  const next = nextChunk.replaceAll(FREE_TEXT_DATE_COMMA_PLACEHOLDER, ",").trim();

  if (
    current.length === 0 ||
    next.length === 0 ||
    findTimeRanges(current, coursePeriodTimes).length > 0
  ) {
    return false;
  }

  const currentContext = findDateContext(current, defaultYear);

  if (currentContext === undefined || findTimeRanges(next, coursePeriodTimes).length === 0) {
    return false;
  }

  const nextContext = findDateContext(next, defaultYear);

  return nextContext?.dayOfWeek === undefined;
}

function protectEnglishDateCommas(line: string): string {
  return line
    .replace(
      ENGLISH_MONTH_DATE_COMMA_PATTERN,
      (_match, datePart: string, year: string) =>
        `${datePart}${FREE_TEXT_DATE_COMMA_PLACEHOLDER} ${year}`
    )
    .replace(
      ENGLISH_DAY_MONTH_DATE_COMMA_PATTERN,
      (_match, datePart: string, year: string) =>
        `${datePart}${FREE_TEXT_DATE_COMMA_PLACEHOLDER} ${year}`
    )
    .replace(
      ENGLISH_MONTH_DATE_TRAILING_COMMA_PATTERN,
      (_match, datePart: string) => `${datePart}${FREE_TEXT_DATE_COMMA_PLACEHOLDER} `
    )
    .replace(
      ENGLISH_DAY_MONTH_DATE_TRAILING_COMMA_PATTERN,
      (_match, datePart: string) => `${datePart}${FREE_TEXT_DATE_COMMA_PLACEHOLDER} `
    );
}

function parseRowOrientedTableRows(
  rows: readonly (readonly string[])[],
  timezone: string,
  options: TextImportParseOptions,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTableBlock {
  const headerCandidate = findRowOrientedHeader(rows);

  if (headerCandidate === undefined) {
    return {
      busyBlocks: [],
      recognized: false,
      warnings: []
    };
  }

  const busyBlocks: ImportedBusyBlockDto[] = [];
  const warnings: string[] = [];
  let carryContext: RowOrientedCarryContext = {};

  for (const row of rows.slice(headerCandidate.headerIndex + 1)) {
    if (isIgnorableTableRow(row)) {
      continue;
    }

    const parsedBlock = parseRowOrientedBusyBlock(
      row,
      headerCandidate.header,
      timezone,
      options,
      coursePeriodTimes,
      carryContext
    );
    carryContext = parsedBlock.nextCarryContext;

    if (parsedBlock.continuationNote !== undefined) {
      const previousBlock = busyBlocks.at(-1);

      if (previousBlock === undefined) {
        warnings.push(timeRangeWarning(row.join(" ")));
      } else {
        busyBlocks[busyBlocks.length - 1] = appendSourceLabelNote(
          previousBlock,
          parsedBlock.continuationNote
        );
      }

      continue;
    }

    if (parsedBlock.block === undefined) {
      if (parsedBlock.shouldWarn) {
        warnings.push(timeRangeWarning(row.join(" ")));
      }

      continue;
    }

    if (parsedBlock.usedDefaultCoursePeriodTimes) {
      pushDefaultCoursePeriodWarning([parsedBlock], warnings);
    }

    busyBlocks.push(parsedBlock.block);
  }

  return {
    busyBlocks,
    recognized: true,
    warnings
  };
}

function findRowOrientedHeader(
  rows: readonly (readonly string[])[]
): { readonly header: RowOrientedHeader; readonly headerIndex: number } | undefined {
  const maxHeaderIndex = Math.min(3, rows.length - 2);

  for (let headerIndex = 0; headerIndex <= maxHeaderIndex; headerIndex += 1) {
    const header = parseRowOrientedHeader(rows[headerIndex] ?? []);

    if (header !== undefined) {
      return {
        header,
        headerIndex
      };
    }
  }

  return undefined;
}

function parseRowOrientedHeader(header: readonly string[]): RowOrientedHeader | undefined {
  const normalizedHeader = header.map(normalizeHeaderCell);
  const dateIndex = findHeaderIndex(normalizedHeader, DATE_HEADER_ALIASES);
  const timeIndex = findHeaderIndex(normalizedHeader, TIME_COLUMN_HEADER_ALIASES);
  const startIndex = findHeaderIndex(normalizedHeader, START_HEADER_ALIASES);
  const endIndex = findHeaderIndex(normalizedHeader, END_HEADER_ALIASES);
  const labelIndex = findHeaderIndex(normalizedHeader, LABEL_HEADER_ALIASES);
  const noteIndexes = findHeaderIndexes(normalizedHeader, NOTE_HEADER_ALIASES).filter(
    (noteIndex) => noteIndex !== labelIndex
  );
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

function parseRowOrientedBusyBlock(
  row: readonly string[],
  header: RowOrientedHeader,
  timezone: string,
  options: TextImportParseOptions,
  coursePeriodTimes: CoursePeriodTimeMap,
  carryContext: RowOrientedCarryContext
): RowOrientedParseAttempt {
  const explicitDate = row[header.dateIndex]?.trim() || undefined;
  const date = explicitDate ?? carryContext.date;
  const label =
    header.labelIndex === undefined ? undefined : row[header.labelIndex]?.trim() || undefined;
  const note = rowOrientedNoteText(row, header);

  const context = date === undefined ? undefined : findDateContext(date, options.defaultYear);
  const explicitTimeRange = parseRowOrientedTimeRange(row, header, coursePeriodTimes);
  const timeRange = explicitTimeRange ?? carryContext.timeRange;
  const nextCarryContext: RowOrientedCarryContext = {
    ...(context === undefined || date === undefined ? carryContext : { date }),
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
      nextCarryContext,
      shouldWarn: false
    };
  }

  if (context === undefined || timeRange === undefined) {
    return {
      nextCarryContext,
      shouldWarn: shouldWarnForUnparsedRow(row, header)
    };
  }

  return {
    block: {
      sourceLabel: [date, timeRange.label, label, note].filter(Boolean).join(" "),
      ...context,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      timezone,
      confidence: 0.7
    },
    nextCarryContext,
    shouldWarn: false,
    ...(timeRange.usesDefaultCoursePeriodTimes === true
      ? { usedDefaultCoursePeriodTimes: true }
      : {})
  };
}

function appendSourceLabelNote(
  block: ImportedBusyBlockDto,
  continuationNote: string
): ImportedBusyBlockDto {
  return {
    ...block,
    sourceLabel:
      block.sourceLabel === undefined
        ? continuationNote
        : `${block.sourceLabel} ${continuationNote}`
  };
}

function shouldWarnForUnparsedRow(row: readonly string[], header: RowOrientedHeader): boolean {
  if (!row.some((cell) => cell.trim().length > 0)) {
    return false;
  }

  if (header.labelIndex !== undefined && (row[header.labelIndex]?.trim().length ?? 0) > 0) {
    return true;
  }

  const nonContextCellIndexes = new Set(
    [header.dateIndex, header.endIndex, header.startIndex, header.timeIndex].filter(
      (index): index is number => index !== undefined
    )
  );

  return row.some((cell, index) => cell.trim().length > 0 && !nonContextCellIndexes.has(index));
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

function parseRowOrientedTimeRange(
  row: readonly string[],
  header: RowOrientedHeader,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTimeRange | undefined {
  if (header.startIndex !== undefined && header.endIndex !== undefined) {
    const start = row[header.startIndex]?.trim();
    const end = row[header.endIndex]?.trim();

    if (start !== undefined && start.length > 0 && end !== undefined && end.length > 0) {
      return findTimeRanges(`${start}-${end}`, coursePeriodTimes)[0];
    }
  }

  if (header.timeIndex === undefined) {
    return undefined;
  }

  const time = row[header.timeIndex]?.trim();

  if (time === undefined || time.length === 0) {
    return undefined;
  }

  return findTimeRangesForTimeColumn(time, header.timeIndexKind, coursePeriodTimes)[0];
}

function findTableRowTimeContext(
  row: readonly string[],
  firstContextColumnIndex: number,
  coursePeriodTimes: CoursePeriodTimeMap
): {
  readonly cellIndexOffset: number;
  readonly timeRanges: readonly ParsedTimeRange[];
} {
  if (firstContextColumnIndex === 0) {
    const firstCellRanges = findTimeRanges(row[0] ?? "", coursePeriodTimes);

    if (firstCellRanges.length > 0) {
      return {
        cellIndexOffset: 1,
        timeRanges: firstCellRanges
      };
    }
  }

  const leadingCellCount = Math.max(1, firstContextColumnIndex);
  const leadingText = row.slice(0, leadingCellCount).join(" ");
  const leadingRanges = findTimeRanges(leadingText, coursePeriodTimes);

  if (leadingRanges.length > 0) {
    return {
      cellIndexOffset: 0,
      timeRanges: leadingRanges
    };
  }

  return {
    cellIndexOffset: 0,
    timeRanges: []
  };
}

function isTableLine(line: string): boolean {
  return splitTableCells(line) !== undefined;
}

function splitTableCells(line: string): string[] | undefined {
  if (line.trim().length === 0) {
    return undefined;
  }

  if (line.includes("\t")) {
    const cells = line.split("\t").map((cell) => cell.trim());
    return cells.length >= 2 ? cells : undefined;
  }

  if (line.includes("|")) {
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

    return cells.length >= 2 ? cells : undefined;
  }

  if (line.includes(",")) {
    const cells = splitCsvCells(line);

    return isLikelyCommaTableRow(cells) ? cells : undefined;
  }

  return undefined;
}

function splitCsvCells(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

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
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());

  return cells;
}

function isLikelyCommaTableRow(cells: readonly string[]): boolean {
  if (cells.length < 2) {
    return false;
  }

  const firstCell = cells[0] ?? "";

  return (
    cells.some((cell) => isKnownTableHeaderCell(cell)) ||
    isLikelyTimeOnlyCell(firstCell) ||
    (firstCell.trim().length === 0 && cells.slice(1).some((cell) => cell.trim().length > 0)) ||
    (findDateContext(firstCell, undefined) !== undefined &&
      cells.slice(1).some((cell) => isStandaloneTimeCell(cell) || isLikelyTimeOnlyCell(cell)))
  );
}

function isKnownTableHeaderCell(value: string): boolean {
  const normalized = normalizeHeaderCell(value);

  return (
    DATE_HEADER_ALIASES.includes(normalized as (typeof DATE_HEADER_ALIASES)[number]) ||
    TIME_COLUMN_HEADER_ALIASES.includes(
      normalized as (typeof TIME_COLUMN_HEADER_ALIASES)[number]
    ) ||
    START_HEADER_ALIASES.includes(normalized as (typeof START_HEADER_ALIASES)[number]) ||
    END_HEADER_ALIASES.includes(normalized as (typeof END_HEADER_ALIASES)[number]) ||
    LABEL_HEADER_ALIASES.includes(normalized as (typeof LABEL_HEADER_ALIASES)[number])
  );
}

function isLikelyTimeOnlyCell(value: string): boolean {
  const withoutTimeRanges = removeTimeRangeText(value);

  return findTimeRanges(value).length > 0 && withoutTimeRanges.length === 0;
}

function removeTimeRangeText(value: string): string {
  const dateTokens: string[] = [];
  const valueWithProtectedDates = value.replace(LOCAL_DATE_PATTERN, (date) => {
    const token = `__SCHEDULE_SHARE_DATE_${dateTokens.length}__`;
    dateTokens.push(date);
    return token;
  });
  const withoutTimeRanges = valueWithProtectedDates
    .replace(TIME_RANGE_PATTERN, " ")
    .replace(BETWEEN_TIME_RANGE_PATTERN, " ")
    .replace(TIME_DURATION_PATTERN, " ")
    .replace(COURSE_PERIOD_PATTERN, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

  return dateTokens.reduce(
    (result, date, index) => result.replaceAll(`__SCHEDULE_SHARE_DATE_${index}__`, date),
    withoutTimeRanges
  );
}

function isStandaloneTimeCell(value: string): boolean {
  return STANDALONE_TIME_PATTERN.test(value.trim());
}

function isMarkdownSeparatorRow(cells: readonly string[]): boolean {
  return cells.every((cell) => cell.length === 0 || /^:?-{3,}:?$/.test(cell));
}

function isEmptyScheduleCell(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "-" ||
    normalized === "—" ||
    normalized === "无" ||
    normalized === "空" ||
    normalized === "休" ||
    normalized === "休息" ||
    normalized === "free" ||
    normalized === "off" ||
    normalized === "n/a"
  );
}

function findTimeRanges(
  value: string,
  coursePeriodTimes: CoursePeriodTimeMap = new Map()
): ParsedTimeRange[] {
  const textWithoutDates = stripDateTextForTimeSearch(value);
  const ranges = findExplicitTimeRanges(textWithoutDates);

  if (ranges.length === 0) {
    ranges.push(...findCoursePeriodRanges(textWithoutDates, coursePeriodTimes));
  }

  return ranges
    .sort((left, right) => left.index - right.index)
    .map((range) => ({
      startTime: range.startTime,
      endTime: range.endTime,
      label: range.label,
      ...(range.usesDefaultCoursePeriodTimes === true ? { usesDefaultCoursePeriodTimes: true } : {})
    }));
}

function findTimeRangesForTimeColumn(
  value: string,
  timeColumnKind: TimeColumnKind | undefined,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTimeRange[] {
  if (timeColumnKind === "course_period") {
    const coursePeriodRanges = findBareCoursePeriodCellRanges(value, coursePeriodTimes);

    if (coursePeriodRanges.length > 0) {
      return coursePeriodRanges;
    }
  }

  return findTimeRanges(value, coursePeriodTimes);
}

function findBareCoursePeriodCellRanges(
  value: string,
  coursePeriodTimes: CoursePeriodTimeMap
): ParsedTimeRange[] {
  const match = BARE_COURSE_PERIOD_CELL_PATTERN.exec(value.trim());

  if (match?.groups === undefined) {
    return [];
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
    return [];
  }

  const range = parseCoursePeriodRangeMatch(
    {
      index: 0,
      endIndex: match[0].length,
      startPeriod,
      endPeriod,
      label: match[0].trim()
    },
    coursePeriodTimes
  );

  if (range === undefined) {
    return [];
  }

  return [
    {
      startTime: range.startTime,
      endTime: range.endTime,
      label: range.label,
      ...(range.usesDefaultCoursePeriodTimes === true ? { usesDefaultCoursePeriodTimes: true } : {})
    }
  ];
}

function stripDateTextForTimeSearch(value: string): string {
  return value
    .replace(LOCAL_DATE_PATTERN, " ")
    .replace(DATE_WITH_SLASH_PATTERN, " ")
    .replace(CHINESE_DATE_PATTERN, " ")
    .replace(ENGLISH_DAY_MONTH_DATE_PATTERN, " ")
    .replace(ENGLISH_MONTH_DATE_PATTERN, " ");
}

function findExplicitTimeRanges(textWithoutDates: string): IndexedParsedTimeRange[] {
  const ranges: IndexedParsedTimeRange[] = [];

  for (const pattern of [TIME_RANGE_PATTERN, BETWEEN_TIME_RANGE_PATTERN]) {
    for (const match of textWithoutDates.matchAll(pattern)) {
      const range = parseTimeRangeMatch(textWithoutDates, match);

      if (range !== undefined) {
        ranges.push(range);
      }
    }
  }

  for (const match of textWithoutDates.matchAll(TIME_DURATION_PATTERN)) {
    if (match.groups === undefined) {
      continue;
    }

    const index = match.index ?? 0;
    const endIndex = index + match[0].length;

    if (ranges.some((range) => rangesOverlap(index, endIndex, range.index, range.endIndex))) {
      continue;
    }

    const durationMinutes = parseDurationMinutes(
      match.groups.durationValue!,
      match.groups.durationUnit!,
      match.groups.extraDurationValue,
      match.groups.extraDurationUnit
    );

    if (durationMinutes === undefined) {
      continue;
    }

    const startTime = normalizeMatchedTime(
      match.groups,
      "start",
      normalizeMeridiem(match.groups.startMeridiemPrefix) ??
        normalizeMeridiem(match.groups.startMeridiemSuffix)
    );

    if (startTime === undefined) {
      continue;
    }

    const endTime = addMinutesToLocalTime(startTime, durationMinutes);

    if (endTime === undefined) {
      continue;
    }

    ranges.push({
      index,
      endIndex,
      startTime,
      endTime,
      label: match[0].trim()
    });
  }

  return ranges;
}

function findCoursePeriodRanges(
  value: string,
  coursePeriodTimes: CoursePeriodTimeMap
): IndexedParsedTimeRange[] {
  return findCoursePeriodMatches(value)
    .map((match) => parseCoursePeriodRangeMatch(match, coursePeriodTimes))
    .filter((range): range is IndexedParsedTimeRange => range !== undefined)
    .sort((left, right) => left.index - right.index);
}

function findCoursePeriodMatches(value: string): CoursePeriodMatch[] {
  return COURSE_PERIOD_RANGE_PATTERNS.flatMap((pattern) =>
    Array.from(value.matchAll(pattern))
      .map(parseCoursePeriodMatch)
      .filter((match): match is CoursePeriodMatch => match !== undefined)
  ).sort((left, right) => left.index - right.index);
}

function parseCoursePeriodMatch(match: RegExpMatchArray): CoursePeriodMatch | undefined {
  if (match.groups === undefined) {
    return undefined;
  }

  const startPeriod = Number(match.groups.start);
  const endPeriod = match.groups.end === undefined ? startPeriod : Number(match.groups.end);

  if (!Number.isInteger(startPeriod) || !Number.isInteger(endPeriod) || startPeriod > endPeriod) {
    return undefined;
  }

  return {
    index: match.index ?? 0,
    endIndex: (match.index ?? 0) + match[0].length,
    startPeriod,
    endPeriod,
    label: match[0].trim()
  };
}

function parseCoursePeriodRangeMatch(
  match: CoursePeriodMatch,
  coursePeriodTimes: CoursePeriodTimeMap
): IndexedParsedTimeRange | undefined {
  const start = lookupCoursePeriodTime(match.startPeriod, coursePeriodTimes);
  const end = lookupCoursePeriodTime(match.endPeriod, coursePeriodTimes);

  if (start === undefined || end === undefined) {
    return undefined;
  }

  return {
    index: match.index,
    endIndex: match.endIndex,
    startTime: start.time.startTime,
    endTime: end.time.endTime,
    label: match.label,
    ...(start.usesDefaultCoursePeriodTimes || end.usesDefaultCoursePeriodTimes
      ? { usesDefaultCoursePeriodTimes: true }
      : {})
  };
}

function lookupCoursePeriodTime(
  period: number,
  coursePeriodTimes: CoursePeriodTimeMap
): CoursePeriodTimeLookup | undefined {
  const customTime = coursePeriodTimes.get(period);

  if (customTime !== undefined) {
    return {
      time: customTime,
      usesDefaultCoursePeriodTimes: false
    };
  }

  const defaultTime = DEFAULT_COURSE_PERIOD_TIMES.get(period);

  if (defaultTime === undefined) {
    return undefined;
  }

  return {
    time: defaultTime,
    usesDefaultCoursePeriodTimes: true
  };
}

function parseTimeRangeMatch(
  text: string,
  match: RegExpMatchArray
): IndexedParsedTimeRange | undefined {
  if (match.groups === undefined) {
    return undefined;
  }

  if (isCoursePeriodRangeMatch(text, match)) {
    return undefined;
  }

  const explicitStartMeridiem =
    normalizeMeridiem(match.groups.startMeridiemPrefix) ??
    normalizeMeridiem(match.groups.startMeridiemSuffix);
  const explicitEndMeridiem =
    normalizeMeridiem(match.groups.endMeridiemPrefix) ??
    normalizeMeridiem(match.groups.endMeridiemSuffix);
  const endMeridiem =
    explicitEndMeridiem ??
    inferEndMeridiemFromStartWord(match.groups.startWord, match.groups.endHour) ??
    explicitStartMeridiem;
  const startMeridiem =
    explicitStartMeridiem ??
    inferStartMeridiemFromEnd(match.groups.startHour, match.groups.endHour, endMeridiem);
  const startTime = normalizeMatchedTime(match.groups, "start", startMeridiem);
  const endTime = normalizeMatchedTime(match.groups, "end", endMeridiem);

  if (startTime === undefined || endTime === undefined) {
    return undefined;
  }

  return {
    index: match.index ?? 0,
    endIndex: (match.index ?? 0) + match[0].length,
    startTime,
    endTime,
    label: match[0].trim()
  };
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function normalizeMatchedTime(
  groups: {
    readonly [key: string]: string | undefined;
  },
  prefix: "end" | "start",
  meridiem?: "am" | "pm"
): `${number}:${number}` | undefined {
  const word = groups[`${prefix}Word`];

  if (word !== undefined) {
    return normalizeTimeWord(word);
  }

  const hour = groups[`${prefix}Hour`];

  if (hour === undefined) {
    return undefined;
  }

  return normalizeTimeParts(hour, groups[`${prefix}Minute`], meridiem);
}

function normalizeTimeWord(value: string): `${number}:${number}` | undefined {
  const normalized = value.toLowerCase();

  if (normalized === "noon") {
    return "12:00";
  }

  if (normalized === "midnight") {
    return "00:00";
  }

  return undefined;
}

function parseDurationMinutes(
  value: string,
  unit: string,
  extraValue: string | undefined,
  extraUnit: string | undefined
): number | undefined {
  const firstDuration = parseDurationPartMinutes(value, unit);
  const extraDuration =
    extraValue === undefined || extraUnit === undefined
      ? 0
      : parseDurationPartMinutes(extraValue, extraUnit);

  if (firstDuration === undefined || extraDuration === undefined) {
    return undefined;
  }

  const durationMinutes = Math.round(firstDuration + extraDuration);

  if (durationMinutes <= 0 || durationMinutes >= 24 * 60) {
    return undefined;
  }

  return durationMinutes;
}

function parseDurationPartMinutes(value: string, unit: string): number | undefined {
  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    return undefined;
  }

  return isDurationHourUnit(unit) ? duration * 60 : duration;
}

function isDurationHourUnit(unit: string): boolean {
  const normalized = unit.toLowerCase();

  return (
    normalized === "h" ||
    normalized === "hr" ||
    normalized === "hrs" ||
    normalized === "hour" ||
    normalized === "hours" ||
    normalized === "小时" ||
    normalized === "鐘頭" ||
    normalized === "钟头"
  );
}

function addMinutesToLocalTime(
  startTime: `${number}:${number}`,
  durationMinutes: number
): `${number}:${number}` | undefined {
  const [hourValue, minuteValue] = startTime.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return undefined;
  }

  const endTotalMinutes = (hour * 60 + minute + durationMinutes) % (24 * 60);
  const endHour = Math.floor(endTotalMinutes / 60);
  const endMinute = endTotalMinutes % 60;

  return `${endHour.toString().padStart(2, "0")}:${endMinute
    .toString()
    .padStart(2, "0")}` as `${number}:${number}`;
}

function inferStartMeridiemFromEnd(
  startHourValue: string | undefined,
  endHourValue: string | undefined,
  endMeridiem: "am" | "pm" | undefined
): "am" | "pm" | undefined {
  if (endMeridiem === undefined || startHourValue === undefined || endHourValue === undefined) {
    return undefined;
  }

  const startHour = Number(startHourValue);
  const endHour = Number(endHourValue);

  if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) {
    return undefined;
  }

  if (startHour === 12 || endHour === 12 || startHour > endHour) {
    return undefined;
  }

  return endMeridiem;
}

function inferEndMeridiemFromStartWord(
  startWord: string | undefined,
  endHourValue: string | undefined
): "am" | "pm" | undefined {
  if (startWord === undefined || endHourValue === undefined) {
    return undefined;
  }

  const endHour = Number(endHourValue);

  if (!Number.isInteger(endHour) || endHour < 1 || endHour > 12) {
    return undefined;
  }

  const normalizedStartWord = startWord.toLowerCase();

  if (normalizedStartWord === "noon") {
    return "pm";
  }

  if (normalizedStartWord === "midnight") {
    return "am";
  }

  return undefined;
}

function isCoursePeriodRangeMatch(text: string, match: RegExpMatchArray): boolean {
  const matchIndex = match.index ?? 0;
  const before = text.slice(Math.max(0, matchIndex - 12), matchIndex);
  const after = text.slice(matchIndex + match[0].length, matchIndex + match[0].length + 12);

  return (
    /第\s*$/.test(before) ||
    after.trimStart().startsWith("节") ||
    /\bperiods?\s*$/i.test(before) ||
    /^\s*periods?\b/i.test(after)
  );
}

function findDateContext(
  value: string,
  defaultYear: number | undefined
): Pick<ImportedBusyBlockDto, "dayOfWeek" | "localDate"> | undefined {
  const date = findLocalDate(value, defaultYear);
  const dayOfWeek = findDayOfWeek(value);

  if (date === undefined && dayOfWeek === undefined) {
    return undefined;
  }

  return {
    ...(date === undefined ? {} : { localDate: date }),
    ...(dayOfWeek === undefined ? {} : { dayOfWeek })
  };
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

function findLocalDate(value: string, defaultYear: number | undefined): string | undefined {
  const isoDate = LOCAL_DATE_PATTERN.exec(value)?.[0];

  if (isoDate !== undefined) {
    return isoDate;
  }

  const slashDate = DATE_WITH_SLASH_PATTERN.exec(value);

  if (slashDate?.groups !== undefined) {
    return buildLocalDate(
      slashDate.groups.year === undefined ? defaultYear : Number(slashDate.groups.year),
      slashDate.groups.month!,
      slashDate.groups.day!
    );
  }

  const chineseDate = CHINESE_DATE_PATTERN.exec(value);

  if (chineseDate?.groups !== undefined) {
    return buildLocalDate(
      chineseDate.groups.year === undefined ? defaultYear : Number(chineseDate.groups.year),
      chineseDate.groups.month!,
      chineseDate.groups.day!
    );
  }

  const englishDayMonthDate = ENGLISH_DAY_MONTH_DATE_PATTERN.exec(value);

  if (englishDayMonthDate?.groups !== undefined) {
    return buildEnglishMonthDate(englishDayMonthDate.groups, defaultYear);
  }

  const englishMonthDate = ENGLISH_MONTH_DATE_PATTERN.exec(value);

  if (englishMonthDate?.groups !== undefined) {
    return buildEnglishMonthDate(englishMonthDate.groups, defaultYear);
  }

  return undefined;
}

function buildEnglishMonthDate(
  groups: {
    readonly day?: string;
    readonly monthName?: string;
    readonly year?: string;
  },
  defaultYear: number | undefined
): `${number}-${number}-${number}` | undefined {
  if (groups.day === undefined || groups.monthName === undefined) {
    return undefined;
  }

  const month = parseEnglishMonthNumber(groups.monthName);

  if (month === undefined) {
    return undefined;
  }

  return buildLocalDate(
    groups.year === undefined ? defaultYear : Number(groups.year),
    month.toString(),
    groups.day
  );
}

function parseEnglishMonthNumber(value: string): number | undefined {
  const normalized = value.toLowerCase().replace(/\.$/, "");

  if (normalized.startsWith("jan")) return 1;
  if (normalized.startsWith("feb")) return 2;
  if (normalized.startsWith("mar")) return 3;
  if (normalized.startsWith("apr")) return 4;
  if (normalized === "may") return 5;
  if (normalized.startsWith("jun")) return 6;
  if (normalized.startsWith("jul")) return 7;
  if (normalized.startsWith("aug")) return 8;
  if (normalized.startsWith("sep")) return 9;
  if (normalized.startsWith("oct")) return 10;
  if (normalized.startsWith("nov")) return 11;
  if (normalized.startsWith("dec")) return 12;

  return undefined;
}

function buildLocalDate(
  year: number | undefined,
  monthValue: string,
  dayValue: string
): `${number}-${number}-${number}` | undefined {
  if (year === undefined) {
    return undefined;
  }

  const month = Number(monthValue);
  const day = Number(dayValue);

  if (!Number.isInteger(year) || year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}` as `${number}-${number}-${number}`;
}

function findDayOfWeek(value: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined {
  const normalized = value.toLowerCase();

  for (const item of DAY_ALIASES) {
    if (item.aliases.some((alias) => containsDayAlias(normalized, alias))) {
      return item.dayOfWeek;
    }
  }

  return undefined;
}

function containsDayAlias(value: string, alias: string): boolean {
  if (/^[a-z]+$/.test(alias)) {
    return new RegExp(`\\b${alias}\\b`, "i").test(value);
  }

  return value.includes(alias);
}

function normalizeMeridiem(value: string | undefined): "am" | "pm" | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.toLowerCase().replaceAll(".", "");

  if (normalized === "am" || normalized === "上午" || normalized === "早上") {
    return "am";
  }

  if (
    normalized === "pm" ||
    normalized === "下午" ||
    normalized === "晚上" ||
    normalized === "中午"
  ) {
    return "pm";
  }

  return undefined;
}

function normalizeTimeParts(
  hourValue: string,
  minuteValue: string | undefined,
  meridiem: "am" | "pm" | undefined
): `${number}:${number}` {
  let hour = Number(hourValue);
  const minute = minuteValue ?? "00";

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  } else if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }

  return `${hour.toString().padStart(2, "0")}:${minute}` as `${number}:${number}`;
}

function timeRangeWarning(chunk: string): string {
  if (COURSE_PERIOD_PATTERN.test(chunk)) {
    return `Class periods need explicit clock times in "${chunk}".`;
  }

  return `Could not find a time range in "${chunk}".`;
}

function pushDefaultCoursePeriodWarning(
  ranges: readonly {
    readonly usedDefaultCoursePeriodTimes?: boolean;
    readonly usesDefaultCoursePeriodTimes?: boolean;
  }[],
  warnings: string[]
): void {
  if (
    ranges.some(
      (range) => range.usesDefaultCoursePeriodTimes || range.usedDefaultCoursePeriodTimes
    ) &&
    !warnings.includes(DEFAULT_COURSE_PERIOD_WARNING)
  ) {
    warnings.push(DEFAULT_COURSE_PERIOD_WARNING);
  }
}
