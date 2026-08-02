import type { ParticipantSummary } from "@schedule-share/api-client";

export function formatAvailableParticipantNames(
  participantIds: readonly string[],
  participants: readonly ParticipantSummary[]
): string {
  if (participantIds.length === 0) {
    return "";
  }

  const namesById = new Map(
    participants.map((participant) => [participant.id, participant.displayName])
  );

  return participantIds
    .map((participantId) => namesById.get(participantId) ?? "未知参与者")
    .join("、");
}

export function formatUnavailableParticipantNames(
  availableParticipantIds: readonly string[],
  participants: readonly ParticipantSummary[]
): string {
  if (participants.length === 0) {
    return "";
  }

  const availableParticipantIdSet = new Set(availableParticipantIds);

  return participants
    .filter((participant) => !availableParticipantIdSet.has(participant.id))
    .map((participant) => participant.displayName)
    .join("、");
}
