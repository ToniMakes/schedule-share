import { z } from "zod";

const utcIsoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
const scheduleStatusSchema = z.enum(["open", "locked", "archived"]);

export const getAiCreditStatusRequestSchema = z
  .object({
    schedulePublicId: z.string().trim().min(1).max(200)
  })
  .strict();

export const aiImageImportStatusSchema = z
  .object({
    blockedReason: z.string().nullable(),
    canUse: z.boolean(),
    creditsEnforced: z.boolean(),
    maxUploadBytes: z.number().int().positive(),
    needsCredit: z.boolean(),
    requiresCredit: z.boolean(),
    rewardedAdsEnabled: z.boolean()
  })
  .strict();

export const aiCreditStatusResponseSchema = z
  .object({
    activeGrantCount: z.number().int().min(0),
    creditsRemaining: z.number().int().min(0),
    imageImport: aiImageImportStatusSchema,
    nextExpiresAt: utcIsoSchema.nullable(),
    scope: z
      .object({
        schedulePublicId: z.string(),
        scopeType: z.literal("schedule")
      })
      .strict(),
    scheduleStatus: scheduleStatusSchema
  })
  .strict();

export type AiCreditStatusResponse = z.infer<typeof aiCreditStatusResponseSchema>;
export type AiImageImportStatus = z.infer<typeof aiImageImportStatusSchema>;
export type GetAiCreditStatusRequest = z.infer<typeof getAiCreditStatusRequestSchema>;
