import type { AiCreditStatusResponse, GetAiCreditStatusRequest } from "@schedule-share/api-client";

import {
  createAiRecognitionCreditLedger,
  createScheduleAiCreditScope,
  type AiRecognitionCreditLedger
} from "./ai-credits";
import { HttpError } from "./errors";
import {
  checkImageImportAccess,
  readImageImportRuntimeConfig,
  type ImageImportRuntimeConfig
} from "./schedules/image-import";
import { assertSchedulePublicId } from "./schedules/path-validation";
import type { ReadScheduleRepository } from "./schedules/repository";
import { createScheduleRepository } from "./schedules/repository-factory";

export interface GetAiCreditStatusDependencies {
  readonly imageImportConfig?: ImageImportRuntimeConfig;
  readonly ledger?: AiRecognitionCreditLedger;
  readonly repository?: ReadScheduleRepository;
}

export async function getAiCreditStatusView(
  input: GetAiCreditStatusRequest,
  dependencies: GetAiCreditStatusDependencies = {}
): Promise<AiCreditStatusResponse> {
  const schedulePublicId = input.schedulePublicId;
  assertSchedulePublicId(schedulePublicId);

  const repository = dependencies.repository ?? createScheduleRepository();
  const record = await repository.getScheduleByPublicId(schedulePublicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  const ledger = dependencies.ledger ?? createAiRecognitionCreditLedger();
  const creditStatus = await ledger.getCreditStatus(createScheduleAiCreditScope(schedulePublicId));
  const imageImportConfig = dependencies.imageImportConfig ?? readImageImportRuntimeConfig();
  const imageImportAccess = checkImageImportAccess(imageImportConfig);
  const scheduleIsOpen = record.schedule.status === "open";
  const needsCredit = imageImportConfig.creditsEnforced && creditStatus.creditsRemaining <= 0;
  const canUse =
    scheduleIsOpen &&
    imageImportAccess.allowed &&
    (!imageImportConfig.creditsEnforced || creditStatus.creditsRemaining > 0);

  return {
    activeGrantCount: creditStatus.activeGrantCount,
    creditsRemaining: creditStatus.creditsRemaining,
    imageImport: {
      blockedReason: getImageImportBlockedReason({
        accessReason: imageImportAccess.reason,
        canUse,
        needsCredit,
        scheduleIsOpen
      }),
      canUse,
      creditsEnforced: imageImportConfig.creditsEnforced,
      maxUploadBytes: imageImportConfig.maxBytes,
      needsCredit,
      requiresCredit: imageImportConfig.creditsEnforced,
      rewardedAdsEnabled: false
    },
    nextExpiresAt: creditStatus.nextExpirationAt?.toISOString() ?? null,
    scheduleStatus: record.schedule.status,
    scope: {
      schedulePublicId,
      scopeType: "schedule"
    }
  };
}

function getImageImportBlockedReason({
  accessReason,
  canUse,
  needsCredit,
  scheduleIsOpen
}: {
  readonly accessReason?: string;
  readonly canUse: boolean;
  readonly needsCredit: boolean;
  readonly scheduleIsOpen: boolean;
}): string | null {
  if (canUse) {
    return null;
  }

  if (!scheduleIsOpen) {
    return "Schedule is not open.";
  }

  if (accessReason !== undefined) {
    return accessReason;
  }

  if (needsCredit) {
    return "An AI image recognition credit is required before using image import.";
  }

  return "Image import is not available.";
}
