import { z } from "zod";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);
const utcIsoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
const dayOfWeekSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6)
]);
const slotMinutesSchema = z.union([z.literal(15), z.literal(30), z.literal(60)]);
const scheduleStatusSchema = z.enum(["open", "locked", "archived"]);

export const dailyWindowSchema = z
  .object({
    daysOfWeek: z.array(dayOfWeekSchema).min(1).max(7).optional(),
    startTime: localTimeSchema,
    endTime: localTimeSchema
  })
  .strict()
  .refine((window) => window.startTime !== window.endTime, {
    message: "Daily window start and end time cannot be the same.",
    path: ["endTime"]
  });

export const dateRangeSchema = z
  .object({
    start: localDateSchema,
    end: localDateSchema
  })
  .strict()
  .refine((range) => range.start <= range.end, {
    message: "Date range start must be on or before date range end.",
    path: ["end"]
  });

export const createScheduleRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    timezone: z.string().trim().min(1).max(100),
    dateRange: dateRangeSchema,
    slotMinutes: slotMinutesSchema,
    dailyWindows: z.array(dailyWindowSchema).min(1).max(14)
  })
  .strict();

export const scheduleSummarySchema = z
  .object({
    publicId: z.string(),
    title: z.string(),
    timezone: z.string(),
    status: scheduleStatusSchema
  })
  .strict();

export const scheduleStatusSummarySchema = z
  .object({
    publicId: z.string(),
    status: scheduleStatusSchema
  })
  .strict();

export const scheduleDetailSchema = scheduleSummarySchema
  .extend({
    description: z.string().nullable(),
    dateRange: dateRangeSchema,
    slotMinutes: slotMinutesSchema,
    dailyWindows: z.array(dailyWindowSchema)
  })
  .strict();

export const participantSummarySchema = z
  .object({
    id: z.string(),
    displayName: z.string()
  })
  .strict();

export const timeSlotSchema = z
  .object({
    startUtc: utcIsoSchema,
    endUtc: utcIsoSchema,
    timezone: z.string(),
    localStartDate: localDateSchema,
    localEndDate: localDateSchema,
    localStartTime: localTimeSchema,
    localEndTime: localTimeSchema
  })
  .strict();

export const availabilitySlotInputSchema = z
  .object({
    startUtc: utcIsoSchema,
    endUtc: utcIsoSchema
  })
  .strict()
  .refine((slot) => slot.startUtc < slot.endUtc, {
    message: "Availability slot end must be after start.",
    path: ["endUtc"]
  });

export const participantAvailabilitySchema = participantSummarySchema
  .extend({
    availableSlots: z.array(availabilitySlotInputSchema)
  })
  .strict();

export const timeSlotAvailabilitySchema = timeSlotSchema
  .extend({
    availableParticipantCount: z.number().int().nonnegative(),
    availableParticipantIds: z.array(z.string()),
    isEveryoneAvailable: z.boolean()
  })
  .strict();

export const availabilityBlockSchema = timeSlotSchema
  .extend({
    slotCount: z.number().int().positive(),
    availableParticipantCount: z.number().int().nonnegative(),
    availableParticipantIds: z.array(z.string())
  })
  .strict();

export const availabilityResultsSchema = z
  .object({
    totalParticipantCount: z.number().int().nonnegative(),
    slotResults: z.array(timeSlotAvailabilitySchema),
    everyoneAvailableSlots: z.array(timeSlotAvailabilitySchema),
    everyoneAvailableBlocks: z.array(availabilityBlockSchema),
    rankedSlots: z.array(timeSlotAvailabilitySchema)
  })
  .strict();

export const createScheduleResponseSchema = z
  .object({
    schedule: scheduleSummarySchema,
    shareUrl: z.string().url(),
    ownerUrl: z.string().url()
  })
  .strict();

export const createParticipantAvailabilityRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    availableSlots: z.array(availabilitySlotInputSchema).max(1000)
  })
  .strict();

export const createParticipantAvailabilityResponseSchema = z
  .object({
    participant: participantSummarySchema,
    editUrl: z.string().url()
  })
  .strict();

export const getParticipantAvailabilityResponseSchema = z
  .object({
    schedule: scheduleDetailSchema,
    participant: participantAvailabilitySchema,
    slots: z.array(timeSlotSchema)
  })
  .strict();

export const updateParticipantAvailabilityRequestSchema = z
  .object({
    editKey: z.string().min(1).max(200),
    displayName: z.string().trim().min(1).max(80),
    availableSlots: z.array(availabilitySlotInputSchema).max(1000)
  })
  .strict();

export const updateParticipantAvailabilityResponseSchema = z
  .object({
    participant: participantSummarySchema
  })
  .strict();

export const lockScheduleRequestSchema = z
  .object({
    ownerKey: z.string().min(1).max(200)
  })
  .strict();

export const lockScheduleResponseSchema = z
  .object({
    schedule: scheduleStatusSummarySchema
  })
  .strict();

export const archiveScheduleRequestSchema = z
  .object({
    ownerKey: z.string().min(1).max(200)
  })
  .strict();

export const archiveScheduleResponseSchema = z
  .object({
    schedule: scheduleStatusSummarySchema
  })
  .strict();

export const getScheduleResponseSchema = z
  .object({
    schedule: scheduleDetailSchema,
    participants: z.array(participantSummarySchema),
    results: availabilityResultsSchema
  })
  .strict();

export type AvailabilityBlockDto = z.infer<typeof availabilityBlockSchema>;
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotInputSchema>;
export type AvailabilityResults = z.infer<typeof availabilityResultsSchema>;
export type ArchiveScheduleRequest = z.infer<typeof archiveScheduleRequestSchema>;
export type ArchiveScheduleResponse = z.infer<typeof archiveScheduleResponseSchema>;
export type CreateParticipantAvailabilityRequest = z.infer<
  typeof createParticipantAvailabilityRequestSchema
>;
export type CreateParticipantAvailabilityResponse = z.infer<
  typeof createParticipantAvailabilityResponseSchema
>;
export type GetParticipantAvailabilityResponse = z.infer<
  typeof getParticipantAvailabilityResponseSchema
>;
export type ParticipantAvailability = z.infer<typeof participantAvailabilitySchema>;
export type UpdateParticipantAvailabilityRequest = z.infer<
  typeof updateParticipantAvailabilityRequestSchema
>;
export type UpdateParticipantAvailabilityResponse = z.infer<
  typeof updateParticipantAvailabilityResponseSchema
>;
export type DailyWindowInput = z.infer<typeof dailyWindowSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type CreateScheduleRequest = z.infer<typeof createScheduleRequestSchema>;
export type ScheduleSummary = z.infer<typeof scheduleSummarySchema>;
export type ScheduleStatusSummary = z.infer<typeof scheduleStatusSummarySchema>;
export type ScheduleDetail = z.infer<typeof scheduleDetailSchema>;
export type ParticipantSummary = z.infer<typeof participantSummarySchema>;
export type TimeSlotDto = z.infer<typeof timeSlotSchema>;
export type TimeSlotAvailabilityDto = z.infer<typeof timeSlotAvailabilitySchema>;
export type CreateScheduleResponse = z.infer<typeof createScheduleResponseSchema>;
export type GetScheduleResponse = z.infer<typeof getScheduleResponseSchema>;
export type LockScheduleRequest = z.infer<typeof lockScheduleRequestSchema>;
export type LockScheduleResponse = z.infer<typeof lockScheduleResponseSchema>;
