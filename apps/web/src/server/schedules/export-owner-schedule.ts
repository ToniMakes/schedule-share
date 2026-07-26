import type { GetScheduleResponse } from "@schedule-share/api-client";

import { getOwnerScheduleView } from "./get-owner-schedule";
import type { ReadOwnerScheduleRepository } from "./repository";

export interface ExportOwnerScheduleDependencies {
  readonly repository: ReadOwnerScheduleRepository;
}

export interface OwnerScheduleCsvExport {
  readonly content: string;
  readonly filename: string;
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

function toOwnerScheduleCsv(data: GetScheduleResponse): string {
  const participantNamesById = new Map(
    data.participants.map((participant) => [participant.id, participant.displayName])
  );
  const rows: string[][] = [
    ["日程标题", data.schedule.title],
    ["状态", statusLabel(data.schedule.status)],
    ["时区", data.schedule.timezone],
    ["日期范围", `${data.schedule.dateRange.start} 至 ${data.schedule.dateRange.end}`],
    ["参与者数量", data.participants.length.toString()],
    [],
    ["全员可用连续时间段"],
    ["日期", "开始时间", "结束时间", "连续时间槽", "可用人数", "总人数", "可用参与者"]
  ];

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
