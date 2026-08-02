import type {
  CandidatePollAvailabilitySlot,
  CandidatePollParticipant,
  CandidatePollResult
} from "../domain/types";
import { fail } from "../errors";
import { normalizeUtcIso } from "../time/slots";

export function buildCandidatePollResults<TSlot extends CandidatePollAvailabilitySlot>(input: {
  readonly participants: readonly CandidatePollParticipant[];
  readonly slots: readonly TSlot[];
}): CandidatePollResult<TSlot>[] {
  const participantOrder = buildParticipantOrder(input.participants);
  const totalParticipantCount = input.participants.length;
  const mappedResults = input.slots
    .map((slot, index) => {
      const availableParticipantIds = orderParticipantIds(
        slot.availableParticipantIds,
        participantOrder
      );
      const availableParticipantIdSet = new Set(availableParticipantIds);
      const maybeParticipantIds = orderParticipantIds(
        slot.maybeParticipantIds ?? [],
        participantOrder
      ).filter((participantId) => !availableParticipantIdSet.has(participantId));
      const maybeParticipantIdSet = new Set(maybeParticipantIds);
      const availableParticipantCount = slot.availableParticipantCount;
      const maybeParticipantCount = slot.maybeParticipantCount ?? maybeParticipantIds.length;
      const unavailableParticipantIds = input.participants
        .filter(
          (participant) =>
            !availableParticipantIdSet.has(participant.id) &&
            !maybeParticipantIdSet.has(participant.id)
        )
        .map((participant) => participant.id);
      const unavailableParticipantCount = Math.max(
        0,
        totalParticipantCount - availableParticipantCount - maybeParticipantCount
      );
      const decisionScorePoints = availableParticipantCount * 2 + maybeParticipantCount;
      const firstPreferenceParticipantIds = orderParticipantIds(
        slot.firstPreferenceParticipantIds ?? [],
        participantOrder
      );
      const firstPreferenceParticipantCount =
        slot.firstPreferenceParticipantCount ?? firstPreferenceParticipantIds.length;
      const preferenceRankCount = slot.preferenceRankCount ?? 0;
      const preferenceRankSum = slot.preferenceRankSum ?? 0;
      const averagePreferenceRank =
        preferenceRankCount === 0 ? undefined : preferenceRankSum / preferenceRankCount;

      return {
        rank: 0,
        candidateNumber: index + 1,
        slot,
        availableParticipantIds,
        maybeParticipantIds,
        unavailableParticipantIds,
        firstPreferenceParticipantIds,
        availableParticipantCount,
        maybeParticipantCount,
        unavailableParticipantCount,
        firstPreferenceParticipantCount,
        preferenceRankCount,
        ...(averagePreferenceRank === undefined ? {} : { averagePreferenceRank }),
        availablePercent:
          totalParticipantCount === 0
            ? 0
            : Math.round((availableParticipantCount / totalParticipantCount) * 100),
        maybePercent:
          totalParticipantCount === 0
            ? 0
            : Math.round((maybeParticipantCount / totalParticipantCount) * 100),
        decisionScore: decisionScorePoints / 2,
        decisionPercent:
          totalParticipantCount === 0
            ? 0
            : Math.round((decisionScorePoints / 2 / totalParticipantCount) * 100),
        isBest: false
      };
    })
    .sort((a, b) => {
      const scoreDifference = b.decisionScore - a.decisionScore;

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const availableDifference = b.availableParticipantCount - a.availableParticipantCount;

      if (availableDifference !== 0) {
        return availableDifference;
      }

      const maybeDifference = b.maybeParticipantCount - a.maybeParticipantCount;

      if (maybeDifference !== 0) {
        return maybeDifference;
      }

      const firstPreferenceDifference =
        b.firstPreferenceParticipantCount - a.firstPreferenceParticipantCount;

      if (firstPreferenceDifference !== 0) {
        return firstPreferenceDifference;
      }

      const averagePreferenceDifference =
        (a.averagePreferenceRank ?? Number.POSITIVE_INFINITY) -
        (b.averagePreferenceRank ?? Number.POSITIVE_INFINITY);

      if (averagePreferenceDifference !== 0) {
        return averagePreferenceDifference;
      }

      return normalizeUtcIso(a.slot.startUtc).localeCompare(normalizeUtcIso(b.slot.startUtc));
    });
  const leadResult = mappedResults[0];

  return mappedResults.map((result, index) => ({
    ...result,
    rank: index + 1,
    isBest:
      leadResult !== undefined &&
      leadResult.decisionScore > 0 &&
      result.decisionScore === leadResult.decisionScore &&
      result.availableParticipantCount === leadResult.availableParticipantCount &&
      result.maybeParticipantCount === leadResult.maybeParticipantCount &&
      result.firstPreferenceParticipantCount === leadResult.firstPreferenceParticipantCount &&
      (result.averagePreferenceRank ?? Number.POSITIVE_INFINITY) ===
        (leadResult.averagePreferenceRank ?? Number.POSITIVE_INFINITY)
  }));
}

function buildParticipantOrder(
  participants: readonly CandidatePollParticipant[]
): ReadonlyMap<string, number> {
  const participantOrder = new Map<string, number>();

  for (const [index, participant] of participants.entries()) {
    if (participant.id.length === 0) {
      fail("DUPLICATE_PARTICIPANT", "Participant id cannot be empty.");
    }

    if (participantOrder.has(participant.id)) {
      fail("DUPLICATE_PARTICIPANT", "Participant ids must be unique.");
    }

    participantOrder.set(participant.id, index);
  }

  return participantOrder;
}

function orderParticipantIds(
  participantIds: readonly string[],
  participantOrder: ReadonlyMap<string, number>
): string[] {
  return [...new Set(participantIds)].sort(
    (a, b) =>
      (participantOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (participantOrder.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b)
  );
}
