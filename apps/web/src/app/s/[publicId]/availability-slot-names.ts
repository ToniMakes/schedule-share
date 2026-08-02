import type { ParticipantSummary } from "@schedule-share/api-client";

interface FormatParticipantNamesOptions {
  readonly separator?: string;
  readonly unknownParticipant?: string;
}

export function formatAvailableParticipantNames(
  participantIds: readonly string[],
  participants: readonly ParticipantSummary[],
  options: FormatParticipantNamesOptions = {}
): string {
  if (participantIds.length === 0) {
    return "";
  }

  const separator = options.separator ?? "、";
  const unknownParticipant = options.unknownParticipant ?? "未知参与者";
  const namesById = new Map(
    participants.map((participant) => [participant.id, participant.displayName])
  );

  return participantIds
    .map((participantId) => namesById.get(participantId) ?? unknownParticipant)
    .join(separator);
}

export function formatUnavailableParticipantNames(
  availableParticipantIds: readonly string[],
  participants: readonly ParticipantSummary[],
  options: FormatParticipantNamesOptions = {}
): string {
  if (participants.length === 0) {
    return "";
  }

  const separator = options.separator ?? "、";
  const availableParticipantIdSet = new Set(availableParticipantIds);

  return participants
    .filter((participant) => !availableParticipantIdSet.has(participant.id))
    .map((participant) => participant.displayName)
    .join(separator);
}
