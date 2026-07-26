export type LocalDate = `${number}-${number}-${number}`;
export type LocalTime = `${number}:${number}`;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type SlotMinutes = 15 | 30 | 60;

export interface DateRange {
  readonly start: LocalDate;
  readonly end: LocalDate;
}

export interface DailyWindow {
  readonly daysOfWeek?: readonly DayOfWeek[];
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
}

export interface TimeSlotConfig {
  readonly timezone: string;
  readonly dateRange: DateRange;
  readonly slotMinutes: SlotMinutes;
  readonly dailyWindows: readonly DailyWindow[];
}

export interface TimeSlot {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly timezone: string;
  readonly localStartDate: LocalDate;
  readonly localEndDate: LocalDate;
  readonly localStartTime: LocalTime;
  readonly localEndTime: LocalTime;
}

export interface AvailabilitySlot {
  readonly startUtc: string;
  readonly endUtc: string;
}

export interface ParticipantAvailability {
  readonly participantId: string;
  readonly availableSlots: readonly AvailabilitySlot[];
}

export interface TimeSlotAvailability extends TimeSlot {
  readonly availableParticipantCount: number;
  readonly availableParticipantIds: readonly string[];
  readonly isEveryoneAvailable: boolean;
}

export interface AvailabilityBlock {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly timezone: string;
  readonly localStartDate: LocalDate;
  readonly localEndDate: LocalDate;
  readonly localStartTime: LocalTime;
  readonly localEndTime: LocalTime;
  readonly slotCount: number;
  readonly availableParticipantCount: number;
  readonly availableParticipantIds: readonly string[];
}

export interface AvailabilitySummary {
  readonly totalParticipantCount: number;
  readonly slotResults: readonly TimeSlotAvailability[];
  readonly everyoneAvailableSlots: readonly TimeSlotAvailability[];
  readonly everyoneAvailableBlocks: readonly AvailabilityBlock[];
  readonly rankedSlots: readonly TimeSlotAvailability[];
}
