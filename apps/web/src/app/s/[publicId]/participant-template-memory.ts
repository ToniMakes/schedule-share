export const PARTICIPANT_TEMPLATE_STORAGE_KEY = "schedule-share:participant-weekly-template";
export const SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY =
  "schedule-share:participant-weekly-templates";
export const MAX_SAVED_PARTICIPANT_TEMPLATES = 12;

export type RememberedTemplateDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RememberedParticipantTemplate {
  readonly daysOfWeek: readonly RememberedTemplateDay[];
  readonly endTime: string;
  readonly startTime: string;
}

export interface SavedParticipantTemplate extends RememberedParticipantTemplate {
  readonly id: string;
  readonly name: string;
}

interface ParticipantTemplateStorage {
  readonly getItem: (key: string) => string | null;
  readonly removeItem: (key: string) => void;
  readonly setItem: (key: string, value: string) => void;
}

const dayOrder = [1, 2, 3, 4, 5, 6, 0] as const satisfies readonly RememberedTemplateDay[];
const dayOrderIndex = new Map(dayOrder.map((day, index) => [day, index]));

export function normalizeRememberedParticipantTemplate(
  value: unknown
): RememberedParticipantTemplate | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const daysOfWeek = normalizeTemplateDays(value.daysOfWeek);
  const startTime = normalizeTime(value.startTime);
  const endTime = normalizeTime(value.endTime);

  if (
    daysOfWeek === undefined ||
    startTime === undefined ||
    endTime === undefined ||
    startTime === endTime
  ) {
    return undefined;
  }

  return {
    daysOfWeek,
    endTime,
    startTime
  };
}

export function normalizeSavedParticipantTemplate(
  value: unknown
): SavedParticipantTemplate | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const rememberedTemplate = normalizeRememberedParticipantTemplate(value);
  const id = normalizeTemplateId(value.id);
  const name = normalizeTemplateName(value.name);

  if (rememberedTemplate === undefined || id === undefined || name === undefined) {
    return undefined;
  }

  return {
    id,
    name,
    ...rememberedTemplate
  };
}

export function readRememberedParticipantTemplate(
  storage: ParticipantTemplateStorage
): RememberedParticipantTemplate | undefined {
  try {
    const rawValue = storage.getItem(PARTICIPANT_TEMPLATE_STORAGE_KEY);

    if (rawValue === null) {
      return undefined;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawValue);
    } catch {
      storage.removeItem(PARTICIPANT_TEMPLATE_STORAGE_KEY);
      return undefined;
    }

    const rememberedTemplate = normalizeRememberedParticipantTemplate(parsed);

    if (rememberedTemplate === undefined) {
      storage.removeItem(PARTICIPANT_TEMPLATE_STORAGE_KEY);
    }

    return rememberedTemplate;
  } catch {
    return undefined;
  }
}

export function readSavedParticipantTemplates(
  storage: ParticipantTemplateStorage
): readonly SavedParticipantTemplate[] {
  try {
    const rawValue = storage.getItem(SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY);

    if (rawValue === null) {
      return [];
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawValue);
    } catch {
      storage.removeItem(SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY);
      return [];
    }

    const savedTemplates = normalizeSavedParticipantTemplates(parsed);

    if (savedTemplates === undefined) {
      storage.removeItem(SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY);
      return [];
    }

    return savedTemplates;
  } catch {
    return [];
  }
}

export function rememberParticipantTemplate(
  storage: ParticipantTemplateStorage,
  template: RememberedParticipantTemplate
): void {
  try {
    const rememberedTemplate = normalizeRememberedParticipantTemplate(template);

    if (rememberedTemplate === undefined) {
      storage.removeItem(PARTICIPANT_TEMPLATE_STORAGE_KEY);
      return;
    }

    storage.setItem(PARTICIPANT_TEMPLATE_STORAGE_KEY, JSON.stringify(rememberedTemplate));
  } catch {
    // Browsers can deny localStorage in private or restricted contexts.
  }
}

export function saveParticipantTemplate(
  storage: ParticipantTemplateStorage,
  template: SavedParticipantTemplate
): readonly SavedParticipantTemplate[] {
  try {
    const savedTemplate = normalizeSavedParticipantTemplate(template);

    if (savedTemplate === undefined) {
      return readSavedParticipantTemplates(storage);
    }

    const savedTemplates = [
      savedTemplate,
      ...readSavedParticipantTemplates(storage).filter(({ id }) => id !== savedTemplate.id)
    ].slice(0, MAX_SAVED_PARTICIPANT_TEMPLATES);

    writeSavedParticipantTemplates(storage, savedTemplates);

    return savedTemplates;
  } catch {
    return [];
  }
}

export function deleteSavedParticipantTemplate(
  storage: ParticipantTemplateStorage,
  templateId: string
): readonly SavedParticipantTemplate[] {
  try {
    const normalizedTemplateId = normalizeTemplateId(templateId);

    if (normalizedTemplateId === undefined) {
      return readSavedParticipantTemplates(storage);
    }

    const savedTemplates = readSavedParticipantTemplates(storage).filter(
      ({ id }) => id !== normalizedTemplateId
    );

    writeSavedParticipantTemplates(storage, savedTemplates);

    return savedTemplates;
  } catch {
    return [];
  }
}

function writeSavedParticipantTemplates(
  storage: ParticipantTemplateStorage,
  templates: readonly SavedParticipantTemplate[]
): void {
  const savedTemplates = normalizeSavedParticipantTemplates(templates) ?? [];

  if (savedTemplates.length === 0) {
    storage.removeItem(SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY);
    return;
  }

  storage.setItem(SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY, JSON.stringify(savedTemplates));
}

function normalizeSavedParticipantTemplates(
  value: unknown
): readonly SavedParticipantTemplate[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const savedTemplates: SavedParticipantTemplate[] = [];
  const seenIds = new Set<string>();

  for (const item of value) {
    const savedTemplate = normalizeSavedParticipantTemplate(item);

    if (savedTemplate === undefined || seenIds.has(savedTemplate.id)) {
      continue;
    }

    savedTemplates.push(savedTemplate);
    seenIds.add(savedTemplate.id);

    if (savedTemplates.length >= MAX_SAVED_PARTICIPANT_TEMPLATES) {
      break;
    }
  }

  return savedTemplates;
}

function normalizeTemplateDays(value: unknown): readonly RememberedTemplateDay[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const days = new Set<RememberedTemplateDay>();

  for (const day of value) {
    if (isTemplateDay(day)) {
      days.add(day);
    }
  }

  if (days.size === 0) {
    return undefined;
  }

  return Array.from(days).sort(
    (left, right) => (dayOrderIndex.get(left) ?? 0) - (dayOrderIndex.get(right) ?? 0)
  );
}

function normalizeTime(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function normalizeTemplateId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > 80) {
    return undefined;
  }

  return trimmed;
}

function normalizeTemplateName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.slice(0, 40);
}

function isTemplateDay(value: unknown): value is RememberedTemplateDay {
  return (
    value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
