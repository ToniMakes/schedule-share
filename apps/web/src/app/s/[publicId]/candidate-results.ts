import type { ParticipantSummary, TimeSlotAvailabilityDto } from "@schedule-share/api-client";
import {
  buildCandidatePollResults as buildCoreCandidatePollResults,
  type CandidatePollResult
} from "@schedule-share/core";

import {
  buildCandidateResultComparisonDetails,
  buildCandidateResultDetails,
  candidateResultReasonCopy,
  type CandidateResultLocale
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

interface CandidatePollResultCopyText {
  readonly availableLabel: string;
  readonly candidateFallback: (candidateNumber: number) => string;
  readonly comparisonLabel: string;
  readonly dateSeparator: string;
  readonly detailSeparator: string;
  readonly detailLabel: string;
  readonly firstPreferenceLabel: string;
  readonly labelSeparator: string;
  readonly maybeLabel: string;
  readonly nameSeparator: string;
  readonly notAvailableLabel: string;
  readonly preferenceLabel: string;
  readonly preferenceAverage: (firstPreference: number, averageRank: string) => string;
  readonly scheduleLabel: string;
  readonly scoreAvailable: (available: number, total: number) => string;
  readonly scoreAvailableMaybe: (available: number, total: number, maybe: number) => string;
  readonly scoreWaiting: string;
  readonly scoreSupportSeparator: string;
  readonly supportLabel: (percent: number) => string;
  readonly timeLabel: string;
  readonly titleLabel: string;
  readonly unknownParticipant: string;
  readonly voteLabel: string;
}

const candidatePollResultCopyText: Record<CandidateResultLocale, CandidatePollResultCopyText> = {
  "zh-CN": {
    availableLabel: "方便",
    candidateFallback: (candidateNumber) => `候选 ${candidateNumber}`,
    comparisonLabel: "对比最佳",
    dateSeparator: " 至 ",
    detailSeparator: "；",
    detailLabel: "缺口",
    firstPreferenceLabel: "首选",
    labelSeparator: "：",
    maybeLabel: "也许",
    nameSeparator: "、",
    notAvailableLabel: "不方便/未选",
    preferenceLabel: "偏好",
    preferenceAverage: (firstPreference, averageRank) =>
      `首选 ${firstPreference}，平均顺位 #${averageRank}`,
    scheduleLabel: "日程",
    scoreAvailable: (available, total) => `${available}/${total} 可用`,
    scoreAvailableMaybe: (available, total, maybe) => `${available}/${total} 可用 · ${maybe} 也许`,
    scoreWaiting: "等待参与者",
    scoreSupportSeparator: "，",
    supportLabel: (percent) => `综合支持 ${percent}%`,
    timeLabel: "时间",
    titleLabel: "候选",
    unknownParticipant: "未知参与者",
    voteLabel: "投票"
  },
  en: {
    availableLabel: "Yes",
    candidateFallback: (candidateNumber) => `Option ${candidateNumber}`,
    comparisonLabel: "Compared with best",
    dateSeparator: " to ",
    detailSeparator: "; ",
    detailLabel: "Gaps",
    firstPreferenceLabel: "First choice",
    labelSeparator: ": ",
    maybeLabel: "Maybe",
    nameSeparator: ", ",
    notAvailableLabel: "No/not selected",
    preferenceLabel: "Preference",
    preferenceAverage: (firstPreference, averageRank) =>
      `${firstPreference} first-choice, avg rank #${averageRank}`,
    scheduleLabel: "Schedule",
    scoreAvailable: (available, total) => `${available}/${total} yes`,
    scoreAvailableMaybe: (available, total, maybe) => `${available}/${total} yes · ${maybe} maybe`,
    scoreWaiting: "Waiting for participants",
    scoreSupportSeparator: ", ",
    supportLabel: (percent) => `Weighted support ${percent}%`,
    timeLabel: "Time",
    titleLabel: "Option",
    unknownParticipant: "Unknown participant",
    voteLabel: "Votes"
  }
};

export function buildCandidatePollResults(input: {
  readonly locale?: CandidateResultLocale;
  readonly participants: readonly ParticipantSummary[];
  readonly slots: readonly TimeSlotAvailabilityDto[];
}): CandidatePollResultItem[] {
  const copy = candidatePollResultCopyText[input.locale ?? "zh-CN"];
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
        (participantId) => participantNamesById.get(participantId) ?? copy.unknownParticipant
      ),
      firstPreferenceNames: firstPreferenceParticipantIds.map(
        (participantId) => participantNamesById.get(participantId) ?? copy.unknownParticipant
      ),
      maybeNames: maybeParticipantIds.map(
        (participantId) => participantNamesById.get(participantId) ?? copy.unknownParticipant
      ),
      unavailableNames: unavailableParticipantIds.map(
        (participantId) => participantNamesById.get(participantId) ?? copy.unknownParticipant
      )
    })
  );
}

export function buildCandidatePollResultCopyText({
  leadResult,
  locale = "zh-CN",
  result,
  scheduleTitle,
  totalParticipantCount
}: {
  readonly leadResult?: CandidatePollResultItem;
  readonly locale?: CandidateResultLocale;
  readonly result: CandidatePollResultItem;
  readonly scheduleTitle: string;
  readonly totalParticipantCount: number;
}): string {
  const copy = candidatePollResultCopyText[locale];
  const reasonCopy = candidateResultReasonCopy[locale];
  const lines = [
    `${copy.scheduleLabel}${copy.labelSeparator}${scheduleTitle}`,
    `${copy.titleLabel}${copy.labelSeparator}${formatCandidateTitle(result, copy)}`,
    `${copy.timeLabel}${copy.labelSeparator}${formatSlotRange(result.slot, copy)}`,
    `${copy.voteLabel}${copy.labelSeparator}${formatCandidateScore(
      result,
      totalParticipantCount,
      copy
    )}${copy.scoreSupportSeparator}${copy.supportLabel(result.decisionPercent)}`
  ];

  if (result.preferenceRankCount > 0) {
    lines.push(
      `${copy.preferenceLabel}${copy.labelSeparator}${copy.preferenceAverage(
        result.firstPreferenceParticipantCount,
        formatPreferenceRank(result.averagePreferenceRank, reasonCopy.notRanked)
      )}`
    );
  }

  const detailText = buildCandidateResultDetails(result, totalParticipantCount, reasonCopy)
    .map(({ label }) => label)
    .join(copy.detailSeparator);

  if (detailText.length > 0) {
    lines.push(`${copy.detailLabel}${copy.labelSeparator}${detailText}`);
  }

  const comparisonText = buildCandidateResultComparisonDetails(result, leadResult, reasonCopy)
    .map(({ label }) => label)
    .join(copy.detailSeparator);

  if (comparisonText.length > 0) {
    lines.push(`${copy.comparisonLabel}${copy.labelSeparator}${comparisonText}`);
  }

  appendNameLine(lines, copy.availableLabel, result.availableNames, copy);
  appendNameLine(lines, copy.firstPreferenceLabel, result.firstPreferenceNames, copy);
  appendNameLine(lines, copy.maybeLabel, result.maybeNames, copy);

  if (totalParticipantCount > 0) {
    appendNameLine(lines, copy.notAvailableLabel, result.unavailableNames, copy);
  }

  return lines.join("\n");
}

function appendNameLine(
  lines: string[],
  label: string,
  names: readonly string[],
  copy: CandidatePollResultCopyText
): void {
  if (names.length === 0) {
    return;
  }

  lines.push(`${label}${copy.labelSeparator}${names.join(copy.nameSeparator)}`);
}

function formatCandidateTitle(
  result: CandidatePollResultItem,
  copy: CandidatePollResultCopyText
): string {
  return result.slot.label ?? copy.candidateFallback(result.candidateNumber);
}

function formatCandidateScore(
  result: CandidatePollResultItem,
  totalParticipantCount: number,
  copy: CandidatePollResultCopyText
): string {
  if (totalParticipantCount === 0) {
    return copy.scoreWaiting;
  }

  const maybeCount = result.slot.maybeParticipantCount ?? result.maybeNames.length;

  if (maybeCount === 0) {
    return copy.scoreAvailable(result.slot.availableParticipantCount, totalParticipantCount);
  }

  return copy.scoreAvailableMaybe(
    result.slot.availableParticipantCount,
    totalParticipantCount,
    maybeCount
  );
}

function formatSlotRange(
  value: Pick<
    TimeSlotAvailabilityDto,
    "localStartDate" | "localEndDate" | "localStartTime" | "localEndTime"
  >,
  copy: CandidatePollResultCopyText
): string {
  const date =
    value.localStartDate === value.localEndDate
      ? value.localStartDate
      : `${value.localStartDate}${copy.dateSeparator}${value.localEndDate}`;

  return `${date} ${value.localStartTime}-${value.localEndTime}`;
}

function formatPreferenceRank(value: number | undefined, notRanked: string): string {
  if (value === undefined || !Number.isFinite(value)) {
    return notRanked;
  }

  return value.toFixed(1).replace(/\.0$/, "");
}
