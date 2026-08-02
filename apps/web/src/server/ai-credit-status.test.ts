import { describe, expect, it } from "vitest";

import type {
  AiCreditScope,
  AiCreditStatus,
  AiRecognitionCreditLedger,
  ConsumeImageRecognitionCreditInput,
  ConsumeImageRecognitionCreditResult,
  GrantAiRecognitionCreditsInput,
  GrantAiRecognitionCreditsResult,
  RecordRewardedAdVerificationInput,
  RecordRewardedAdVerificationResult,
  RefundRecognitionAttemptInput,
  RefundRecognitionAttemptResult
} from "./ai-credits";
import { getAiCreditStatusView } from "./ai-credit-status";
import { HttpError } from "./errors";
import { readImageImportRuntimeConfig } from "./schedules/image-import";
import type {
  ReadScheduleRepository,
  ScheduleWithAvailabilityRecord
} from "./schedules/repository";

class FakeScheduleRepository implements ReadScheduleRepository {
  constructor(private readonly record?: ScheduleWithAvailabilityRecord) {}

  async getScheduleByPublicId(): Promise<ScheduleWithAvailabilityRecord | undefined> {
    return this.record;
  }
}

class FakeAiRecognitionCreditLedger implements AiRecognitionCreditLedger {
  readonly scopes: AiCreditScope[] = [];

  constructor(private readonly status: AiCreditStatus) {}

  async consumeImageRecognitionCredit(
    _input: ConsumeImageRecognitionCreditInput
  ): Promise<ConsumeImageRecognitionCreditResult> {
    return {
      consumed: false,
      reason: "no_credits"
    };
  }

  async getCreditStatus(scope: AiCreditScope): Promise<AiCreditStatus> {
    this.scopes.push(scope);
    return this.status;
  }

  async grantCredits(
    _input: GrantAiRecognitionCreditsInput
  ): Promise<GrantAiRecognitionCreditsResult> {
    return {
      creditsGranted: 1,
      creditsRemaining: 1,
      duplicate: false,
      grantId: "grant-1"
    };
  }

  async markRecognitionAttemptFailed(): Promise<boolean> {
    return true;
  }

  async markRecognitionAttemptSucceeded(): Promise<boolean> {
    return true;
  }

  async recordRewardedAdVerification(
    _input: RecordRewardedAdVerificationInput
  ): Promise<RecordRewardedAdVerificationResult> {
    return {
      duplicate: false,
      verificationId: "verification-1",
      verificationStatus: "verified"
    };
  }

  async refundRecognitionAttempt(
    _input: RefundRecognitionAttemptInput
  ): Promise<RefundRecognitionAttemptResult> {
    return {
      creditGrantId: "grant-1",
      creditsRemainingInGrant: 1,
      refunded: true
    };
  }
}

describe("getAiCreditStatusView", () => {
  it("returns usable image import status when the schedule has credits", async () => {
    const ledger = new FakeAiRecognitionCreditLedger({
      activeGrantCount: 1,
      creditsRemaining: 2,
      nextExpirationAt: new Date("2026-08-03T00:00:00.000Z")
    });

    await expect(
      getAiCreditStatusView(
        {
          schedulePublicId: "abc123"
        },
        {
          imageImportConfig: buildLocalImageImportConfig({
            creditsEnforced: true
          }),
          ledger,
          repository: new FakeScheduleRepository(buildScheduleRecord())
        }
      )
    ).resolves.toEqual({
      activeGrantCount: 1,
      creditsRemaining: 2,
      imageImport: {
        blockedReason: null,
        canUse: true,
        creditsEnforced: true,
        maxUploadBytes: 4_194_304,
        needsCredit: false,
        requiresCredit: true,
        rewardedAdsEnabled: false
      },
      nextExpiresAt: "2026-08-03T00:00:00.000Z",
      scheduleStatus: "open",
      scope: {
        schedulePublicId: "abc123",
        scopeType: "schedule"
      }
    });

    expect(ledger.scopes[0]).toMatchObject({
      scopeType: "schedule"
    });
    expect(ledger.scopes[0]?.scopeIdHash).not.toContain("abc123");
  });

  it("reports that a credit is needed before image import can run", async () => {
    await expect(
      getAiCreditStatusView(
        {
          schedulePublicId: "abc123"
        },
        {
          imageImportConfig: buildLocalImageImportConfig({
            creditsEnforced: true
          }),
          ledger: new FakeAiRecognitionCreditLedger({
            activeGrantCount: 0,
            creditsRemaining: 0
          }),
          repository: new FakeScheduleRepository(buildScheduleRecord())
        }
      )
    ).resolves.toMatchObject({
      creditsRemaining: 0,
      imageImport: {
        blockedReason: "An AI image recognition credit is required before using image import.",
        canUse: false,
        needsCredit: true,
        requiresCredit: true,
        rewardedAdsEnabled: false
      }
    });
  });

  it("blocks image import status for schedules that are not open", async () => {
    await expect(
      getAiCreditStatusView(
        {
          schedulePublicId: "abc123"
        },
        {
          imageImportConfig: buildLocalImageImportConfig({
            creditsEnforced: true
          }),
          ledger: new FakeAiRecognitionCreditLedger({
            activeGrantCount: 1,
            creditsRemaining: 1
          }),
          repository: new FakeScheduleRepository(
            buildScheduleRecord({
              status: "locked"
            })
          )
        }
      )
    ).resolves.toMatchObject({
      imageImport: {
        blockedReason: "Schedule is not open.",
        canUse: false,
        needsCredit: false
      },
      scheduleStatus: "locked"
    });
  });

  it("returns not found when the schedule does not exist", async () => {
    await expect(
      getAiCreditStatusView(
        {
          schedulePublicId: "missing"
        },
        {
          imageImportConfig: buildLocalImageImportConfig(),
          ledger: new FakeAiRecognitionCreditLedger({
            activeGrantCount: 0,
            creditsRemaining: 0
          }),
          repository: new FakeScheduleRepository()
        }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_NOT_FOUND",
      status: 404
    } satisfies Partial<HttpError>);
  });
});

function buildLocalImageImportConfig(overrides: { readonly creditsEnforced?: boolean } = {}) {
  return {
    ...readImageImportRuntimeConfig({
      AI_IMAGE_IMPORT_ENABLED: "true",
      AI_IMAGE_IMPORT_RELEASE_MODE: "local_only",
      AI_IMAGE_CREDITS_ENFORCED: String(overrides.creditsEnforced ?? false),
      NODE_ENV: "test"
    }),
    maxBytes: 4_194_304
  };
}

function buildScheduleRecord(
  overrides: Partial<ScheduleWithAvailabilityRecord["schedule"]> = {}
): ScheduleWithAvailabilityRecord {
  return {
    availabilitySlots: [],
    candidateTimeOptions: [],
    participants: [],
    schedule: {
      dailyWindows: [
        {
          daysOfWeek: [1],
          endTime: "17:00",
          startTime: "09:00"
        }
      ],
      dateRangeEnd: "2026-08-03",
      dateRangeStart: "2026-08-03",
      description: null,
      finalEndUtc: null,
      finalStartUtc: null,
      id: "schedule-1",
      publicId: "abc123",
      scheduleMode: "availability_grid",
      slotMinutes: 30,
      status: "open",
      timezone: "Australia/Sydney",
      title: "Schedule",
      ...overrides
    }
  };
}
