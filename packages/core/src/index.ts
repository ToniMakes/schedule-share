export {
  createAvailabilityDraftFromAvailableSlots,
  createAvailabilityDraftFromBusyBlocks,
  createAvailabilityDraftFromTemplate
} from "./availability/drafts";
export { buildCandidatePollResults } from "./availability/candidate-poll";
export { calculateAvailabilitySummary, mergeAvailabilityBlocks } from "./availability/results";
export { CoreError } from "./errors";
export {
  createCandidateTimeSlots,
  createCandidateTimeWindowFromLocal,
  createTimeSlotFromUtcRange,
  generateTimeSlots,
  normalizeUtcIso,
  slotKey
} from "./time/slots";
export type {
  AvailabilityDraft,
  AvailabilityEntryMethod,
  AvailabilityBlock,
  AvailabilitySlot,
  AvailabilitySummary,
  AvailabilityTemplate,
  CandidatePollAvailabilitySlot,
  CandidatePollParticipant,
  CandidatePollResult,
  CandidateTimeSlot,
  CandidateTimeWindow,
  DailyWindow,
  DateRange,
  DayOfWeek,
  ImportedBusyBlock,
  LocalCandidateTimeWindow,
  LocalDate,
  LocalTime,
  ParticipantAvailability,
  SlotMinutes,
  TimeSlot,
  TimeSlotAvailability,
  TimeSlotConfig,
  WeeklyAvailabilityWindow
} from "./domain/types";
