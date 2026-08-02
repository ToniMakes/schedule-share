export const PARTICIPANT_EDIT_LINKS_STORAGE_KEY = "schedule-share:participant-edit-links";

const PARTICIPANT_EDIT_LINK_MAX_LENGTH = 2000;
const PARTICIPANT_EDIT_LINK_TEXT_MAX_LENGTH = 120;
const MAX_REMEMBERED_EDIT_LINKS = 50;

export interface RememberedParticipantEditLink {
  readonly displayName: string;
  readonly editUrl: string;
  readonly participantId: string;
  readonly publicId: string;
  readonly rememberedAt: string;
}

interface ParticipantEditLinkStorage {
  readonly getItem: (key: string) => string | null;
  readonly removeItem: (key: string) => void;
  readonly setItem: (key: string, value: string) => void;
}

type RememberedParticipantEditLinkInput = Omit<RememberedParticipantEditLink, "rememberedAt"> & {
  readonly rememberedAt?: string;
};

export function normalizeRememberedParticipantEditLink(
  value: unknown,
  expectedPublicId?: string
): RememberedParticipantEditLink | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const publicId = normalizeText(value.publicId);
  const participantId = normalizeText(value.participantId);
  const displayName = normalizeText(value.displayName);
  const editUrl = normalizeEditUrl(value.editUrl, publicId, participantId);
  const rememberedAt = normalizeRememberedAt(value.rememberedAt);

  if (
    publicId === undefined ||
    participantId === undefined ||
    displayName === undefined ||
    editUrl === undefined ||
    rememberedAt === undefined
  ) {
    return undefined;
  }

  if (expectedPublicId !== undefined && publicId !== expectedPublicId) {
    return undefined;
  }

  return {
    displayName,
    editUrl,
    participantId,
    publicId,
    rememberedAt
  };
}

export function readRememberedParticipantEditLink(
  storage: ParticipantEditLinkStorage,
  publicId: string
): RememberedParticipantEditLink | undefined {
  try {
    const entries = readRememberedParticipantEditLinks(storage);
    const rememberedLink = entries.get(publicId);

    if (rememberedLink === undefined) {
      return undefined;
    }

    return rememberedLink;
  } catch {
    return undefined;
  }
}

export function rememberParticipantEditLink(
  storage: ParticipantEditLinkStorage,
  link: RememberedParticipantEditLinkInput
): void {
  try {
    const rememberedLink = normalizeRememberedParticipantEditLink({
      ...link,
      rememberedAt: link.rememberedAt ?? new Date().toISOString()
    });

    if (rememberedLink === undefined) {
      return;
    }

    const entries = readRememberedParticipantEditLinks(storage);
    entries.set(rememberedLink.publicId, rememberedLink);
    writeRememberedParticipantEditLinks(storage, entries);
  } catch {
    // Browsers can deny localStorage in private or restricted contexts.
  }
}

function readRememberedParticipantEditLinks(
  storage: ParticipantEditLinkStorage
): Map<string, RememberedParticipantEditLink> {
  const rawValue = storage.getItem(PARTICIPANT_EDIT_LINKS_STORAGE_KEY);

  if (rawValue === null) {
    return new Map();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    storage.removeItem(PARTICIPANT_EDIT_LINKS_STORAGE_KEY);
    return new Map();
  }

  if (!isRecord(parsed)) {
    storage.removeItem(PARTICIPANT_EDIT_LINKS_STORAGE_KEY);
    return new Map();
  }

  const entries = new Map<string, RememberedParticipantEditLink>();

  for (const [publicId, value] of Object.entries(parsed)) {
    const rememberedLink = normalizeRememberedParticipantEditLink(value, publicId);

    if (rememberedLink !== undefined) {
      entries.set(publicId, rememberedLink);
    }
  }

  if (entries.size === 0) {
    storage.removeItem(PARTICIPANT_EDIT_LINKS_STORAGE_KEY);
    return entries;
  }

  if (entries.size !== Object.keys(parsed).length) {
    writeRememberedParticipantEditLinks(storage, entries);
  }

  return entries;
}

function writeRememberedParticipantEditLinks(
  storage: ParticipantEditLinkStorage,
  entries: ReadonlyMap<string, RememberedParticipantEditLink>
): void {
  const newestEntries = Array.from(entries.values())
    .sort((left, right) => right.rememberedAt.localeCompare(left.rememberedAt))
    .slice(0, MAX_REMEMBERED_EDIT_LINKS)
    .sort((left, right) => left.publicId.localeCompare(right.publicId));

  storage.setItem(
    PARTICIPANT_EDIT_LINKS_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(newestEntries.map((entry) => [entry.publicId, entry])))
  );
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > PARTICIPANT_EDIT_LINK_TEXT_MAX_LENGTH) {
    return undefined;
  }

  return trimmed;
}

function normalizeEditUrl(
  value: unknown,
  publicId: string | undefined,
  participantId: string | undefined
): string | undefined {
  if (typeof value !== "string" || value.length > PARTICIPANT_EDIT_LINK_MAX_LENGTH) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return undefined;
  }

  if (publicId === undefined || participantId === undefined) {
    return undefined;
  }

  const expectedPaths = new Set([
    `/s/${encodeURIComponent(publicId)}/edit/${encodeURIComponent(participantId)}`,
    `/zh/s/${encodeURIComponent(publicId)}/edit/${encodeURIComponent(participantId)}`
  ]);

  if (!expectedPaths.has(url.pathname)) {
    return undefined;
  }

  return url.toString();
}

function normalizeRememberedAt(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
