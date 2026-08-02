import type { CandidateVoteResponse } from "@schedule-share/api-client";

import { slotKey } from "./availability-slot-grid";
import type { CandidatePreferenceMove } from "./candidate-vote-list";

type CandidatePreferenceSlot = {
  readonly endUtc: string;
  readonly startUtc: string;
};

export function selectedCandidatePreferenceKeys(
  slots: readonly CandidatePreferenceSlot[],
  responsesBySlotKey: ReadonlyMap<string, CandidateVoteResponse>
): Set<string> {
  return new Set(
    slots
      .map(slotKey)
      .filter((key) => (responsesBySlotKey.get(key) ?? "unavailable") !== "unavailable")
  );
}

export function updateCandidatePreferenceRanks(
  ranksBySlotKey: ReadonlyMap<string, number>,
  slot: CandidatePreferenceSlot,
  activeSlotKeys: ReadonlySet<string>,
  move: CandidatePreferenceMove
): Map<string, number> {
  const key = slotKey(slot);
  const compactRanks = compactCandidatePreferenceRanks(ranksBySlotKey, activeSlotKeys);

  if (!activeSlotKeys.has(key)) {
    return compactRanks;
  }

  const currentRank = compactRanks.get(key);

  if (currentRank === undefined || move === "append") {
    compactRanks.set(key, compactRanks.size + 1);
    return compactCandidatePreferenceRanks(compactRanks, activeSlotKeys);
  }

  const nextRank = move === "up" ? currentRank - 1 : currentRank + 1;

  if (nextRank < 1 || nextRank > compactRanks.size) {
    return compactRanks;
  }

  for (const [candidateKey, rank] of compactRanks.entries()) {
    if (rank === nextRank) {
      compactRanks.set(candidateKey, currentRank);
      break;
    }
  }

  compactRanks.set(key, nextRank);
  return compactCandidatePreferenceRanks(compactRanks, activeSlotKeys);
}

export function reorderCandidatePreferenceRanks(
  ranksBySlotKey: ReadonlyMap<string, number>,
  sourceSlot: CandidatePreferenceSlot,
  targetSlot: CandidatePreferenceSlot,
  activeSlotKeys: ReadonlySet<string>
): Map<string, number> {
  const compactRanks = compactCandidatePreferenceRanks(ranksBySlotKey, activeSlotKeys);
  const sourceKey = slotKey(sourceSlot);
  const targetKey = slotKey(targetSlot);

  if (sourceKey === targetKey || !activeSlotKeys.has(sourceKey) || !activeSlotKeys.has(targetKey)) {
    return compactRanks;
  }

  if (!compactRanks.has(sourceKey) || !compactRanks.has(targetKey)) {
    return compactRanks;
  }

  const orderedKeys = [...compactRanks.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
  const sourceIndex = orderedKeys.indexOf(sourceKey);
  const targetIndex = orderedKeys.indexOf(targetKey);

  if (sourceIndex === -1 || targetIndex === -1) {
    return compactRanks;
  }

  orderedKeys.splice(sourceIndex, 1);
  orderedKeys.splice(targetIndex, 0, sourceKey);

  return new Map(orderedKeys.map((key, index) => [key, index + 1]));
}

export function compactCandidatePreferenceRanks(
  ranksBySlotKey: ReadonlyMap<string, number>,
  activeSlotKeys: ReadonlySet<string>
): Map<string, number> {
  return new Map(
    [...ranksBySlotKey.entries()]
      .filter(([key]) => activeSlotKeys.has(key))
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([key], index) => [key, index + 1])
  );
}
