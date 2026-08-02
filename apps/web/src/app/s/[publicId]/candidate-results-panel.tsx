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
  describeCandidateLeadReason,
  describeCandidateResultInsight
} from "./candidate-result-reasons";
import {
  buildCandidatePollResultCopyText,
  buildCandidatePollResults,
  type CandidatePollResultItem
} from "./candidate-results";
import { CopyRankedSlotButton } from "./manage/copy-ranked-slot-button";
import { ConfirmFinalTimeButton } from "./manage/final-time-control";
import styles from "./page.module.css";

export function CandidatePollResultsPanel({
  finalTimeControls,
  participants,
  scheduleTitle,
  slots
}: {
  readonly finalTimeControls?: CandidateFinalTimeControls;
  readonly participants: GetScheduleResponse["participants"];
  readonly scheduleTitle?: string;
  readonly slots: GetScheduleResponse["results"]["slotResults"];
}) {
  const results = buildCandidatePollResults({ participants, slots });
  const totalParticipantCount = participants.length;
  const bestResults = results.filter((result) => result.isBest);
  const leadResult = results[0];
  const leadReason = describeCandidateLeadReason(results, totalParticipantCount);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>候选投票结果</h2>
        <span>{totalParticipantCount} 人参与</span>
      </div>

      {leadResult === undefined ? (
        <div className={styles.emptyState}>
          <strong>还没有候选时间</strong>
          <p>创建者添加候选时间后，这里会显示投票结果。</p>
        </div>
      ) : (
        <div className={styles.candidateResults}>
          <div className={styles.candidateLead}>
            <div className={styles.candidateLeadText}>
              <span className={styles.candidateBadge}>
                <Trophy aria-hidden="true" size={15} />
                {bestResults.length > 1 ? `并列最佳 ${bestResults.length} 个` : "当前最佳候选"}
              </span>
              <h3>{formatCandidateTitle(leadResult)}</h3>
              <p>
                {formatLocalDateRange(leadResult.slot)} {formatLocalTimeRange(leadResult.slot)}
              </p>
              {leadReason.length > 0 ? (
                <span className={styles.candidateLeadReason}>{leadReason}</span>
              ) : null}
            </div>
            <div className={styles.candidateLeadScore}>
              <strong>{formatCandidateScore(leadResult, totalParticipantCount)}</strong>
              <span>{formatCandidatePercent(leadResult, totalParticipantCount)}</span>
            </div>
          </div>

          <div className={styles.candidateList}>
            {results.map((result) => (
              <CandidatePollResultRow
                finalTimeControls={finalTimeControls}
                key={
                  result.slot.candidateTimeOptionId ??
                  `${result.slot.startUtc}-${result.slot.endUtc}`
                }
                leadResult={leadResult}
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
  finalTimeControls,
  leadResult,
  result,
  scheduleTitle,
  totalParticipantCount
}: {
  readonly finalTimeControls?: CandidateFinalTimeControls;
  readonly leadResult?: CandidatePollResultItem;
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
  const insight = describeCandidateResultInsight(result, totalParticipantCount);
  const detailItems = buildCandidateResultDetails(result, totalParticipantCount);
  const comparisonItems = buildCandidateResultComparisonDetails(result, leadResult);
  const copyText =
    scheduleTitle === undefined
      ? undefined
      : buildCandidatePollResultCopyText({
          leadResult,
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
            <strong>{formatCandidateTitle(result)}</strong>
            <span>
              {formatLocalDateRange(result.slot)} {formatLocalTimeRange(result.slot)}
            </span>
          </div>
          <div className={styles.candidateItemActions}>
            <p>{formatCandidateScore(result, totalParticipantCount)}</p>
            <span>{formatCandidatePercent(result, totalParticipantCount)}</span>
            {result.preferenceRankCount > 0 ? <span>{formatPreferenceSummary(result)}</span> : null}
            {finalTimeControls === undefined ? null : (
              <>
                {copyText === undefined ? null : (
                  <CopyRankedSlotButton
                    fallbackAriaLabel="候选时间复制文本"
                    idleLabel="复制此候选"
                    text={copyText}
                  />
                )}
                <ConfirmFinalTimeButton
                  isSelected={isSelected}
                  ownerKey={finalTimeControls.ownerKey}
                  publicId={finalTimeControls.publicId}
                  status={finalTimeControls.status}
                  time={result.slot}
                />
              </>
            )}
          </div>
        </div>

        <p className={styles.candidateInsight}>{insight}</p>
        {detailItems.length > 0 ? (
          <ul aria-label="候选缺口" className={styles.candidateDetailList}>
            {detailItems.map((item) => (
              <li className={candidateDetailClassName(item.tone)} key={item.label}>
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}
        {comparisonItems.length > 0 ? (
          <div aria-label="候选对比" className={styles.candidateComparison}>
            <span>对比最佳</span>
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
            icon={<CheckCircle2 aria-hidden="true" size={15} />}
            label="方便"
            names={result.availableNames}
            emptyLabel="暂无"
          />
          <CandidateNameGroup
            icon={<Star aria-hidden="true" size={15} />}
            label="首选"
            names={result.firstPreferenceNames}
            emptyLabel="暂无"
          />
          <CandidateNameGroup
            icon={<CircleHelp aria-hidden="true" size={15} />}
            label="也许"
            names={result.maybeNames}
            emptyLabel="暂无"
          />
          {totalParticipantCount > 0 ? (
            <CandidateNameGroup
              icon={<CircleSlash aria-hidden="true" size={15} />}
              label="不方便/未选"
              names={result.unavailableNames}
              emptyLabel="无"
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

function formatCandidatePercent(
  result: CandidatePollResultItem,
  totalParticipantCount: number
): string {
  if (totalParticipantCount === 0) {
    return "提交后自动排序";
  }

  return `综合支持 ${result.decisionPercent}%`;
}

function formatPreferenceSummary(result: CandidatePollResultItem): string {
  const averageRank =
    result.averagePreferenceRank === undefined
      ? ""
      : formatPreferenceRank(result.averagePreferenceRank);

  return averageRank.length === 0
    ? `首选 ${result.firstPreferenceParticipantCount}`
    : `首选 ${result.firstPreferenceParticipantCount} · 平均顺位 #${averageRank}`;
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
  value: Pick<TimeSlotAvailabilityDto, "localStartDate" | "localEndDate">
): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return `${value.localStartDate} 至 ${value.localEndDate}`;
}

function formatLocalTimeRange(
  value: Pick<TimeSlotAvailabilityDto, "localStartTime" | "localEndTime">
): string {
  return `${value.localStartTime}-${value.localEndTime}`;
}
