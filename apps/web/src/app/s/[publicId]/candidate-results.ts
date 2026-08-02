import type { ParticipantSummary, TimeSlotAvailabilityDto } from "@schedule-share/api-client";
import {
  buildCandidatePollResults as buildCoreCandidatePollResults,
  type CandidatePollResult
} from "@schedule-share/core";

import {
  buildCandidateResultComparisonDetails,
  buildCandidateResultDetails
} from "./candidate-result-reasons";

export interface CandidatePollResultItem extends Omit<
  CandidatePollResult<TimeSlotAvailabilityDto>,
  | "availableParticipantIds"
  | "firstPreferenceParticipantIds"
  | "maybeParticipantIds"
  | "unavailableParticipantIds"
> {
  readonly slot: TimeSlotAvailabilityDto;
  readonly availableNames: readonly string[];
  readonly firstPreferenceNames: readonly string[];
  readonly maybeNames: readonly string[];
  readonly unavailableNames: readonly string[];
}

export function buildCandidatePollResults(input: {
  readonly participants: readonly ParticipantSummary[];
  readonly slots: readonly TimeSlotAvailabilityDto[];
}): CandidatePollResultItem[] {
  const participantNamesById = new Map(
    input.participants.map((participant) => [participant.id, participant.displayName])
  );

  return buildCoreCandidatePollResults({
    participants: input.participants,
    slots: input.slots
  }).map(
    ({
      availableParticipantIds,
      firstPreferenceParticipantIds,
      maybeParticipantIds,
      unavailableParticipantIds,
      ...result
    }) => ({
      ...result,
      availableNames: availableParticipantIds.map(
        (participantId) => participantNamesById.get(participantId) ?? "未知参与者"
      ),
      firstPreferenceNames: firstPreferenceParticipantIds.map(
        (participantId) => participantNamesById.get(participantId) ?? "未知参与者"
      ),
      maybeNames: maybeParticipantIds.map(
        (participantId) => participantNamesById.get(participantId) ?? "未知参与者"
      ),
      unavailableNames: unavailableParticipantIds.map(
        (participantId) => participantNamesById.get(participantId) ?? "未知参与者"
      )
    })
  );
}

export function buildCandidatePollResultCopyText({
  leadResult,
  result,
  scheduleTitle,
  totalParticipantCount
}: {
  readonly leadResult?: CandidatePollResultItem;
  readonly result: CandidatePollResultItem;
  readonly scheduleTitle: string;
  readonly totalParticipantCount: number;
}): string {
  const lines = [
    `日程：${scheduleTitle}`,
    `候选：${formatCandidateTitle(result)}`,
    `时间：${formatSlotRange(result.slot)}`,
    `投票：${formatCandidateScore(result, totalParticipantCount)}，综合支持 ${result.decisionPercent}%`
  ];

  if (result.preferenceRankCount > 0) {
    lines.push(
      `偏好：首选 ${result.firstPreferenceParticipantCount}，平均顺位 #${formatPreferenceRank(
        result.averagePreferenceRank
      )}`
    );
  }

  const detailText = buildCandidateResultDetails(result, totalParticipantCount)
    .map(({ label }) => label)
    .join("；");

  if (detailText.length > 0) {
    lines.push(`缺口：${detailText}`);
  }

  const comparisonText = buildCandidateResultComparisonDetails(result, leadResult)
    .map(({ label }) => label)
    .join("；");

  if (comparisonText.length > 0) {
    lines.push(`对比最佳：${comparisonText}`);
  }

  appendNameLine(lines, "方便", result.availableNames);
  appendNameLine(lines, "首选", result.firstPreferenceNames);
  appendNameLine(lines, "也许", result.maybeNames);

  if (totalParticipantCount > 0) {
    appendNameLine(lines, "不方便/未选", result.unavailableNames);
  }

  return lines.join("\n");
}

function appendNameLine(lines: string[], label: string, names: readonly string[]): void {
  if (names.length === 0) {
    return;
  }

  lines.push(`${label}：${names.join("、")}`);
}

function formatCandidateTitle(result: CandidatePollResultItem): string {
  return result.slot.label ?? `候选 ${result.candidateNumber}`;
}

function formatCandidateScore(
  result: CandidatePollResultItem,
  totalParticipantCount: number
): string {
  if (totalParticipantCount === 0) {
    return "等待参与者";
  }

  const maybeCount = result.slot.maybeParticipantCount ?? result.maybeNames.length;

  if (maybeCount === 0) {
    return `${result.slot.availableParticipantCount}/${totalParticipantCount} 可用`;
  }

  return `${result.slot.availableParticipantCount}/${totalParticipantCount} 可用 · ${maybeCount} 也许`;
}

function formatSlotRange(
  value: Pick<
    TimeSlotAvailabilityDto,
    "localStartDate" | "localEndDate" | "localStartTime" | "localEndTime"
  >
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
