import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "DATABASE_UNAVAILABLE",
  "INTERNAL_ERROR",
  "INVALID_EDIT_KEY",
  "INVALID_OWNER_KEY",
  "PARTICIPANT_NOT_FOUND",
  "SCHEDULE_LOCKED",
  "SCHEDULE_NOT_FOUND",
  "SLOT_OUT_OF_RANGE",
  "UNSUPPORTED_SLOT_MINUTES",
  "VALIDATION_ERROR"
]);

export const apiErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: apiErrorCodeSchema,
        message: z.string(),
        details: z.unknown().optional()
      })
      .strict()
  })
  .strict();

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
