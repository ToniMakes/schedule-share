import type {
  AvailabilityBlockDto,
  GetScheduleResponse,
  TimeSlotDto
} from "@schedule-share/api-client";

import { HttpError } from "../errors";
import { getOwnerScheduleView } from "./get-owner-schedule";
import type { ReadOwnerScheduleRepository } from "./repository";

export interface ExportOwnerScheduleDependencies {
  readonly repository: ReadOwnerScheduleRepository;
}

export interface OwnerScheduleCsvExport {
  readonly content: string;
  readonly filename: string;
}

export interface OwnerScheduleIcsExport {
  readonly content: string;
  readonly filename: string;
}

export interface ExportOwnerScheduleIcsOptions {
  readonly endUtc?: string;
  readonly startUtc?: string;
  readonly target?: string;
}

type IcsTransparency = "OPAQUE" | "TRANSPARENT";

interface OwnerScheduleIcsEvent {
  readonly description: string;
  readonly endUtc: string;
  readonly startUtc: string;
  readonly summary: string;
  readonly transparency: IcsTransparency;
  readonly uidSuffix: string;
}

export async function exportOwnerScheduleCsv(
  publicId: string,
  ownerKey: string,
  dependencies: ExportOwnerScheduleDependencies
): Promise<OwnerScheduleCsvExport> {
  const data = await getOwnerScheduleView(publicId, ownerKey, dependencies);

  return {
    content: toOwnerScheduleCsv(data),
    filename: `schedule-${toSafeFilenamePart(data.schedule.publicId)}-results.csv`
  };
}

export async function exportOwnerScheduleIcs(
  publicId: string,
  ownerKey: string,
  dependencies: ExportOwnerScheduleDependencies,
  options: ExportOwnerScheduleIcsOptions = {}
): Promise<OwnerScheduleIcsExport> {
  const data = await getOwnerScheduleView(publicId, ownerKey, dependencies);
  const selected = selectIcsExportBlocks(data, options);

  return {
    content: toOwnerScheduleIcs(data, new Date(), selected.events),
    filename: selected.filename
  };
}

function toOwnerScheduleCsv(data: GetScheduleResponse): string {
  const participantNamesById = new Map(
    data.participants.map((participant) => [participant.id, participant.displayName])
  );
  const rows: string[][] = [
    ["日程标题", data.schedule.title],
    ["状态", statusLabel(data.schedule.status)],
    ["时区", data.schedule.timezone],
    ["日期范围", `${data.schedule.dateRange.start} 至 ${data.schedule.dateRange.end}`],
    ["参与者数量", data.participants.length.toString()]
  ];

  if (data.schedule.scheduleMode === "candidate_poll") {
    rows.push(
      [],
      ["候选投票结果"],
      [
        "候选",
        "日期",
        "开始时间",
        "结束时间",
        "可用人数",
        "也许人数",
        "首选人数",
        "平均偏好顺位",
        "总人数",
        "可用参与者",
        "也许参与者",
        "首选参与者",
        "不方便或未选"
      ]
    );

    for (const slot of data.results.slotResults) {
      const availableParticipantIds = new Set(slot.availableParticipantIds);
      const maybeParticipantIds = new Set(slot.maybeParticipantIds ?? []);
      const firstPreferenceParticipantIds = slot.firstPreferenceParticipantIds ?? [];
      const unavailableParticipantIds = data.participants
        .filter(
          (participant) =>
            !availableParticipantIds.has(participant.id) && !maybeParticipantIds.has(participant.id)
        )
        .map((participant) => participant.id);

      rows.push([
        slot.label ?? "",
        formatLocalDateRange(slot),
        slot.localStartTime,
        slot.localEndTime,
        slot.availableParticipantCount.toString(),
        (slot.maybeParticipantCount ?? maybeParticipantIds.size).toString(),
        (slot.firstPreferenceParticipantCount ?? firstPreferenceParticipantIds.length).toString(),
        formatAveragePreferenceRank(slot.preferenceRankSum, slot.preferenceRankCount),
        data.results.totalParticipantCount.toString(),
        participantNames(slot.availableParticipantIds, participantNamesById),
        participantNames([...(slot.maybeParticipantIds ?? [])], participantNamesById),
        participantNames(firstPreferenceParticipantIds, participantNamesById),
        participantNames(unavailableParticipantIds, participantNamesById)
      ]);
    }
  }

  rows.push(
    [],
    ["全员可用连续时间段"],
    ["日期", "开始时间", "结束时间", "连续时间槽", "可用人数", "总人数", "可用参与者"]
  );

  if (data.results.everyoneAvailableBlocks.length === 0) {
    rows.push(["暂无全员可用时间"]);
  } else {
    for (const block of data.results.everyoneAvailableBlocks) {
      rows.push([
        formatLocalDateRange(block),
        block.localStartTime,
        block.localEndTime,
        block.slotCount.toString(),
        block.availableParticipantCount.toString(),
        data.results.totalParticipantCount.toString(),
        participantNames(block.availableParticipantIds, participantNamesById)
      ]);
    }
  }

  rows.push(
    [],
    ["当前时间槽排名"],
    ["日期", "开始时间", "结束时间", "可用人数", "总人数", "全员可用", "可用参与者"]
  );

  if (data.results.rankedSlots.length === 0) {
    rows.push(["暂无参与者可用时间"]);
  } else {
    for (const slot of data.results.rankedSlots) {
      rows.push([
        formatLocalDateRange(slot),
        slot.localStartTime,
        slot.localEndTime,
        slot.availableParticipantCount.toString(),
        data.results.totalParticipantCount.toString(),
        slot.isEveryoneAvailable ? "是" : "否",
        participantNames(slot.availableParticipantIds, participantNamesById)
      ]);
    }
  }

  rows.push([], ["参与者"], ["显示名称", "参与者 ID"]);

  if (data.participants.length === 0) {
    rows.push(["暂无参与者"]);
  } else {
    for (const participant of data.participants) {
      rows.push([participant.displayName, participant.id]);
    }
  }

  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

function toOwnerScheduleIcs(
  data: GetScheduleResponse,
  generatedAt: Date,
  events: readonly OwnerScheduleIcsEvent[]
): string {
  const dtstamp = toIcsUtcDateTime(generatedAt.toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Schedule Share//Available Times Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(data.schedule.title)}`
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${toIcsUid(data.schedule.publicId, event.uidSuffix)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${toIcsUtcDateTime(event.startUtc)}`,
      `DTEND:${toIcsUtcDateTime(event.endUtc)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      `TRANSP:${event.transparency}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}

function selectIcsExportBlocks(
  data: GetScheduleResponse,
  options: ExportOwnerScheduleIcsOptions
): {
  readonly events: readonly OwnerScheduleIcsEvent[];
  readonly filename: string;
} {
  const safePublicId = toSafeFilenamePart(data.schedule.publicId);
  const hasStart = options.startUtc !== undefined && options.startUtc.trim().length > 0;
  const hasEnd = options.endUtc !== undefined && options.endUtc.trim().length > 0;
  const target = normalizeIcsExportTarget(options.target);

  if (target === "final-time") {
    if (hasStart || hasEnd) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Final time ICS export cannot be combined with startUtc or endUtc."
      );
    }

    if (data.schedule.finalTime === null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Final time must be confirmed before exporting it as ICS."
      );
    }

    return {
      events: [toFinalTimeIcsEvent(data.schedule.title, data.schedule.finalTime)],
      filename: `schedule-${safePublicId}-final-${toIcsUtcDateTime(
        data.schedule.finalTime.startUtc
      )}.ics`
    };
  }

  if (!hasStart && !hasEnd) {
    return {
      events: data.results.everyoneAvailableBlocks.map((block, index) =>
        toAvailableBlockIcsEvent(data, block, index)
      ),
      filename: `schedule-${safePublicId}-available-times.ics`
    };
  }

  if (!hasStart || !hasEnd) {
    throw new HttpError(400, "VALIDATION_ERROR", "ICS export requires both startUtc and endUtc.");
  }

  const startUtc = normalizeRequestedUtcIso(options.startUtc ?? "");
  const endUtc = normalizeRequestedUtcIso(options.endUtc ?? "");

  if (Date.parse(startUtc) >= Date.parse(endUtc)) {
    throw new HttpError(400, "VALIDATION_ERROR", "ICS export endUtc must be after startUtc.");
  }

  const block = data.results.everyoneAvailableBlocks.find(
    (candidate) => candidate.startUtc === startUtc && candidate.endUtc === endUtc
  );

  if (block === undefined) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "ICS export range must match an everyone-available block."
    );
  }

  return {
    events: [toAvailableBlockIcsEvent(data, block, 0)],
    filename: `schedule-${safePublicId}-available-${toIcsUtcDateTime(block.startUtc)}.ics`
  };
}

function normalizeIcsExportTarget(target: string | undefined): "available-times" | "final-time" {
  if (target === undefined || target.trim().length === 0) {
    return "available-times";
  }

  const normalized = target.trim().toLowerCase();

  if (normalized === "available-times" || normalized === "final-time") {
    return normalized;
  }

  throw new HttpError(400, "VALIDATION_ERROR", "Unsupported ICS export target.");
}

function toAvailableBlockIcsEvent(
  data: GetScheduleResponse,
  block: AvailabilityBlockDto,
  index: number
): OwnerScheduleIcsEvent {
  const participantNamesById = new Map(
    data.participants.map((participant) => [participant.id, participant.displayName])
  );
  const participantNamesText = participantNames(
    block.availableParticipantIds,
    participantNamesById
  );
  const description =
    participantNamesText.length === 0
      ? "Everyone is available."
      : `All available participants: ${participantNamesText}`;

  return {
    description,
    endUtc: block.endUtc,
    startUtc: block.startUtc,
    summary: `Available: ${data.schedule.title}`,
    transparency: "TRANSPARENT",
    uidSuffix: `available-${index}`
  };
}

function toFinalTimeIcsEvent(title: string, finalTime: TimeSlotDto): OwnerScheduleIcsEvent {
  return {
    description: "Confirmed final time.",
    endUtc: finalTime.endUtc,
    startUtc: finalTime.startUtc,
    summary: `Final: ${title}`,
    transparency: "OPAQUE",
    uidSuffix: `final-${toIcsUtcDateTime(finalTime.startUtc)}`
  };
}

function normalizeRequestedUtcIso(value: string): string {
  const date = new Date(value.trim());

  if (!Number.isFinite(date.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid ICS export time range.");
  }

  return date.toISOString();
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function formatLocalDateRange(value: {
  readonly localEndDate: string;
  readonly localStartDate: string;
}): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return `${value.localStartDate} 至 ${value.localEndDate}`;
}

function participantNames(
  participantIds: readonly string[],
  participantNamesById: ReadonlyMap<string, string>
): string {
  return participantIds.map((id) => participantNamesById.get(id) ?? id).join("; ");
}

function formatAveragePreferenceRank(
  preferenceRankSum: number | undefined,
  preferenceRankCount: number | undefined
): string {
  if (
    preferenceRankSum === undefined ||
    preferenceRankCount === undefined ||
    preferenceRankCount === 0
  ) {
    return "";
  }

  return (preferenceRankSum / preferenceRankCount).toFixed(1).replace(/\.0$/, "");
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(/\r?\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function toIcsUtcDateTime(value: string): string {
  return new Date(value)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

function toIcsUid(publicId: string, suffix: string): string {
  const safePublicId = toSafeFilenamePart(publicId).toLowerCase();

  return `schedule-${safePublicId}-${suffix}@schedule-share.local`;
}

function statusLabel(status: GetScheduleResponse["schedule"]["status"]): string {
  if (status === "open") {
    return "开放中";
  }

  if (status === "locked") {
    return "已锁定";
  }

  return "已归档";
}

function toSafeFilenamePart(value: string): string {
  const filenamePart = value.replaceAll(/[^a-zA-Z0-9_-]/g, "-").replaceAll(/-+/g, "-");
  return filenamePart.length > 0 ? filenamePart : "schedule";
}
