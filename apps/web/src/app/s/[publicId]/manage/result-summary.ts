import type {
  GetScheduleResponse,
  ParticipantSummary,
  TimeSlotAvailabilityDto,
  TimeSlotDto
} from "@schedule-share/api-client";

import {
  formatAvailableParticipantNames,
  formatUnavailableParticipantNames
} from "../availability-slot-names";
import { buildCandidatePollResults, type CandidatePollResultItem } from "../candidate-results";

const MAX_SUMMARY_ITEMS = 3;

export function buildManageResultSummary(data: GetScheduleResponse): string {
  const lines = [
    `日程：${data.schedule.title}`,
    `状态：${statusLabel(data.schedule.status)} · 参与者：${data.participants.length} 人`,
    `日期：${data.schedule.dateRange.start} 至 ${data.schedule.dateRange.end} · 时区：${data.schedule.timezone}`
  ];

  if (data.schedule.finalTime !== null) {
    lines.push(`已确认最终时间：${formatSlotRange(data.schedule.finalTime)}`);
  }

  const resultLines =
    data.schedule.scheduleMode === "candidate_poll"
      ? buildCandidatePollSummary(data)
      : buildAvailabilityGridSummary(data);

  return [...lines, "", ...resultLines].join("\n");
}

export function buildManageRankedSlotCopyText({
  participants,
  scheduleTitle,
  slot,
  totalParticipantCount
}: {
  readonly participants: readonly ParticipantSummary[];
  readonly scheduleTitle: string;
  readonly slot: TimeSlotAvailabilityDto;
  readonly totalParticipantCount: number;
}): string {
  const lines = [
    `日程：${scheduleTitle}`,
    `备选时间：${formatSlotRange(slot)}`,
    `可用：${slot.availableParticipantCount}/${totalParticipantCount} 人`
  ];
  const availableNames = formatAvailableParticipantNames(
    slot.availableParticipantIds,
    participants
  );
  const unavailableNames = formatUnavailableParticipantNames(
    slot.availableParticipantIds,
    participants
  );

  if (availableNames.length > 0) {
    lines.push(`方便：${availableNames}`);
  }

  if (unavailableNames.length > 0) {
    lines.push(`未选此时间：${unavailableNames}`);
  }

  return lines.join("\n");
}

function buildCandidatePollSummary(data: GetScheduleResponse): string[] {
  const results = buildCandidatePollResults({
    participants: data.participants,
    slots: data.results.slotResults
  });
  const totalParticipantCount = data.participants.length;

  if (results.length === 0) {
    return ["候选投票：暂无候选时间。"];
  }

  if (totalParticipantCount === 0) {
    return [
      "候选投票：等待参与者提交。",
      "候选项：",
      ...results
        .slice(0, MAX_SUMMARY_ITEMS)
        .map(
          (result, index) =>
            `${index + 1}. ${formatCandidateTitle(result)}（${formatSlotRange(result.slot)}）`
        )
    ];
  }

  const leadResult = results[0];

  if (leadResult === undefined) {
    return ["候选投票：暂无候选时间。"];
  }

  return [
    `当前最佳候选：${formatCandidateLine(leadResult, totalParticipantCount)}`,
    "候选排名：",
    ...results
      .slice(0, MAX_SUMMARY_ITEMS)
      .map((result, index) => `${index + 1}. ${formatCandidateLine(result, totalParticipantCount)}`)
  ];
}

function buildAvailabilityGridSummary(data: GetScheduleResponse): string[] {
  const totalParticipantCount = data.results.totalParticipantCount;

  if (totalParticipantCount === 0) {
    return ["开放网格：等待参与者提交可用时间。"];
  }

  if (data.results.everyoneAvailableBlocks.length > 0) {
    return [
      "全员可用时间（前 3 段）：",
      ...data.results.everyoneAvailableBlocks
        .slice(0, MAX_SUMMARY_ITEMS)
        .map(
          (block, index) =>
            `${index + 1}. ${formatSlotRange(block)}（${block.slotCount} 个连续时间槽）`
        )
    ];
  }

  if (data.results.rankedSlots.length === 0) {
    return ["开放网格：暂无可用时间格。"];
  }

  return [
    "暂时没有全员可用时间。当前较优时间（前 3 格）：",
    ...data.results.rankedSlots
      .slice(0, MAX_SUMMARY_ITEMS)
      .map(
        (slot, index) =>
          `${index + 1}. ${formatSlotRange(slot)}：${formatAvailabilityScore(
            slot,
            totalParticipantCount
          )}${formatAvailableNames(slot, data)}${formatUnavailableNames(slot, data)}`
      )
  ];
}

function formatCandidateLine(
  result: CandidatePollResultItem,
  totalParticipantCount: number
): string {
  const maybeCount = result.maybeParticipantCount;
  const score =
    maybeCount === 0
      ? `${result.availableParticipantCount}/${totalParticipantCount} 可用，综合支持 ${result.decisionPercent}%`
      : `${result.availableParticipantCount}/${totalParticipantCount} 可用，${maybeCount} 也许，综合支持 ${result.decisionPercent}%`;
  const preferenceSummary =
    result.preferenceRankCount === 0
      ? ""
      : `，首选 ${result.firstPreferenceParticipantCount}，平均顺位 #${formatPreferenceRank(
          result.averagePreferenceRank
        )}`;

  return `${formatCandidateTitle(result)}（${formatSlotRange(result.slot)}）：${score}${preferenceSummary}`;
}

function formatCandidateTitle(result: CandidatePollResultItem): string {
  return result.slot.label ?? `候选 ${result.candidateNumber}`;
}

function formatAvailabilityScore(
  slot: TimeSlotAvailabilityDto,
  totalParticipantCount: number
): string {
  return `${slot.availableParticipantCount}/${totalParticipantCount} 人可用`;
}

function formatAvailableNames(slot: TimeSlotAvailabilityDto, data: GetScheduleResponse): string {
  if (slot.availableParticipantIds.length === 0) {
    return "";
  }

  const namesById = new Map(
    data.participants.map((participant) => [participant.id, participant.displayName])
  );
  const names = slot.availableParticipantIds
    .map((participantId) => namesById.get(participantId) ?? "未知参与者")
    .slice(0, 4);
  const remainingCount = slot.availableParticipantIds.length - names.length;
  const suffix = remainingCount > 0 ? ` 等 ${slot.availableParticipantIds.length} 人` : "";

  return `（${names.join("、")}${suffix}）`;
}

function formatUnavailableNames(slot: TimeSlotAvailabilityDto, data: GetScheduleResponse): string {
  if (data.participants.length === 0) {
    return "";
  }

  const availableParticipantIds = new Set(slot.availableParticipantIds);
  const names = data.participants
    .filter((participant) => !availableParticipantIds.has(participant.id))
    .map((participant) => participant.displayName)
    .slice(0, 4);

  if (names.length === 0) {
    return "";
  }

  const remainingCount =
    data.participants.length - slot.availableParticipantIds.length - names.length;
  const suffix =
    remainingCount > 0
      ? ` 等 ${data.participants.length - slot.availableParticipantIds.length} 人`
      : "";

  return `；未选：${names.join("、")}${suffix}`;
}

function formatSlotRange(
  value: Pick<TimeSlotDto, "localStartDate" | "localEndDate" | "localStartTime" | "localEndTime">
): string {
  const date =
    value.localStartDate === value.localEndDate
      ? value.localStartDate
      : `${value.localStartDate} 至 ${value.localEndDate}`;

  return `${date} ${value.localStartTime}-${value.localEndTime}`;
}

function formatPreferenceRank(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "未排序";
  }

  return value.toFixed(1).replace(/\.0$/, "");
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
