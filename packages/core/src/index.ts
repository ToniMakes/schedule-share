export { calculateAvailabilitySummary, mergeAvailabilityBlocks } from "./availability/results";
export { CoreError } from "./errors";
export { generateTimeSlots, normalizeUtcIso, slotKey } from "./time/slots";
export type {
  AvailabilityBlock,
  AvailabilitySlot,
  AvailabilitySummary,
  DailyWindow,
  DateRange,
  DayOfWeek,
  LocalDate,
  LocalTime,
  ParticipantAvailability,
  SlotMinutes,
  TimeSlot,
  TimeSlotAvailability,
  TimeSlotConfig
} from "./domain/types";
