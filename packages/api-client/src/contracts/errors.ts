import { z } from "zod";

export const apiErrorCodes = [
  "AI_CREDIT_REQUIRED",
  "CANDIDATE_OPTION_NOT_FOUND",
  "DATABASE_UNAVAILABLE",
  "FORBIDDEN",
  "INTERNAL_ERROR",
  "INVALID_EDIT_KEY",
  "INVALID_OWNER_KEY",
  "IMPORT_FILE_TOO_LARGE",
  "IMPORT_LOW_CONFIDENCE",
  "IMPORT_PROVIDER_UNAVAILABLE",
  "IMPORT_UNSUPPORTED_FILE_TYPE",
  "PARTICIPANT_NOT_FOUND",
  "SCHEDULE_LOCKED",
  "SCHEDULE_NOT_FOUND",
  "SLOT_OUT_OF_RANGE",
  "TEMPLATE_NOT_FOUND",
  "UNAUTHENTICATED",
  "UNSUPPORTED_ENTRY_METHOD",
  "UNSUPPORTED_SLOT_MINUTES",
  "VALIDATION_ERROR"
] as const;

export const apiErrorCodeSchema = z.enum(apiErrorCodes);

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
