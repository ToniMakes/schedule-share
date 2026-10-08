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
import type { SchedulePageLocale } from "../schedule-page-copy";

const MAX_SUMMARY_ITEMS = 3;

export function buildManageResultSummary(
  data: GetScheduleResponse,
  locale: SchedulePageLocale = "zh-CN"
): string {
  const lines =
    locale === "en"
      ? [
          `Schedule: ${data.schedule.title}`,
          `Status: ${statusLabel(data.schedule.status, locale)} · Participants: ${data.participants.length}`,
          `Dates: ${data.schedule.dateRange.start} to ${data.schedule.dateRange.end} · Time zone: ${data.schedule.timezone}`
        ]
      : [
          `日程：${data.schedule.title}`,
          `状态：${statusLabel(data.schedule.status, locale)} · 参与者：${data.participants.length} 人`,
          `日期：${data.schedule.dateRange.start} 至 ${data.schedule.dateRange.end} · 时区：${data.schedule.timezone}`
        ];

  if (data.schedule.finalTime !== null) {
    lines.push(
      locale === "en"
        ? `Final time confirmed: ${formatSlotRange(data.schedule.finalTime, locale)}`
        : `已确认最终时间：${formatSlotRange(data.schedule.finalTime, locale)}`
    );
  }

  const resultLines =
    data.schedule.scheduleMode === "candidate_poll"
      ? buildCandidatePollSummary(data, locale)
      : buildAvailabilityGridSummary(data, locale);

  return [...lines, "", ...resultLines].join("\n");
}

export function buildManageRankedSlotCopyText({
  participants,
  locale = "zh-CN",
  scheduleTitle,
  slot,
  totalParticipantCount
}: {
  readonly participants: readonly ParticipantSummary[];
  readonly locale?: SchedulePageLocale;
  readonly scheduleTitle: string;
  readonly slot: TimeSlotAvailabilityDto;
  readonly totalParticipantCount: number;
}): string {
  const lines =
    locale === "en"
      ? [
          `Schedule: ${scheduleTitle}`,
          `Candidate time: ${formatSlotRange(slot, locale)}`,
          `Available: ${slot.availableParticipantCount}/${totalParticipantCount} people`
        ]
      : [
          `日程：${scheduleTitle}`,
          `备选时间：${formatSlotRange(slot, locale)}`,
          `可用：${slot.availableParticipantCount}/${totalParticipantCount} 人`
        ];
  const availableNames = formatAvailableParticipantNames(
    slot.availableParticipantIds,
    participants,
    {
      separator: locale === "en" ? ", " : "、",
      unknownParticipant: locale === "en" ? "Unknown participant" : "未知参与者"
    }
  );
  const unavailableNames = formatUnavailableParticipantNames(
    slot.availableParticipantIds,
    participants,
    {
      separator: locale === "en" ? ", " : "、"
    }
  );

  if (availableNames.length > 0) {
    lines.push(locale === "en" ? `Available: ${availableNames}` : `方便：${availableNames}`);
  }

  if (unavailableNames.length > 0) {
    lines.push(
      locale === "en"
        ? `Not selected for this time: ${unavailableNames}`
        : `未选此时间：${unavailableNames}`
    );
  }

  return lines.join("\n");
}

function buildCandidatePollSummary(
  data: GetScheduleResponse,
  locale: SchedulePageLocale
): string[] {
  const results = buildCandidatePollResults({
    locale,
    participants: data.participants,
    slots: data.results.slotResults
  });
  const totalParticipantCount = data.participants.length;

  if (results.length === 0) {
    return [
      locale === "en" ? "Candidate poll: No candidate times yet." : "候选投票：暂无候选时间。"
    ];
  }

  if (totalParticipantCount === 0) {
    if (locale === "en") {
      return [
        "Candidate poll: Waiting for participants.",
        "Candidate options:",
        ...results
          .slice(0, MAX_SUMMARY_ITEMS)
          .map(
            (result, index) =>
              `${index + 1}. ${formatCandidateTitle(result, locale)} (${formatSlotRange(
                result.slot,
                locale
              )})`
          )
      ];
    }

    return [
      "候选投票：等待参与者提交。",
      "候选项：",
      ...results
        .slice(0, MAX_SUMMARY_ITEMS)
        .map(
          (result, index) =>
            `${index + 1}. ${formatCandidateTitle(result, locale)}（${formatSlotRange(
              result.slot,
              locale
            )}）`
        )
    ];
  }

  const leadResult = results[0];

  if (leadResult === undefined) {
    return [
      locale === "en" ? "Candidate poll: No candidate times yet." : "候选投票：暂无候选时间。"
    ];
  }

  if (locale === "en") {
    return [
      `Current best option: ${formatCandidateLine(leadResult, totalParticipantCount, locale)}`,
      "Candidate ranking:",
      ...results
        .slice(0, MAX_SUMMARY_ITEMS)
        .map(
          (result, index) =>
            `${index + 1}. ${formatCandidateLine(result, totalParticipantCount, locale)}`
        )
    ];
  }

  return [
    `当前最佳候选：${formatCandidateLine(leadResult, totalParticipantCount, locale)}`,
    "候选排名：",
    ...results
      .slice(0, MAX_SUMMARY_ITEMS)
      .map(
        (result, index) =>
          `${index + 1}. ${formatCandidateLine(result, totalParticipantCount, locale)}`
      )
  ];
}

function buildAvailabilityGridSummary(
  data: GetScheduleResponse,
  locale: SchedulePageLocale
): string[] {
  const totalParticipantCount = data.results.totalParticipantCount;

  if (totalParticipantCount === 0) {
    return [
      locale === "en"
        ? "Availability grid: Waiting for participants."
        : "开放网格：等待参与者提交可用时间。"
    ];
  }

  if (data.results.everyoneAvailableBlocks.length > 0) {
    if (locale === "en") {
      return [
        "Everyone available times (top 3):",
        ...data.results.everyoneAvailableBlocks
          .slice(0, MAX_SUMMARY_ITEMS)
          .map(
            (block, index) =>
              `${index + 1}. ${formatSlotRange(block, locale)} (${block.slotCount} continuous slots)`
          )
      ];
    }

    return [
      "全员可用时间（前 3 段）：",
      ...data.results.everyoneAvailableBlocks
        .slice(0, MAX_SUMMARY_ITEMS)
        .map(
          (block, index) =>
            `${index + 1}. ${formatSlotRange(block, locale)}（${block.slotCount} 个连续时间槽）`
        )
    ];
  }

  if (data.results.rankedSlots.length === 0) {
    return [
      locale === "en"
        ? "Availability grid: No available time slots yet."
        : "开放网格：暂无可用时间格。"
    ];
  }

  if (locale === "en") {
    return [
      "No time works for everyone yet. Stronger current slots (top 3):",
      ...data.results.rankedSlots
        .slice(0, MAX_SUMMARY_ITEMS)
        .map(
          (slot, index) =>
            `${index + 1}. ${formatSlotRange(slot, locale)}: ${formatAvailabilityScore(
              slot,
              totalParticipantCount,
              locale
            )}${formatAvailableNames(slot, data, locale)}${formatUnavailableNames(
              slot,
              data,
              locale
            )}`
        )
    ];
  }

  return [
    "暂时没有全员可用时间。当前较优时间（前 3 格）：",
    ...data.results.rankedSlots
      .slice(0, MAX_SUMMARY_ITEMS)
      .map(
        (slot, index) =>
          `${index + 1}. ${formatSlotRange(slot, locale)}：${formatAvailabilityScore(
            slot,
            totalParticipantCount,
            locale
          )}${formatAvailableNames(slot, data, locale)}${formatUnavailableNames(
            slot,
            data,
            locale
          )}`
      )
  ];
}

function formatCandidateLine(
  result: CandidatePollResultItem,
  totalParticipantCount: number,
  locale: SchedulePageLocale
): string {
  const maybeCount = result.maybeParticipantCount;
  const score =
    locale === "en"
      ? maybeCount === 0
        ? `${result.availableParticipantCount}/${totalParticipantCount} available, weighted support ${result.decisionPercent}%`
        : `${result.availableParticipantCount}/${totalParticipantCount} available, ${maybeCount} if needed, weighted support ${result.decisionPercent}%`
      : maybeCount === 0
        ? `${result.availableParticipantCount}/${totalParticipantCount} 人方便，综合支持 ${result.decisionPercent}%`
        : `${result.availableParticipantCount}/${totalParticipantCount} 人方便，${maybeCount} 人必要时可以，综合支持 ${result.decisionPercent}%`;
  const preferenceSummary =
    result.preferenceRankCount === 0
      ? ""
      : locale === "en"
        ? `, ${result.firstPreferenceParticipantCount} first-choice, avg rank #${formatPreferenceRank(
            result.averagePreferenceRank,
            locale
          )}`
        : `，首选 ${result.firstPreferenceParticipantCount}，平均顺位 #${formatPreferenceRank(
            result.averagePreferenceRank,
            locale
          )}`;

  return locale === "en"
    ? `${formatCandidateTitle(result, locale)} (${formatSlotRange(
        result.slot,
        locale
      )}): ${score}${preferenceSummary}`
    : `${formatCandidateTitle(result, locale)}（${formatSlotRange(
        result.slot,
        locale
      )}）：${score}${preferenceSummary}`;
}

function formatCandidateTitle(result: CandidatePollResultItem, locale: SchedulePageLocale): string {
  return (
    result.slot.label ??
    (locale === "en" ? `Option ${result.candidateNumber}` : `候选 ${result.candidateNumber}`)
  );
}

function formatAvailabilityScore(
  slot: TimeSlotAvailabilityDto,
  totalParticipantCount: number,
  locale: SchedulePageLocale
): string {
  if (locale === "en") {
    return `${slot.availableParticipantCount}/${totalParticipantCount} people available`;
  }

  return `${slot.availableParticipantCount}/${totalParticipantCount} 人可用`;
}

function formatAvailableNames(
  slot: TimeSlotAvailabilityDto,
  data: GetScheduleResponse,
  locale: SchedulePageLocale
): string {
  if (slot.availableParticipantIds.length === 0) {
    return "";
  }

  const namesById = new Map(
    data.participants.map((participant) => [participant.id, participant.displayName])
  );
  const names = slot.availableParticipantIds
    .map(
      (participantId) =>
        namesById.get(participantId) ?? (locale === "en" ? "Unknown participant" : "未知参与者")
    )
    .slice(0, 4);
  const remainingCount = slot.availableParticipantIds.length - names.length;
  const suffix =
    remainingCount > 0
      ? locale === "en"
        ? ` and ${remainingCount} more`
        : ` 等 ${slot.availableParticipantIds.length} 人`
      : "";

  return locale === "en" ? ` (${names.join(", ")}${suffix})` : `（${names.join("、")}${suffix}）`;
}

function formatUnavailableNames(
  slot: TimeSlotAvailabilityDto,
  data: GetScheduleResponse,
  locale: SchedulePageLocale
): string {
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
      ? locale === "en"
        ? ` and ${remainingCount} more`
        : ` 等 ${data.participants.length - slot.availableParticipantIds.length} 人`
      : "";

  return locale === "en"
    ? `; not selected: ${names.join(", ")}${suffix}`
    : `；未选：${names.join("、")}${suffix}`;
}

function formatSlotRange(
  value: Pick<TimeSlotDto, "localStartDate" | "localEndDate" | "localStartTime" | "localEndTime">,
  locale: SchedulePageLocale
): string {
  const date =
    value.localStartDate === value.localEndDate
      ? value.localStartDate
      : locale === "en"
        ? `${value.localStartDate} to ${value.localEndDate}`
        : `${value.localStartDate} 至 ${value.localEndDate}`;

  return `${date} ${value.localStartTime}-${value.localEndTime}`;
}

function formatPreferenceRank(value: number | undefined, locale: SchedulePageLocale): string {
  if (value === undefined || !Number.isFinite(value)) {
    return locale === "en" ? "not ranked" : "未排序";
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function statusLabel(
  status: GetScheduleResponse["schedule"]["status"],
  locale: SchedulePageLocale
): string {
  if (locale === "en") {
    if (status === "open") {
      return "Open";
    }

    if (status === "locked") {
      return "Locked";
    }

    return "Archived";
  }

  if (status === "open") {
    return "开放中";
  }

  if (status === "locked") {
    return "已锁定";
  }

  return "已归档";
}
