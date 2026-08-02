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
  readonly candidateTimeOptionId?: string;
  readonly startUtc: string;
  readonly endUtc: string;
  readonly timezone: string;
  readonly localStartDate: LocalDate;
  readonly localEndDate: LocalDate;
  readonly localStartTime: LocalTime;
  readonly localEndTime: LocalTime;
  readonly label?: string;
}

export interface CandidateTimeWindow {
  readonly id?: string;
  readonly label?: string;
  readonly startUtc: string;
  readonly endUtc: string;
}

export interface LocalCandidateTimeWindow {
  readonly label?: string;
  readonly localDate: LocalDate;
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
  readonly timezone: string;
}

export type CandidateTimeSlot = TimeSlot;

export interface AvailabilitySlot {
  readonly startUtc: string;
  readonly endUtc: string;
}

export type AvailabilityEntryMethod =
  | "manual_grid"
  | "candidate_vote"
  | "image_import"
  | "text_import"
  | "csv_import"
  | "template"
  | "ics_import"
  | "calendar_sync";

export interface ImportedBusyBlock {
  readonly sourceLabel?: string;
  readonly localDate?: LocalDate;
  readonly dayOfWeek?: DayOfWeek;
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
  readonly timezone: string;
  readonly confidence?: number;
  readonly warnings?: readonly string[];
}

export interface WeeklyAvailabilityWindow {
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
}

export interface AvailabilityTemplate {
  readonly name?: string;
  readonly timezone: string;
  readonly weeklyWindows: readonly WeeklyAvailabilityWindow[];
}

export interface AvailabilityDraft {
  readonly entryMethod: AvailabilityEntryMethod;
  readonly availableSlots: readonly AvailabilitySlot[];
  readonly busyBlocks: readonly ImportedBusyBlock[];
  readonly warnings: readonly string[];
  readonly confidence?: number;
}

export interface ParticipantAvailability {
  readonly participantId: string;
  readonly availableSlots: readonly AvailabilitySlot[];
}

export interface TimeSlotAvailability extends TimeSlot {
  readonly availableParticipantCount: number;
  readonly availableParticipantIds: readonly string[];
  readonly maybeParticipantCount?: number;
  readonly maybeParticipantIds?: readonly string[];
  readonly firstPreferenceParticipantCount?: number;
  readonly firstPreferenceParticipantIds?: readonly string[];
  readonly preferenceRankCount?: number;
  readonly preferenceRankSum?: number;
  readonly isEveryoneAvailable: boolean;
}

export interface CandidatePollParticipant {
  readonly id: string;
}

export interface CandidatePollAvailabilitySlot {
  readonly startUtc: string;
  readonly availableParticipantCount: number;
  readonly availableParticipantIds: readonly string[];
  readonly maybeParticipantCount?: number;
  readonly maybeParticipantIds?: readonly string[];
  readonly firstPreferenceParticipantCount?: number;
  readonly firstPreferenceParticipantIds?: readonly string[];
  readonly preferenceRankCount?: number;
  readonly preferenceRankSum?: number;
}

export interface CandidatePollResult<
  TSlot extends CandidatePollAvailabilitySlot = TimeSlotAvailability
> {
  readonly rank: number;
  readonly candidateNumber: number;
  readonly slot: TSlot;
  readonly availableParticipantIds: readonly string[];
  readonly maybeParticipantIds: readonly string[];
  readonly unavailableParticipantIds: readonly string[];
  readonly firstPreferenceParticipantIds: readonly string[];
  readonly availableParticipantCount: number;
  readonly maybeParticipantCount: number;
  readonly unavailableParticipantCount: number;
  readonly firstPreferenceParticipantCount: number;
  readonly preferenceRankCount: number;
  readonly averagePreferenceRank?: number;
  readonly availablePercent: number;
  readonly maybePercent: number;
  readonly decisionScore: number;
  readonly decisionPercent: number;
  readonly isBest: boolean;
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
