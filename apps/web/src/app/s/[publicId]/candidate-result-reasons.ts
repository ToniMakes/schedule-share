import type { CandidatePollResultItem } from "./candidate-results";

export type CandidateResultLocale = "en" | "zh-CN";

export interface CandidateResultDetail {
  readonly label: string;
  readonly tone: "neutral" | "success" | "warning";
}

export interface CandidateResultReasonCopy {
  readonly allAcceptable: string;
  readonly allAvailable: string;
  readonly availableSameAsBest: string;
  readonly firstPreferenceSameAsBest: string;
  readonly firstPreferenceCount: (count: number) => string;
  readonly gainedAvailable: (names: string) => string;
  readonly gainedFirstPreference: (names: string) => string;
  readonly insightAllAcceptable: (available: number, maybe: number) => string;
  readonly insightAllAvailable: string;
  readonly insightFirstPreference: (firstPreference: number, unavailable: number) => string;
  readonly insightMissing: (unavailable: number) => string;
  readonly insightMixed: (available: number, maybe: number, unavailable: number) => string;
  readonly insightNoConfirmed: (maybe: number, unavailable: number) => string;
  readonly insightWaiting: string;
  readonly leadAvailableCount: (lead: number, next: number) => string;
  readonly leadAverageRank: (leadRank: string, nextRank: string) => string;
  readonly leadEarlierTime: string;
  readonly leadFirstPreferenceCount: (lead: number, next: number) => string;
  readonly leadMaybeCount: (lead: number, next: number) => string;
  readonly leadOnlyCandidate: string;
  readonly leadSameMetrics: string;
  readonly leadSupportPercent: (lead: number, next: number) => string;
  readonly leadTied: (count: number) => string;
  readonly leadWaiting: string;
  readonly lostAvailable: (names: string) => string;
  readonly lostFirstPreference: (names: string) => string;
  readonly maybeCount: (count: number) => string;
  readonly moreConfirmedNeeded: (count: number) => string;
  readonly nameSeparator: string;
  readonly notAvailableOrMissing: (count: number) => string;
  readonly notRanked: string;
  readonly supportBehind: (percent: number) => string;
  readonly supportSameAsBest: string;
  readonly truncatedNames: (head: string, extraCount: number, totalCount: number) => string;
}

export const candidateResultReasonCopy: Record<CandidateResultLocale, CandidateResultReasonCopy> = {
  "zh-CN": {
    allAcceptable: "全员至少可接受",
    allAvailable: "全员方便",
    availableSameAsBest: "方便人选与最佳相同",
    firstPreferenceSameAsBest: "首选人选与最佳相同",
    firstPreferenceCount: (count) => `${count} 人首选`,
    gainedAvailable: (names) => `新增方便：${names}`,
    gainedFirstPreference: (names) => `首选转入：${names}`,
    insightAllAcceptable: (available, maybe) =>
      `结果：所有参与者都能接受（${available} 人方便 · ${maybe} 人必要时可以）`,
    insightAllAvailable: "结果：所有参与者都方便",
    insightFirstPreference: (firstPreference, unavailable) =>
      `回应：${firstPreference} 人将此项列为首选；另有 ${unavailable} 人不方便或未回应`,
    insightMissing: (unavailable) => `回应：${unavailable} 人不方便或未回应`,
    insightMixed: (available, maybe, unavailable) =>
      `回应：${available} 人方便，${maybe} 人必要时可以，${unavailable} 人不方便或未回应`,
    insightNoConfirmed: (maybe, unavailable) =>
      `回应：暂时没有人选择方便，${maybe} 人必要时可以，${unavailable} 人不方便或未回应`,
    insightWaiting: "等待大家回应",
    leadAvailableCount: (lead, next) => `排序依据：方便人数更多（${lead} 对 ${next}）`,
    leadAverageRank: (leadRank, nextRank) =>
      `排序依据：平均顺位更靠前（#${leadRank} 对 #${nextRank}）`,
    leadEarlierTime: "排序依据：时间更早",
    leadFirstPreferenceCount: (lead, next) => `排序依据：首选人数领先（${lead} 对 ${next}）`,
    leadMaybeCount: (lead, next) => `排序依据：必要时可以的人数较多（${lead} 对 ${next}）`,
    leadOnlyCandidate: "排序依据：目前唯一候选",
    leadSameMetrics: "排序依据：排序指标相同",
    leadSupportPercent: (lead, next) => `排序依据：综合支持领先（${lead}% 对 ${next}%）`,
    leadTied: (count) => `排序依据：${count} 个候选并列最佳`,
    leadWaiting: "排序依据：等待大家回应",
    lostAvailable: (names) => `此候选不方便：${names}`,
    lostFirstPreference: (names) => `首选落后：${names}`,
    maybeCount: (count) => `${count} 人必要时可以`,
    moreConfirmedNeeded: (count) => `还需要 ${count} 人方便`,
    nameSeparator: "、",
    notAvailableOrMissing: (count) => `${count} 人不方便或未回应`,
    notRanked: "未排序",
    supportBehind: (percent) => `综合支持少 ${percent} 个百分点`,
    supportSameAsBest: "综合支持与最佳相同",
    truncatedNames: (head, _extraCount, totalCount) => `${head} 等 ${totalCount} 人`
  },
  en: {
    allAcceptable: "Everyone can attend or can attend if needed",
    allAvailable: "Everyone is available",
    availableSameAsBest: "Same available participants as the leading option",
    firstPreferenceSameAsBest: "Same first-choice participants as the leading option",
    firstPreferenceCount: (count) => `${count} first-choice`,
    gainedAvailable: (names) => `Available for: ${names}`,
    gainedFirstPreference: (names) => `First choice for: ${names}`,
    insightAllAcceptable: (available, maybe) =>
      `Responses: everyone can attend (${available} available · ${maybe} if needed)`,
    insightAllAvailable: "Responses: everyone is available",
    insightFirstPreference: (firstPreference, unavailable) =>
      `Responses: ${firstPreference} chose this as their first choice; ${unavailable} are unavailable or haven’t responded`,
    insightMissing: (unavailable) =>
      `Responses: ${unavailable} are unavailable or haven’t responded`,
    insightMixed: (available, maybe, unavailable) =>
      `Responses: ${available} available, ${maybe} if needed, ${unavailable} unavailable or unanswered`,
    insightNoConfirmed: (maybe, unavailable) =>
      `Responses: no one is available yet, ${maybe} if needed, ${unavailable} unavailable or unanswered`,
    insightWaiting: "Waiting for responses",
    leadAvailableCount: (lead, next) =>
      `Ranked by more available participants (${lead} vs ${next})`,
    leadAverageRank: (leadRank, nextRank) =>
      `Ranked by better average preference (#${leadRank} vs #${nextRank})`,
    leadEarlierTime: "Ranked by earlier time",
    leadFirstPreferenceCount: (lead, next) =>
      `Ranked by more first-choice votes (${lead} vs ${next})`,
    leadMaybeCount: (lead, next) => `Ranked by more “if needed” responses (${lead} vs ${next})`,
    leadOnlyCandidate: "Ranked because this is the only option",
    leadSameMetrics: "Ranked by matching tie-break metrics",
    leadSupportPercent: (lead, next) => `Ranked by higher weighted support (${lead}% vs ${next}%)`,
    leadTied: (count) => `${count} options are tied for best`,
    leadWaiting: "Ranked after participants submit",
    lostAvailable: (names) => `Not available for this option: ${names}`,
    lostFirstPreference: (names) => `Loses first choice: ${names}`,
    maybeCount: (count) => `${count} if needed`,
    moreConfirmedNeeded: (count) => `${count} more available needed`,
    nameSeparator: ", ",
    notAvailableOrMissing: (count) => `${count} unavailable or unanswered`,
    notRanked: "not ranked",
    supportBehind: (percent) => `${percent} percentage points behind`,
    supportSameAsBest: "Same weighted support as the best option",
    truncatedNames: (head, extraCount) => `${head}, and ${extraCount} more`
  }
};

const defaultReasonCopy = candidateResultReasonCopy["zh-CN"];

export function describeCandidateLeadReason(
  results: readonly CandidatePollResultItem[],
  totalParticipantCount: number,
  copy: CandidateResultReasonCopy = defaultReasonCopy
): string {
  const leadResult = results[0];

  if (leadResult === undefined) {
    return "";
  }

  if (totalParticipantCount === 0 || leadResult.decisionScore === 0) {
    return copy.leadWaiting;
  }

  const tiedBestCount = results.filter((result) => result.isBest).length;

  if (tiedBestCount > 1) {
    return copy.leadTied(tiedBestCount);
  }

  const nextResult = results[1];

  if (nextResult === undefined) {
    return copy.leadOnlyCandidate;
  }

  if (leadResult.decisionScore > nextResult.decisionScore) {
    return copy.leadSupportPercent(leadResult.decisionPercent, nextResult.decisionPercent);
  }

  if (leadResult.availableParticipantCount > nextResult.availableParticipantCount) {
    return copy.leadAvailableCount(
      leadResult.availableParticipantCount,
      nextResult.availableParticipantCount
    );
  }

  if (leadResult.maybeParticipantCount > nextResult.maybeParticipantCount) {
    return copy.leadMaybeCount(leadResult.maybeParticipantCount, nextResult.maybeParticipantCount);
  }

  if (leadResult.firstPreferenceParticipantCount > nextResult.firstPreferenceParticipantCount) {
    return copy.leadFirstPreferenceCount(
      leadResult.firstPreferenceParticipantCount,
      nextResult.firstPreferenceParticipantCount
    );
  }

  if (averagePreferenceRankValue(leadResult) < averagePreferenceRankValue(nextResult)) {
    return copy.leadAverageRank(
      formatPreferenceRank(averagePreferenceRankValue(leadResult), copy),
      formatPreferenceRank(averagePreferenceRankValue(nextResult), copy)
    );
  }

  if (leadResult.slot.startUtc < nextResult.slot.startUtc) {
    return copy.leadEarlierTime;
  }

  return copy.leadSameMetrics;
}

export function describeCandidateResultInsight(
  result: CandidatePollResultItem,
  totalParticipantCount: number,
  copy: CandidateResultReasonCopy = defaultReasonCopy
): string {
  if (totalParticipantCount === 0) {
    return copy.insightWaiting;
  }

  if (result.availableParticipantCount === totalParticipantCount) {
    return copy.insightAllAvailable;
  }

  if (result.unavailableParticipantCount === 0) {
    return copy.insightAllAcceptable(
      result.availableParticipantCount,
      result.maybeParticipantCount
    );
  }

  if (result.availableParticipantCount === 0 && result.maybeParticipantCount > 0) {
    return copy.insightNoConfirmed(
      result.maybeParticipantCount,
      result.unavailableParticipantCount
    );
  }

  if (result.firstPreferenceParticipantCount > 0) {
    return copy.insightFirstPreference(
      result.firstPreferenceParticipantCount,
      result.unavailableParticipantCount
    );
  }

  if (result.maybeParticipantCount > 0) {
    return copy.insightMixed(
      result.availableParticipantCount,
      result.maybeParticipantCount,
      result.unavailableParticipantCount
    );
  }

  return copy.insightMissing(result.unavailableParticipantCount);
}

export function buildCandidateResultDetails(
  result: CandidatePollResultItem,
  totalParticipantCount: number,
  copy: CandidateResultReasonCopy = defaultReasonCopy
): CandidateResultDetail[] {
  if (totalParticipantCount === 0) {
    return [{ label: copy.leadWaiting, tone: "neutral" }];
  }

  if (result.availableParticipantCount === totalParticipantCount) {
    return [{ label: copy.allAvailable, tone: "success" }];
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
    details.push({ label: copy.allAcceptable, tone: "success" });
  } else {
    details.push({ label: copy.notAvailableOrMissing(unavailableOrMissingCount), tone: "warning" });
  }

  if (needsConfirmedAvailableCount > 0) {
    details.push({
      label: copy.moreConfirmedNeeded(needsConfirmedAvailableCount),
      tone: "neutral"
    });
  }

  if (result.maybeParticipantCount > 0) {
    details.push({ label: copy.maybeCount(result.maybeParticipantCount), tone: "neutral" });
  }

  if (result.firstPreferenceParticipantCount > 0) {
    details.push({
      label: copy.firstPreferenceCount(result.firstPreferenceParticipantCount),
      tone: "success"
    });
  }

  return details;
}

export function buildCandidateResultComparisonDetails(
  result: CandidatePollResultItem,
  leadResult: CandidatePollResultItem | undefined,
  copy: CandidateResultReasonCopy = defaultReasonCopy
): CandidateResultDetail[] {
  if (leadResult === undefined || isSameCandidateResult(result, leadResult)) {
    return [];
  }

  const details: CandidateResultDetail[] = [];
  const decisionPercentGap = leadResult.decisionPercent - result.decisionPercent;

  if (decisionPercentGap > 0) {
    details.push({ label: copy.supportBehind(decisionPercentGap), tone: "warning" });
  } else if (decisionPercentGap === 0) {
    details.push({ label: copy.supportSameAsBest, tone: "neutral" });
  }

  const gainedAvailableNames = differenceNames(result.availableNames, leadResult.availableNames);
  const lostAvailableNames = differenceNames(leadResult.availableNames, result.availableNames);

  if (gainedAvailableNames.length > 0) {
    details.push({
      label: copy.gainedAvailable(formatParticipantNames(gainedAvailableNames, copy)),
      tone: "success"
    });
  }

  if (lostAvailableNames.length > 0) {
    details.push({
      label: copy.lostAvailable(formatParticipantNames(lostAvailableNames, copy)),
      tone: "warning"
    });
  }

  if (gainedAvailableNames.length === 0 && lostAvailableNames.length === 0) {
    details.push({ label: copy.availableSameAsBest, tone: "neutral" });
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
        label: copy.gainedFirstPreference(formatParticipantNames(gainedFirstPreferenceNames, copy)),
        tone: "success"
      });
    }

    if (lostFirstPreferenceNames.length > 0) {
      details.push({
        label: copy.lostFirstPreference(formatParticipantNames(lostFirstPreferenceNames, copy)),
        tone: "warning"
      });
    }

    if (gainedFirstPreferenceNames.length === 0 && lostFirstPreferenceNames.length === 0) {
      details.push({ label: copy.firstPreferenceSameAsBest, tone: "neutral" });
    }
  }

  return details;
}

function averagePreferenceRankValue(result: CandidatePollResultItem): number {
  return result.averagePreferenceRank ?? Number.POSITIVE_INFINITY;
}

function formatPreferenceRank(value: number, copy: CandidateResultReasonCopy): string {
  if (!Number.isFinite(value)) {
    return copy.notRanked;
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

function formatParticipantNames(names: readonly string[], copy: CandidateResultReasonCopy): string {
  if (names.length <= 2) {
    return names.join(copy.nameSeparator);
  }

  return copy.truncatedNames(
    names.slice(0, 2).join(copy.nameSeparator),
    names.length - 2,
    names.length
  );
}
