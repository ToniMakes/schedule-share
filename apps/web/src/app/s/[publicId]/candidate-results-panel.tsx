import { CheckCircle2, CircleHelp, CircleSlash, Star, Trophy } from "lucide-react";
import type { ReactNode } from "react";

import type {
  GetScheduleResponse,
  ScheduleDetail,
  TimeSlotAvailabilityDto,
  TimeSlotDto
} from "@schedule-share/api-client";

import {
  buildCandidateResultComparisonDetails,
  buildCandidateResultDetails,
  candidateResultReasonCopy,
  describeCandidateLeadReason,
  describeCandidateResultInsight,
  type CandidateResultLocale,
  type CandidateResultReasonCopy
} from "./candidate-result-reasons";
import {
  buildCandidatePollResultCopyText,
  buildCandidatePollResults,
  type CandidatePollResultItem
} from "./candidate-results";
import { CopyRankedSlotButton } from "./manage/copy-ranked-slot-button";
import { ConfirmFinalTimeButton } from "./manage/final-time-control";
import { confirmFinalTimeButtonCopy } from "./manage/manage-copy";
import styles from "./page.module.css";

interface CandidatePollResultsPanelCopy {
  readonly availableLabel: string;
  readonly availableMaybeScore: (available: number, total: number, maybe: number) => string;
  readonly availableScore: (available: number, total: number) => string;
  readonly candidateFallback: (candidateNumber: number) => string;
  readonly comparisonAria: string;
  readonly comparisonTitle: string;
  readonly copyFallbackAriaLabel: string;
  readonly copyFailedLabel: string;
  readonly copyIdleLabel: string;
  readonly copiedLabel: string;
  readonly currentBest: string;
  readonly dateSeparator: string;
  readonly detailAria: string;
  readonly emptyBody: string;
  readonly emptyName: string;
  readonly emptyTitle: string;
  readonly firstPreferenceLabel: string;
  readonly maybeLabel: string;
  readonly noneName: string;
  readonly participantCount: (count: number) => string;
  readonly preferenceAverage: (firstPreference: number, averageRank: string) => string;
  readonly preferenceFirstOnly: (firstPreference: number) => string;
  readonly rangeSeparator: string;
  readonly supportPercent: (percent: number) => string;
  readonly tiedBest: (count: number) => string;
  readonly title: string;
  readonly unavailableLabel: string;
  readonly waitingPercent: string;
  readonly waitingScore: string;
}

const candidatePollResultsPanelCopy: Record<CandidateResultLocale, CandidatePollResultsPanelCopy> =
  {
    "zh-CN": {
      availableLabel: "方便",
      availableMaybeScore: (available, total, maybe) =>
        `${available}/${total} 可用 · ${maybe} 也许`,
      availableScore: (available, total) => `${available}/${total} 可用`,
      candidateFallback: (candidateNumber) => `候选 ${candidateNumber}`,
      comparisonAria: "候选对比",
      comparisonTitle: "对比最佳",
      copyFallbackAriaLabel: "候选时间复制文本",
      copyFailedLabel: "无法自动复制，可手动选中文本。",
      copyIdleLabel: "复制此候选",
      copiedLabel: "已复制",
      currentBest: "当前最佳候选",
      dateSeparator: " 至 ",
      detailAria: "候选缺口",
      emptyBody: "创建者添加候选时间后，这里会显示投票结果。",
      emptyName: "暂无",
      emptyTitle: "还没有候选时间",
      firstPreferenceLabel: "首选",
      maybeLabel: "也许",
      noneName: "无",
      participantCount: (count) => `${count} 人参与`,
      preferenceAverage: (firstPreference, averageRank) =>
        `首选 ${firstPreference} · 平均顺位 #${averageRank}`,
      preferenceFirstOnly: (firstPreference) => `首选 ${firstPreference}`,
      rangeSeparator: "-",
      supportPercent: (percent) => `综合支持 ${percent}%`,
      tiedBest: (count) => `并列最佳 ${count} 个`,
      title: "候选投票结果",
      unavailableLabel: "不方便/未选",
      waitingPercent: "提交后自动排序",
      waitingScore: "等待参与者"
    },
    en: {
      availableLabel: "Yes",
      availableMaybeScore: (available, total, maybe) =>
        `${available}/${total} yes · ${maybe} maybe`,
      availableScore: (available, total) => `${available}/${total} yes`,
      candidateFallback: (candidateNumber) => `Option ${candidateNumber}`,
      comparisonAria: "Candidate comparison",
      comparisonTitle: "Compared with best",
      copyFallbackAriaLabel: "Copy candidate time summary",
      copyFailedLabel: "Automatic copy failed. Select the text manually.",
      copyIdleLabel: "Copy this option",
      copiedLabel: "Copied",
      currentBest: "Current Best",
      dateSeparator: " to ",
      detailAria: "Candidate gaps",
      emptyBody: "After the organizer adds candidate times, vote results will appear here.",
      emptyName: "None yet",
      emptyTitle: "No candidate times yet",
      firstPreferenceLabel: "First choice",
      maybeLabel: "Maybe",
      noneName: "None",
      participantCount: (count) => `${count} participants`,
      preferenceAverage: (firstPreference, averageRank) =>
        `${firstPreference} first-choice · avg rank #${averageRank}`,
      preferenceFirstOnly: (firstPreference) => `${firstPreference} first-choice`,
      rangeSeparator: "-",
      supportPercent: (percent) => `Weighted support ${percent}%`,
      tiedBest: (count) => `${count} tied best`,
      title: "Candidate Poll Results",
      unavailableLabel: "No/not selected",
      waitingPercent: "Ranks after submissions",
      waitingScore: "Waiting for participants"
    }
  };

export function CandidatePollResultsPanel({
  finalTimeControls,
  locale = "zh-CN",
  participants,
  scheduleTitle,
  slots
}: {
  readonly finalTimeControls?: CandidateFinalTimeControls;
  readonly locale?: CandidateResultLocale;
  readonly participants: GetScheduleResponse["participants"];
  readonly scheduleTitle?: string;
  readonly slots: GetScheduleResponse["results"]["slotResults"];
}) {
  const copy = candidatePollResultsPanelCopy[locale];
  const reasonCopy = candidateResultReasonCopy[locale];
  const results = buildCandidatePollResults({ locale, participants, slots });
  const totalParticipantCount = participants.length;
  const bestResults = results.filter((result) => result.isBest);
  const leadResult = results[0];
  const leadReason = describeCandidateLeadReason(results, totalParticipantCount, reasonCopy);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{copy.title}</h2>
        <span>{copy.participantCount(totalParticipantCount)}</span>
      </div>

      {leadResult === undefined ? (
        <div className={styles.emptyState}>
          <strong>{copy.emptyTitle}</strong>
          <p>{copy.emptyBody}</p>
        </div>
      ) : (
        <div className={styles.candidateResults}>
          <div className={styles.candidateLead}>
            <div className={styles.candidateLeadText}>
              <span className={styles.candidateBadge}>
                <Trophy aria-hidden="true" size={15} />
                {bestResults.length > 1 ? copy.tiedBest(bestResults.length) : copy.currentBest}
              </span>
              <h3>{formatCandidateTitle(leadResult, copy)}</h3>
              <p>
                {formatLocalDateRange(leadResult.slot, copy)}{" "}
                {formatLocalTimeRange(leadResult.slot, copy)}
              </p>
              {leadReason.length > 0 ? (
                <span className={styles.candidateLeadReason}>{leadReason}</span>
              ) : null}
            </div>
            <div className={styles.candidateLeadScore}>
              <strong>{formatCandidateScore(leadResult, totalParticipantCount, copy)}</strong>
              <span>{formatCandidatePercent(leadResult, totalParticipantCount, copy)}</span>
            </div>
          </div>

          <div className={styles.candidateList}>
            {results.map((result) => (
              <CandidatePollResultRow
                copy={copy}
                finalTimeControls={finalTimeControls}
                key={
                  result.slot.candidateTimeOptionId ??
                  `${result.slot.startUtc}-${result.slot.endUtc}`
                }
                leadResult={leadResult}
                locale={locale}
                reasonCopy={reasonCopy}
                result={result}
                scheduleTitle={scheduleTitle}
                totalParticipantCount={totalParticipantCount}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface CandidateFinalTimeControls {
  readonly ownerKey: string;
  readonly publicId: string;
  readonly selectedFinalTime: TimeSlotDto | null;
  readonly status: ScheduleDetail["status"];
}

function CandidatePollResultRow({
  copy,
  finalTimeControls,
  leadResult,
  locale,
  reasonCopy,
  result,
  scheduleTitle,
  totalParticipantCount
}: {
  readonly copy: CandidatePollResultsPanelCopy;
  readonly finalTimeControls?: CandidateFinalTimeControls;
  readonly leadResult?: CandidatePollResultItem;
  readonly locale: CandidateResultLocale;
  readonly reasonCopy: CandidateResultReasonCopy;
  readonly result: CandidatePollResultItem;
  readonly scheduleTitle?: string;
  readonly totalParticipantCount: number;
}) {
  const selectedFinalTime = finalTimeControls?.selectedFinalTime;
  const isSelected =
    selectedFinalTime !== undefined &&
    selectedFinalTime !== null &&
    selectedFinalTime.startUtc === result.slot.startUtc &&
    selectedFinalTime.endUtc === result.slot.endUtc;
  const insight = describeCandidateResultInsight(result, totalParticipantCount, reasonCopy);
  const detailItems = buildCandidateResultDetails(result, totalParticipantCount, reasonCopy);
  const comparisonItems = buildCandidateResultComparisonDetails(result, leadResult, reasonCopy);
  const copyText =
    scheduleTitle === undefined
      ? undefined
      : buildCandidatePollResultCopyText({
          leadResult,
          locale,
          result,
          scheduleTitle,
          totalParticipantCount
        });

  return (
    <article className={styles.candidateItem}>
      <div className={styles.candidateRank}>{result.rank}</div>
      <div className={styles.candidateBody}>
        <div className={styles.candidateItemHeader}>
          <div>
            <strong>{formatCandidateTitle(result, copy)}</strong>
            <span>
              {formatLocalDateRange(result.slot, copy)} {formatLocalTimeRange(result.slot, copy)}
            </span>
          </div>
          <div className={styles.candidateItemActions}>
            <p>{formatCandidateScore(result, totalParticipantCount, copy)}</p>
            <span>{formatCandidatePercent(result, totalParticipantCount, copy)}</span>
            {result.preferenceRankCount > 0 ? (
              <span>{formatPreferenceSummary(result, copy)}</span>
            ) : null}
            {finalTimeControls === undefined ? null : (
              <>
                {copyText === undefined ? null : (
                  <CopyRankedSlotButton
                    copiedLabel={copy.copiedLabel}
                    copyFailedLabel={copy.copyFailedLabel}
                    fallbackAriaLabel={copy.copyFallbackAriaLabel}
                    idleLabel={copy.copyIdleLabel}
                    text={copyText}
                  />
                )}
                <ConfirmFinalTimeButton
                  isSelected={isSelected}
                  locale={locale}
                  ownerKey={finalTimeControls.ownerKey}
                  publicId={finalTimeControls.publicId}
                  status={finalTimeControls.status}
                  time={result.slot}
                  copy={confirmFinalTimeButtonCopy[locale]}
                />
              </>
            )}
          </div>
        </div>

        <p className={styles.candidateInsight}>{insight}</p>
        {detailItems.length > 0 ? (
          <ul aria-label={copy.detailAria} className={styles.candidateDetailList}>
            {detailItems.map((item) => (
              <li className={candidateDetailClassName(item.tone)} key={item.label}>
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}
        {comparisonItems.length > 0 ? (
          <div aria-label={copy.comparisonAria} className={styles.candidateComparison}>
            <span>{copy.comparisonTitle}</span>
            <ul className={styles.candidateDetailList}>
              {comparisonItems.map((item) => (
                <li className={candidateDetailClassName(item.tone)} key={item.label}>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.candidateMeter} aria-hidden="true">
          <span
            className={styles.candidateMeterAvailable}
            style={{ width: `${result.availablePercent}%` }}
          />
          <span
            className={styles.candidateMeterMaybe}
            style={{ width: `${result.maybePercent}%` }}
          />
        </div>

        <div className={styles.candidateNameGrid}>
          <CandidateNameGroup
            emptyLabel={copy.emptyName}
            icon={<CheckCircle2 aria-hidden="true" size={15} />}
            label={copy.availableLabel}
            names={result.availableNames}
          />
          <CandidateNameGroup
            emptyLabel={copy.emptyName}
            icon={<Star aria-hidden="true" size={15} />}
            label={copy.firstPreferenceLabel}
            names={result.firstPreferenceNames}
          />
          <CandidateNameGroup
            emptyLabel={copy.emptyName}
            icon={<CircleHelp aria-hidden="true" size={15} />}
            label={copy.maybeLabel}
            names={result.maybeNames}
          />
          {totalParticipantCount > 0 ? (
            <CandidateNameGroup
              emptyLabel={copy.noneName}
              icon={<CircleSlash aria-hidden="true" size={15} />}
              label={copy.unavailableLabel}
              names={result.unavailableNames}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CandidateNameGroup({
  emptyLabel,
  icon,
  label,
  names
}: {
  readonly emptyLabel: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly names: readonly string[];
}) {
  return (
    <div className={styles.candidateNameGroup}>
      <span className={styles.candidateNameLabel}>
        {icon}
        {label}
      </span>
      <div className={styles.candidateNameList}>
        {names.length > 0 ? (
          names.map((name) => (
            <span className={styles.candidateName} key={name}>
              {name}
            </span>
          ))
        ) : (
          <span className={styles.candidateNameMuted}>{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

function formatCandidateTitle(
  result: CandidatePollResultItem,
  copy: CandidatePollResultsPanelCopy
): string {
  return result.slot.label ?? copy.candidateFallback(result.candidateNumber);
}

function formatCandidateScore(
  result: CandidatePollResultItem,
  totalParticipantCount: number,
  copy: CandidatePollResultsPanelCopy
): string {
  if (totalParticipantCount === 0) {
    return copy.waitingScore;
  }

  const maybeCount = result.slot.maybeParticipantCount ?? result.maybeNames.length;

  if (maybeCount === 0) {
    return copy.availableScore(result.slot.availableParticipantCount, totalParticipantCount);
  }

  return copy.availableMaybeScore(
    result.slot.availableParticipantCount,
    totalParticipantCount,
    maybeCount
  );
}

function formatCandidatePercent(
  result: CandidatePollResultItem,
  totalParticipantCount: number,
  copy: CandidatePollResultsPanelCopy
): string {
  if (totalParticipantCount === 0) {
    return copy.waitingPercent;
  }

  return copy.supportPercent(result.decisionPercent);
}

function formatPreferenceSummary(
  result: CandidatePollResultItem,
  copy: CandidatePollResultsPanelCopy
): string {
  const averageRank =
    result.averagePreferenceRank === undefined
      ? ""
      : formatPreferenceRank(result.averagePreferenceRank);

  return averageRank.length === 0
    ? copy.preferenceFirstOnly(result.firstPreferenceParticipantCount)
    : copy.preferenceAverage(result.firstPreferenceParticipantCount, averageRank);
}

function formatPreferenceRank(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

function candidateDetailClassName(tone: "neutral" | "success" | "warning"): string {
  if (tone === "success") {
    return `${styles.candidateDetail} ${styles.candidateDetailSuccess}`;
  }

  if (tone === "warning") {
    return `${styles.candidateDetail} ${styles.candidateDetailWarning}`;
  }

  return styles.candidateDetail ?? "";
}

function formatLocalDateRange(
  value: Pick<TimeSlotAvailabilityDto, "localStartDate" | "localEndDate">,
  copy: CandidatePollResultsPanelCopy
): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return `${value.localStartDate}${copy.dateSeparator}${value.localEndDate}`;
}

function formatLocalTimeRange(
  value: Pick<TimeSlotAvailabilityDto, "localStartTime" | "localEndTime">,
  copy: CandidatePollResultsPanelCopy
): string {
  return `${value.localStartTime}${copy.rangeSeparator}${value.localEndTime}`;
}
