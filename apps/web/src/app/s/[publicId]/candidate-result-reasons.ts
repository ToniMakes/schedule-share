import type { CandidatePollResultItem } from "./candidate-results";

export interface CandidateResultDetail {
  readonly label: string;
  readonly tone: "neutral" | "success" | "warning";
}

export function describeCandidateLeadReason(
  results: readonly CandidatePollResultItem[],
  totalParticipantCount: number
): string {
  const leadResult = results[0];

  if (leadResult === undefined) {
    return "";
  }

  if (totalParticipantCount === 0 || leadResult.decisionScore === 0) {
    return "排序依据：等待参与者提交";
  }

  const tiedBestCount = results.filter((result) => result.isBest).length;

  if (tiedBestCount > 1) {
    return `排序依据：${tiedBestCount} 个候选并列最佳`;
  }

  const nextResult = results[1];

  if (nextResult === undefined) {
    return "排序依据：目前唯一候选";
  }

  if (leadResult.decisionScore > nextResult.decisionScore) {
    return `排序依据：综合支持领先（${leadResult.decisionPercent}% 对 ${nextResult.decisionPercent}%）`;
  }

  if (leadResult.availableParticipantCount > nextResult.availableParticipantCount) {
    return `排序依据：确定可用人数领先（${leadResult.availableParticipantCount} 对 ${nextResult.availableParticipantCount}）`;
  }

  if (leadResult.maybeParticipantCount > nextResult.maybeParticipantCount) {
    return `排序依据：也许人数领先（${leadResult.maybeParticipantCount} 对 ${nextResult.maybeParticipantCount}）`;
  }

  if (leadResult.firstPreferenceParticipantCount > nextResult.firstPreferenceParticipantCount) {
    return `排序依据：首选人数领先（${leadResult.firstPreferenceParticipantCount} 对 ${nextResult.firstPreferenceParticipantCount}）`;
  }

  if (averagePreferenceRankValue(leadResult) < averagePreferenceRankValue(nextResult)) {
    return `排序依据：平均顺位更靠前（#${formatPreferenceRank(
      averagePreferenceRankValue(leadResult)
    )} 对 #${formatPreferenceRank(averagePreferenceRankValue(nextResult))}）`;
  }

  if (leadResult.slot.startUtc < nextResult.slot.startUtc) {
    return "排序依据：时间更早";
  }

  return "排序依据：排序指标相同";
}

export function describeCandidateResultInsight(
  result: CandidatePollResultItem,
  totalParticipantCount: number
): string {
  if (totalParticipantCount === 0) {
    return "洞察：等待参与者提交";
  }

  if (result.availableParticipantCount === totalParticipantCount) {
    return "洞察：所有参与者都确定方便";
  }

  if (result.unavailableParticipantCount === 0) {
    return `洞察：所有参与者至少可接受（${result.availableParticipantCount} 方便 · ${result.maybeParticipantCount} 也许）`;
  }

  if (result.availableParticipantCount === 0 && result.maybeParticipantCount > 0) {
    return `洞察：暂无确定方便，${result.maybeParticipantCount} 人也许，${result.unavailableParticipantCount} 人不方便或未选`;
  }

  if (result.firstPreferenceParticipantCount > 0) {
    return `洞察：${result.firstPreferenceParticipantCount} 人首选，但还有 ${result.unavailableParticipantCount} 人不方便或未选`;
  }

  if (result.maybeParticipantCount > 0) {
    return `洞察：${result.availableParticipantCount} 人确定方便，${result.maybeParticipantCount} 人也许，${result.unavailableParticipantCount} 人不方便或未选`;
  }

  return `洞察：还有 ${result.unavailableParticipantCount} 人不方便或未选`;
}

export function buildCandidateResultDetails(
  result: CandidatePollResultItem,
  totalParticipantCount: number
): CandidateResultDetail[] {
  if (totalParticipantCount === 0) {
    return [{ label: "等待参与者", tone: "neutral" }];
  }

  if (result.availableParticipantCount === totalParticipantCount) {
    return [{ label: "全员方便", tone: "success" }];
  }

  const unavailableOrMissingCount = Math.max(
    0,
    totalParticipantCount - result.availableParticipantCount - result.maybeParticipantCount
  );
  const needsConfirmedAvailableCount = Math.max(
    0,
    totalParticipantCount - result.availableParticipantCount
  );
  const details: CandidateResultDetail[] = [];

  if (unavailableOrMissingCount === 0) {
    details.push({ label: "全员至少可接受", tone: "success" });
  } else {
    details.push({ label: `${unavailableOrMissingCount} 人不方便/未选`, tone: "warning" });
  }

  if (needsConfirmedAvailableCount > 0) {
    details.push({ label: `还差 ${needsConfirmedAvailableCount} 人确定方便`, tone: "neutral" });
  }

  if (result.maybeParticipantCount > 0) {
    details.push({ label: `${result.maybeParticipantCount} 人也许`, tone: "neutral" });
  }

  if (result.firstPreferenceParticipantCount > 0) {
    details.push({ label: `${result.firstPreferenceParticipantCount} 人首选`, tone: "success" });
  }

  return details;
}

export function buildCandidateResultComparisonDetails(
  result: CandidatePollResultItem,
  leadResult: CandidatePollResultItem | undefined
): CandidateResultDetail[] {
  if (leadResult === undefined || isSameCandidateResult(result, leadResult)) {
    return [];
  }

  const details: CandidateResultDetail[] = [];
  const decisionPercentGap = leadResult.decisionPercent - result.decisionPercent;

  if (decisionPercentGap > 0) {
    details.push({ label: `综合支持少 ${decisionPercentGap} 个百分点`, tone: "warning" });
  } else if (decisionPercentGap === 0) {
    details.push({ label: "综合支持与最佳相同", tone: "neutral" });
  }

  const gainedAvailableNames = differenceNames(result.availableNames, leadResult.availableNames);
  const lostAvailableNames = differenceNames(leadResult.availableNames, result.availableNames);

  if (gainedAvailableNames.length > 0) {
    details.push({
      label: `新增方便：${formatParticipantNames(gainedAvailableNames)}`,
      tone: "success"
    });
  }

  if (lostAvailableNames.length > 0) {
    details.push({
      label: `流失方便：${formatParticipantNames(lostAvailableNames)}`,
      tone: "warning"
    });
  }

  if (gainedAvailableNames.length === 0 && lostAvailableNames.length === 0) {
    details.push({ label: "方便人选与最佳相同", tone: "neutral" });
  }

  if (result.preferenceRankCount > 0 || leadResult.preferenceRankCount > 0) {
    const gainedFirstPreferenceNames = differenceNames(
      result.firstPreferenceNames,
      leadResult.firstPreferenceNames
    );
    const lostFirstPreferenceNames = differenceNames(
      leadResult.firstPreferenceNames,
      result.firstPreferenceNames
    );

    if (gainedFirstPreferenceNames.length > 0) {
      details.push({
        label: `首选转入：${formatParticipantNames(gainedFirstPreferenceNames)}`,
        tone: "success"
      });
    }

    if (lostFirstPreferenceNames.length > 0) {
      details.push({
        label: `首选落后：${formatParticipantNames(lostFirstPreferenceNames)}`,
        tone: "warning"
      });
    }

    if (gainedFirstPreferenceNames.length === 0 && lostFirstPreferenceNames.length === 0) {
      details.push({ label: "首选人选与最佳相同", tone: "neutral" });
    }
  }

  return details;
}

function averagePreferenceRankValue(result: CandidatePollResultItem): number {
  return result.averagePreferenceRank ?? Number.POSITIVE_INFINITY;
}

function formatPreferenceRank(value: number): string {
  if (!Number.isFinite(value)) {
    return "未排序";
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function isSameCandidateResult(
  left: CandidatePollResultItem,
  right: CandidatePollResultItem
): boolean {
  if (
    left.slot.candidateTimeOptionId !== undefined &&
    right.slot.candidateTimeOptionId !== undefined
  ) {
    return left.slot.candidateTimeOptionId === right.slot.candidateTimeOptionId;
  }

  return left.slot.startUtc === right.slot.startUtc && left.slot.endUtc === right.slot.endUtc;
}

function differenceNames(
  names: readonly string[],
  referenceNames: readonly string[]
): readonly string[] {
  const referenceNameSet = new Set(referenceNames);

  return names.filter((name) => !referenceNameSet.has(name));
}

function formatParticipantNames(names: readonly string[]): string {
  if (names.length <= 2) {
    return names.join("、");
  }

  return `${names.slice(0, 2).join("、")} 等 ${names.length} 人`;
}
