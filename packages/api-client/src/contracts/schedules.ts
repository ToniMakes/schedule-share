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
const scheduleModeSchema = z.enum(["availability_grid", "candidate_poll"]);
const scheduleStatusSchema = z.enum(["open", "locked", "archived"]);
const candidateVoteResponseSchema = z.enum(["available", "maybe", "unavailable"]);
const availabilityEntryMethodSchema = z.enum([
  "manual_grid",
  "candidate_vote",
  "image_import",
  "text_import",
  "csv_import",
  "template",
  "ics_import",
  "calendar_sync"
]);

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

export const candidateTimeWindowSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    startUtc: utcIsoSchema,
    endUtc: utcIsoSchema
  })
  .strict()
  .refine((window) => window.startUtc < window.endUtc, {
    message: "Candidate time end must be after start.",
    path: ["endUtc"]
  });

const createScheduleBaseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  timezone: z.string().trim().min(1).max(100),
  slotMinutes: slotMinutesSchema
});

const createAvailabilityGridScheduleRequestSchema = createScheduleBaseSchema
  .extend({
    scheduleMode: z.literal("availability_grid").default("availability_grid"),
    dateRange: dateRangeSchema,
    dailyWindows: z.array(dailyWindowSchema).min(1).max(14),
    candidateWindows: z.undefined().optional()
  })
  .strict();

const createCandidatePollScheduleRequestSchema = createScheduleBaseSchema
  .extend({
    scheduleMode: z.literal("candidate_poll"),
    candidateWindows: z.array(candidateTimeWindowSchema).min(1).max(50),
    dateRange: z.undefined().optional(),
    dailyWindows: z.undefined().optional()
  })
  .strict();

export const createScheduleRequestSchema = z.union([
  createAvailabilityGridScheduleRequestSchema,
  createCandidatePollScheduleRequestSchema
]);

export const scheduleSummarySchema = z
  .object({
    publicId: z.string(),
    title: z.string(),
    timezone: z.string(),
    scheduleMode: scheduleModeSchema,
    status: scheduleStatusSchema
  })
  .strict();

export const scheduleStatusSummarySchema = z
  .object({
    publicId: z.string(),
    status: scheduleStatusSchema
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
    candidateTimeOptionId: z.string().optional(),
    label: z.string().optional(),
    startUtc: utcIsoSchema,
    endUtc: utcIsoSchema,
    timezone: z.string(),
    localStartDate: localDateSchema,
    localEndDate: localDateSchema,
    localStartTime: localTimeSchema,
    localEndTime: localTimeSchema
  })
  .strict();

export const scheduleDetailSchema = scheduleSummarySchema
  .extend({
    description: z.string().nullable(),
    dateRange: dateRangeSchema,
    slotMinutes: slotMinutesSchema,
    dailyWindows: z.array(dailyWindowSchema),
    candidateWindows: z.array(timeSlotSchema),
    finalTime: timeSlotSchema.nullable()
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

export const candidateVoteInputSchema = z
  .object({
    candidateTimeOptionId: z.string().trim().min(1),
    preferenceRank: z.number().int().min(1).max(50).optional(),
    response: candidateVoteResponseSchema
  })
  .strict()
  .refine((vote) => vote.response !== "unavailable" || vote.preferenceRank === undefined, {
    message: "Candidate preference ranks can only be set on available or maybe votes.",
    path: ["preferenceRank"]
  });

export const importedBusyBlockSchema = z
  .object({
    sourceLabel: z.string().trim().max(200).optional(),
    localDate: localDateSchema.optional(),
    dayOfWeek: dayOfWeekSchema.optional(),
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    timezone: z.string().trim().min(1).max(100),
    confidence: z.number().min(0).max(1).optional(),
    warnings: z.array(z.string().trim().min(1).max(500)).max(20).optional()
  })
  .strict()
  .refine((block) => block.startTime !== block.endTime, {
    message: "Busy block start and end time cannot be the same.",
    path: ["endTime"]
  });

export const weeklyAvailabilityWindowSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    startTime: localTimeSchema,
    endTime: localTimeSchema
  })
  .strict()
  .refine((window) => window.startTime !== window.endTime, {
    message: "Template window start and end time cannot be the same.",
    path: ["endTime"]
  });

export const availabilityTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    timezone: z.string().trim().min(1).max(100),
    weeklyWindows: z.array(weeklyAvailabilityWindowSchema).min(1).max(28)
  })
  .strict();

export const participantAvailabilitySchema = participantSummarySchema
  .extend({
    availableSlots: z.array(availabilitySlotInputSchema),
    candidateVotes: z.array(candidateVoteInputSchema).optional()
  })
  .strict();

export const timeSlotAvailabilitySchema = timeSlotSchema
  .extend({
    availableParticipantCount: z.number().int().nonnegative(),
    availableParticipantIds: z.array(z.string()),
    maybeParticipantCount: z.number().int().nonnegative().optional(),
    maybeParticipantIds: z.array(z.string()).optional(),
    firstPreferenceParticipantCount: z.number().int().nonnegative().optional(),
    firstPreferenceParticipantIds: z.array(z.string()).optional(),
    preferenceRankCount: z.number().int().nonnegative().optional(),
    preferenceRankSum: z.number().int().nonnegative().optional(),
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
    availableSlots: z.array(availabilitySlotInputSchema).max(1000).default([]),
    candidateVotes: z.array(candidateVoteInputSchema).max(50).optional()
  })
  .strict()
  .superRefine((input, context) => {
    addDuplicateCandidateVoteIssues(input.candidateVotes, context);
    addDuplicateCandidatePreferenceRankIssues(input.candidateVotes, context);
  });

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
    availableSlots: z.array(availabilitySlotInputSchema).max(1000).default([]),
    candidateVotes: z.array(candidateVoteInputSchema).max(50).optional()
  })
  .strict()
  .superRefine((input, context) => {
    addDuplicateCandidateVoteIssues(input.candidateVotes, context);
    addDuplicateCandidatePreferenceRankIssues(input.candidateVotes, context);
  });

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

export const confirmFinalTimeRequestSchema = z
  .object({
    ownerKey: z.string().min(1).max(200),
    startUtc: utcIsoSchema,
    endUtc: utcIsoSchema
  })
  .strict()
  .refine((input) => input.startUtc < input.endUtc, {
    message: "Final time end must be after start.",
    path: ["endUtc"]
  });

export const finalTimeScheduleSummarySchema = scheduleStatusSummarySchema
  .extend({
    finalTime: timeSlotSchema
  })
  .strict();

export const confirmFinalTimeResponseSchema = z
  .object({
    schedule: finalTimeScheduleSummarySchema
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

export const availabilityPreviewRequestSchema = z
  .object({
    method: z.union([
      z.literal("text_import"),
      z.literal("image_import"),
      z.literal("csv_import"),
      z.literal("ics_import"),
      z.literal("template")
    ]),
    sourceText: z.string().trim().min(1).max(5000).optional(),
    busyBlocks: z.array(importedBusyBlockSchema).max(200).optional(),
    template: availabilityTemplateSchema.optional(),
    timezone: z.string().trim().min(1).max(100),
    interpretsAs: z.literal("busy").default("busy")
  })
  .strict()
  .refine(
    (input) => {
      if (input.method === "text_import") {
        return (
          input.template === undefined &&
          (input.sourceText !== undefined || (input.busyBlocks?.length ?? 0) > 0)
        );
      }

      if (
        input.method === "image_import" ||
        input.method === "csv_import" ||
        input.method === "ics_import"
      ) {
        return (
          input.template === undefined &&
          input.sourceText === undefined &&
          (input.busyBlocks?.length ?? 0) > 0
        );
      }

      return (
        input.sourceText === undefined &&
        input.busyBlocks === undefined &&
        input.template !== undefined
      );
    },
    {
      message:
        "Text import requires sourceText or busyBlocks; image, CSV, and ICS import JSON require busyBlocks; template preview requires template.",
      path: ["sourceText"]
    }
  );

export const availabilityPreviewResponseSchema = z
  .object({
    entryMethod: availabilityEntryMethodSchema,
    busyBlocks: z.array(importedBusyBlockSchema),
    availableSlots: z.array(availabilitySlotInputSchema),
    warnings: z.array(z.string()),
    confidence: z.number().min(0).max(1).optional()
  })
  .strict();

export type AvailabilityBlockDto = z.infer<typeof availabilityBlockSchema>;
export type AvailabilityEntryMethodDto = z.infer<typeof availabilityEntryMethodSchema>;
export type AvailabilityPreviewRequest = z.infer<typeof availabilityPreviewRequestSchema>;
export type AvailabilityPreviewResponse = z.infer<typeof availabilityPreviewResponseSchema>;
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotInputSchema>;
export type AvailabilityTemplateDto = z.infer<typeof availabilityTemplateSchema>;
export type AvailabilityResults = z.infer<typeof availabilityResultsSchema>;
export type ArchiveScheduleRequest = z.infer<typeof archiveScheduleRequestSchema>;
export type ArchiveScheduleResponse = z.infer<typeof archiveScheduleResponseSchema>;
export type CandidateTimeWindowInput = z.infer<typeof candidateTimeWindowSchema>;
export type CandidateVoteInput = z.infer<typeof candidateVoteInputSchema>;
export type CandidateVoteResponse = z.infer<typeof candidateVoteResponseSchema>;
export type ConfirmFinalTimeRequest = z.infer<typeof confirmFinalTimeRequestSchema>;
export type ConfirmFinalTimeResponse = z.infer<typeof confirmFinalTimeResponseSchema>;
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
export type ScheduleMode = z.infer<typeof scheduleModeSchema>;
export type ScheduleSummary = z.infer<typeof scheduleSummarySchema>;
export type ScheduleStatusSummary = z.infer<typeof scheduleStatusSummarySchema>;
export type ScheduleDetail = z.infer<typeof scheduleDetailSchema>;
export type ParticipantSummary = z.infer<typeof participantSummarySchema>;
export type ImportedBusyBlockDto = z.infer<typeof importedBusyBlockSchema>;
export type WeeklyAvailabilityWindowDto = z.infer<typeof weeklyAvailabilityWindowSchema>;
export type TimeSlotDto = z.infer<typeof timeSlotSchema>;
export type TimeSlotAvailabilityDto = z.infer<typeof timeSlotAvailabilitySchema>;
export type CreateScheduleResponse = z.infer<typeof createScheduleResponseSchema>;
export type GetScheduleResponse = z.infer<typeof getScheduleResponseSchema>;
export type LockScheduleRequest = z.infer<typeof lockScheduleRequestSchema>;
export type LockScheduleResponse = z.infer<typeof lockScheduleResponseSchema>;

function addDuplicateCandidateVoteIssues(
  candidateVotes: readonly { readonly candidateTimeOptionId: string }[] | undefined,
  context: z.RefinementCtx
): void {
  if (candidateVotes === undefined) {
    return;
  }

  const seenOptionIds = new Set<string>();

  for (const [index, vote] of candidateVotes.entries()) {
    if (seenOptionIds.has(vote.candidateTimeOptionId)) {
      context.addIssue({
        code: "custom",
        message: "Candidate votes cannot contain the same option more than once.",
        path: ["candidateVotes", index, "candidateTimeOptionId"]
      });
    }

    seenOptionIds.add(vote.candidateTimeOptionId);
  }
}

function addDuplicateCandidatePreferenceRankIssues(
  candidateVotes:
    | readonly {
        readonly preferenceRank?: number;
      }[]
    | undefined,
  context: z.RefinementCtx
): void {
  if (candidateVotes === undefined) {
    return;
  }

  const seenRanks = new Set<number>();

  for (const [index, vote] of candidateVotes.entries()) {
    if (vote.preferenceRank === undefined) {
      continue;
    }

    if (seenRanks.has(vote.preferenceRank)) {
      context.addIssue({
        code: "custom",
        message: "Candidate preference ranks cannot contain duplicates.",
        path: ["candidateVotes", index, "preferenceRank"]
      });
    }

    seenRanks.add(vote.preferenceRank);
  }
}
