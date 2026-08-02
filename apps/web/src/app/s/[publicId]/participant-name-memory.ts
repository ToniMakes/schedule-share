export const PARTICIPANT_DISPLAY_NAME_STORAGE_KEY = "schedule-share:last-participant-display-name";

const PARTICIPANT_DISPLAY_NAME_MAX_LENGTH = 80;

interface ParticipantDisplayNameStorage {
  readonly getItem: (key: string) => string | null;
  readonly removeItem: (key: string) => void;
  readonly setItem: (key: string, value: string) => void;
}

export function normalizeRememberedParticipantDisplayName(
  value: string | null | undefined
): string | undefined {
  const trimmed = value?.trim() ?? "";

  if (trimmed.length === 0 || trimmed.length > PARTICIPANT_DISPLAY_NAME_MAX_LENGTH) {
    return undefined;
  }

  return trimmed;
}

export function readRememberedParticipantDisplayName(
  storage: ParticipantDisplayNameStorage
): string | undefined {
  try {
    const rememberedName = normalizeRememberedParticipantDisplayName(
      storage.getItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY)
    );

    if (rememberedName === undefined) {
      storage.removeItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY);
    }

    return rememberedName;
  } catch {
    return undefined;
  }
}

export function rememberParticipantDisplayName(
  storage: ParticipantDisplayNameStorage,
  displayName: string
): void {
  try {
    const rememberedName = normalizeRememberedParticipantDisplayName(displayName);

    if (rememberedName === undefined) {
      storage.removeItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY);
      return;
    }

    storage.setItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY, rememberedName);
  } catch {
    // Browsers can deny localStorage in private or restricted contexts.
  }
}
