export const CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY = "schedule-share:create-schedule-defaults";

export type RememberedScheduleMode = "availability_grid" | "candidate_poll";
export type RememberedSlotMinutes = 15 | 30 | 60;

export interface RememberedScheduleFormDefaults {
  readonly availabilityGrid?: {
    readonly daysOfWeek?: readonly number[];
    readonly endTime?: string;
    readonly startTime?: string;
  };
  readonly scheduleMode?: RememberedScheduleMode;
  readonly slotMinutes?: RememberedSlotMinutes;
  readonly timezone?: string;
}

interface ScheduleFormDefaultsStorage {
  readonly getItem: (key: string) => string | null;
  readonly removeItem: (key: string) => void;
  readonly setItem: (key: string, value: string) => void;
}

const DAY_OPTION_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const VALID_SCHEDULE_MODES = new Set<RememberedScheduleMode>([
  "availability_grid",
  "candidate_poll"
]);
const VALID_SLOT_MINUTES = new Set<RememberedSlotMinutes>([15, 30, 60]);

export function normalizeRememberedScheduleFormDefaults(
  value: unknown
): RememberedScheduleFormDefaults | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const timezone = normalizeTimezone(value.timezone);
  const scheduleMode = normalizeScheduleMode(value.scheduleMode);
  const slotMinutes = normalizeSlotMinutes(value.slotMinutes);
  const availabilityGrid = normalizeAvailabilityGrid(value.availabilityGrid);
  const defaults: RememberedScheduleFormDefaults = {
    ...(availabilityGrid === undefined ? {} : { availabilityGrid }),
    ...(scheduleMode === undefined ? {} : { scheduleMode }),
    ...(slotMinutes === undefined ? {} : { slotMinutes }),
    ...(timezone === undefined ? {} : { timezone })
  };

  return hasRememberedDefaults(defaults) ? defaults : undefined;
}

export function readRememberedScheduleFormDefaults(
  storage: ScheduleFormDefaultsStorage
): RememberedScheduleFormDefaults | undefined {
  let rawValue: string | null;

  try {
    rawValue = storage.getItem(CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY);
  } catch {
    return undefined;
  }

  if (rawValue === null) {
    return undefined;
  }

  try {
    const rememberedDefaults = normalizeRememberedScheduleFormDefaults(JSON.parse(rawValue));

    if (rememberedDefaults === undefined) {
      storage.removeItem(CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY);
    }

    return rememberedDefaults;
  } catch {
    try {
      storage.removeItem(CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY);
    } catch {
      // Browsers can deny localStorage in private or restricted contexts.
    }

    return undefined;
  }
}

export function rememberScheduleFormDefaults(
  storage: ScheduleFormDefaultsStorage,
  defaults: RememberedScheduleFormDefaults
): void {
  try {
    const rememberedDefaults = normalizeRememberedScheduleFormDefaults(defaults);

    if (rememberedDefaults === undefined) {
      storage.removeItem(CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY);
      return;
    }

    storage.setItem(CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY, JSON.stringify(rememberedDefaults));
  } catch {
    // Browsers can deny localStorage in private or restricted contexts.
  }
}

function normalizeTimezone(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : undefined;
}

function normalizeScheduleMode(value: unknown): RememberedScheduleMode | undefined {
  return typeof value === "string" && VALID_SCHEDULE_MODES.has(value as RememberedScheduleMode)
    ? (value as RememberedScheduleMode)
    : undefined;
}

function normalizeSlotMinutes(value: unknown): RememberedSlotMinutes | undefined {
  return typeof value === "number" && VALID_SLOT_MINUTES.has(value as RememberedSlotMinutes)
    ? (value as RememberedSlotMinutes)
    : undefined;
}

function normalizeAvailabilityGrid(
  value: unknown
): RememberedScheduleFormDefaults["availabilityGrid"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const startTime = normalizeTime(value.startTime);
  const endTime = normalizeTime(value.endTime);
  const daysOfWeek = normalizeDaysOfWeek(value.daysOfWeek);
  const availabilityGrid = {
    ...(daysOfWeek === undefined ? {} : { daysOfWeek }),
    ...(endTime === undefined ? {} : { endTime }),
    ...(startTime === undefined ? {} : { startTime })
  };

  return availabilityGrid.daysOfWeek !== undefined ||
    availabilityGrid.endTime !== undefined ||
    availabilityGrid.startTime !== undefined
    ? availabilityGrid
    : undefined;
}

function normalizeTime(value: unknown): string | undefined {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
}

function normalizeDaysOfWeek(value: unknown): readonly number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const selectedDays = new Set(
    value.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
  );

  if (selectedDays.size === 0) {
    return undefined;
  }

  return DAY_OPTION_ORDER.filter((day) => selectedDays.has(day));
}

function hasRememberedDefaults(defaults: RememberedScheduleFormDefaults): boolean {
  return (
    defaults.timezone !== undefined ||
    defaults.scheduleMode !== undefined ||
    defaults.slotMinutes !== undefined ||
    defaults.availabilityGrid !== undefined
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
