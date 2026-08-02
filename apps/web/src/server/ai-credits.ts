import {
  aiRecognitionAttempts,
  aiRecognitionCreditGrants,
  rewardedAdVerifications,
  type AiRecognitionAttemptStatus,
  type AiRecognitionCreditSource,
  type Database,
  type RewardedAdVerificationStatus
} from "@schedule-share/db";
import { and, asc, eq, gt, inArray, lt, sql } from "drizzle-orm";

import { getDatabase as getDefaultDatabase } from "./db";

export type AiCreditScopeType = "anonymous_session" | "participant" | "schedule";

export interface AiCreditScope {
  readonly scopeIdHash: string;
  readonly scopeType: AiCreditScopeType;
}

export interface AiCreditStatus {
  readonly activeGrantCount: number;
  readonly creditsRemaining: number;
  readonly nextExpirationAt?: Date;
}

export interface GrantAiRecognitionCreditsInput extends AiCreditScope {
  readonly credits: number;
  readonly expiresAt: Date;
  readonly provider: string;
  readonly providerEventIdHash?: string;
  readonly scheduleId?: string;
  readonly source: AiRecognitionCreditSource;
}

export interface GrantAiRecognitionCreditsResult {
  readonly creditsGranted: number;
  readonly creditsRemaining: number;
  readonly duplicate: boolean;
  readonly grantId: string;
}

export interface ConsumeImageRecognitionCreditInput extends AiCreditScope {
  readonly estimatedCostUsd: number;
  readonly imageByteSize: number;
  readonly imageMimeType: string;
  readonly model: string;
  readonly participantId?: string;
  readonly scheduleId: string;
}

export type ConsumeImageRecognitionCreditResult =
  | {
      readonly attemptId: string;
      readonly consumed: true;
      readonly creditGrantId: string;
      readonly creditsRemainingInGrant: number;
    }
  | {
      readonly consumed: false;
      readonly reason: "no_credits";
    };

export interface RefundRecognitionAttemptInput {
  readonly attemptId: string;
}

export type RefundRecognitionAttemptResult =
  | {
      readonly creditGrantId: string;
      readonly creditsRemainingInGrant: number;
      readonly refunded: true;
    }
  | {
      readonly reason: "already_refunded" | "attempt_not_found" | "attempt_not_refundable";
      readonly refunded: false;
    };

export interface RecordRewardedAdVerificationInput extends AiCreditScope {
  readonly adUnitId: string;
  readonly grossRevenueUsd?: number;
  readonly provider: string;
  readonly rewardEventIdHash: string;
  readonly verificationStatus: RewardedAdVerificationStatus;
}

export interface RecordRewardedAdVerificationResult {
  readonly duplicate: boolean;
  readonly verificationId: string;
  readonly verificationStatus: RewardedAdVerificationStatus;
}

export interface AiRecognitionCreditLedger {
  consumeImageRecognitionCredit(
    input: ConsumeImageRecognitionCreditInput
  ): Promise<ConsumeImageRecognitionCreditResult>;
  getCreditStatus(scope: AiCreditScope, now?: Date): Promise<AiCreditStatus>;
  grantCredits(input: GrantAiRecognitionCreditsInput): Promise<GrantAiRecognitionCreditsResult>;
  markRecognitionAttemptSucceeded(attemptId: string, now?: Date): Promise<boolean>;
  recordRewardedAdVerification(
    input: RecordRewardedAdVerificationInput
  ): Promise<RecordRewardedAdVerificationResult>;
  refundRecognitionAttempt(
    input: RefundRecognitionAttemptInput,
    now?: Date
  ): Promise<RefundRecognitionAttemptResult>;
}

export interface AiRecognitionCreditLedgerDependencies {
  readonly database?: Database;
  readonly getDatabase?: () => Database;
}

export function createAiRecognitionCreditLedger(
  dependencies: AiRecognitionCreditLedgerDependencies = {}
): AiRecognitionCreditLedger {
  const database = dependencies.database ?? (dependencies.getDatabase ?? getDefaultDatabase)();

  return new DrizzleAiRecognitionCreditLedger(database);
}

export class DrizzleAiRecognitionCreditLedger implements AiRecognitionCreditLedger {
  constructor(private readonly database: Database) {}

  async getCreditStatus(scope: AiCreditScope, now = new Date()): Promise<AiCreditStatus> {
    const normalizedScope = normalizeScope(scope);
    const grants = await this.database
      .select({
        creditsRemaining: aiRecognitionCreditGrants.creditsRemaining,
        expiresAt: aiRecognitionCreditGrants.expiresAt
      })
      .from(aiRecognitionCreditGrants)
      .where(activeGrantScopeWhere(normalizedScope, now))
      .orderBy(asc(aiRecognitionCreditGrants.expiresAt), asc(aiRecognitionCreditGrants.createdAt));

    const creditsRemaining = grants.reduce((total, grant) => total + grant.creditsRemaining, 0);

    return {
      activeGrantCount: grants.length,
      creditsRemaining,
      ...(grants[0] === undefined ? {} : { nextExpirationAt: grants[0].expiresAt })
    };
  }

  async grantCredits(
    input: GrantAiRecognitionCreditsInput
  ): Promise<GrantAiRecognitionCreditsResult> {
    const normalized = normalizeGrantInput(input);
    const [created] = await this.database
      .insert(aiRecognitionCreditGrants)
      .values({
        creditsGranted: normalized.credits,
        creditsRemaining: normalized.credits,
        expiresAt: normalized.expiresAt,
        provider: normalized.provider,
        providerEventIdHash: normalized.providerEventIdHash ?? null,
        scheduleId: normalized.scheduleId ?? null,
        scopeIdHash: normalized.scopeIdHash,
        scopeType: normalized.scopeType,
        source: normalized.source
      })
      .onConflictDoNothing({
        target: [aiRecognitionCreditGrants.provider, aiRecognitionCreditGrants.providerEventIdHash]
      })
      .returning({
        creditsGranted: aiRecognitionCreditGrants.creditsGranted,
        creditsRemaining: aiRecognitionCreditGrants.creditsRemaining,
        grantId: aiRecognitionCreditGrants.id
      });

    if (created !== undefined) {
      return {
        ...created,
        duplicate: false
      };
    }

    if (normalized.providerEventIdHash === undefined) {
      throw new Error("Failed to grant AI recognition credits.");
    }

    const [existing] = await this.database
      .select({
        creditsGranted: aiRecognitionCreditGrants.creditsGranted,
        creditsRemaining: aiRecognitionCreditGrants.creditsRemaining,
        grantId: aiRecognitionCreditGrants.id
      })
      .from(aiRecognitionCreditGrants)
      .where(
        and(
          eq(aiRecognitionCreditGrants.provider, normalized.provider),
          eq(aiRecognitionCreditGrants.providerEventIdHash, normalized.providerEventIdHash)
        )
      )
      .limit(1);

    if (existing === undefined) {
      throw new Error("Failed to load duplicate AI recognition credit grant.");
    }

    return {
      ...existing,
      duplicate: true
    };
  }

  async consumeImageRecognitionCredit(
    input: ConsumeImageRecognitionCreditInput
  ): Promise<ConsumeImageRecognitionCreditResult> {
    const normalized = normalizeConsumeInput(input);

    return await this.database.transaction(async (transaction) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const [grant] = await transaction
          .select({
            id: aiRecognitionCreditGrants.id
          })
          .from(aiRecognitionCreditGrants)
          .where(activeGrantScopeWhere(normalized, normalized.now))
          .orderBy(
            asc(aiRecognitionCreditGrants.expiresAt),
            asc(aiRecognitionCreditGrants.createdAt)
          )
          .limit(1);

        if (grant === undefined) {
          return {
            consumed: false,
            reason: "no_credits"
          };
        }

        const [updatedGrant] = await transaction
          .update(aiRecognitionCreditGrants)
          .set({
            creditsRemaining: sql`${aiRecognitionCreditGrants.creditsRemaining} - 1`
          })
          .where(
            and(
              eq(aiRecognitionCreditGrants.id, grant.id),
              gt(aiRecognitionCreditGrants.creditsRemaining, 0),
              gt(aiRecognitionCreditGrants.expiresAt, normalized.now)
            )
          )
          .returning({
            creditGrantId: aiRecognitionCreditGrants.id,
            creditsRemainingInGrant: aiRecognitionCreditGrants.creditsRemaining
          });

        if (updatedGrant === undefined) {
          continue;
        }

        const [createdAttempt] = await transaction
          .insert(aiRecognitionAttempts)
          .values({
            creditGrantId: updatedGrant.creditGrantId,
            estimatedCostUsd: normalized.estimatedCostUsd,
            imageByteSize: normalized.imageByteSize,
            imageMimeType: normalized.imageMimeType,
            model: normalized.model,
            participantId: normalized.participantId ?? null,
            scheduleId: normalized.scheduleId,
            status: "started"
          })
          .returning({
            attemptId: aiRecognitionAttempts.id
          });

        if (createdAttempt === undefined) {
          throw new Error("Failed to create AI recognition attempt.");
        }

        return {
          attemptId: createdAttempt.attemptId,
          consumed: true,
          creditGrantId: updatedGrant.creditGrantId,
          creditsRemainingInGrant: updatedGrant.creditsRemainingInGrant
        };
      }

      return {
        consumed: false,
        reason: "no_credits"
      };
    });
  }

  async markRecognitionAttemptSucceeded(attemptId: string, now = new Date()): Promise<boolean> {
    const normalizedAttemptId = normalizeNonEmptyString(attemptId, "attemptId");
    const [updated] = await this.database
      .update(aiRecognitionAttempts)
      .set({
        status: "succeeded",
        updatedAt: now
      })
      .where(
        and(
          eq(aiRecognitionAttempts.id, normalizedAttemptId),
          eq(aiRecognitionAttempts.status, "started")
        )
      )
      .returning({
        id: aiRecognitionAttempts.id
      });

    return updated !== undefined;
  }

  async refundRecognitionAttempt(
    input: RefundRecognitionAttemptInput,
    now = new Date()
  ): Promise<RefundRecognitionAttemptResult> {
    const attemptId = normalizeNonEmptyString(input.attemptId, "attemptId");

    return await this.database.transaction(async (transaction) => {
      const [refundedAttempt] = await transaction
        .update(aiRecognitionAttempts)
        .set({
          status: "refunded",
          updatedAt: now
        })
        .where(
          and(
            eq(aiRecognitionAttempts.id, attemptId),
            inArray(aiRecognitionAttempts.status, refundableAttemptStatuses)
          )
        )
        .returning({
          creditGrantId: aiRecognitionAttempts.creditGrantId
        });

      if (refundedAttempt === undefined) {
        const [existingAttempt] = await transaction
          .select({
            status: aiRecognitionAttempts.status
          })
          .from(aiRecognitionAttempts)
          .where(eq(aiRecognitionAttempts.id, attemptId))
          .limit(1);

        if (existingAttempt === undefined) {
          return {
            refunded: false,
            reason: "attempt_not_found"
          };
        }

        return {
          refunded: false,
          reason:
            existingAttempt.status === "refunded" ? "already_refunded" : "attempt_not_refundable"
        };
      }

      const [updatedGrant] = await transaction
        .update(aiRecognitionCreditGrants)
        .set({
          creditsRemaining: sql`${aiRecognitionCreditGrants.creditsRemaining} + 1`
        })
        .where(
          and(
            eq(aiRecognitionCreditGrants.id, refundedAttempt.creditGrantId),
            lt(aiRecognitionCreditGrants.creditsRemaining, aiRecognitionCreditGrants.creditsGranted)
          )
        )
        .returning({
          creditGrantId: aiRecognitionCreditGrants.id,
          creditsRemainingInGrant: aiRecognitionCreditGrants.creditsRemaining
        });

      if (updatedGrant === undefined) {
        throw new Error("Failed to refund AI recognition credit.");
      }

      return {
        refunded: true,
        creditGrantId: updatedGrant.creditGrantId,
        creditsRemainingInGrant: updatedGrant.creditsRemainingInGrant
      };
    });
  }

  async recordRewardedAdVerification(
    input: RecordRewardedAdVerificationInput
  ): Promise<RecordRewardedAdVerificationResult> {
    const normalized = normalizeRewardedAdVerificationInput(input);
    const [created] = await this.database
      .insert(rewardedAdVerifications)
      .values({
        adUnitId: normalized.adUnitId,
        grossRevenueUsd: normalized.grossRevenueUsd ?? null,
        provider: normalized.provider,
        rewardEventIdHash: normalized.rewardEventIdHash,
        scopeIdHash: normalized.scopeIdHash,
        verificationStatus: normalized.verificationStatus
      })
      .onConflictDoNothing({
        target: [
          rewardedAdVerifications.provider,
          rewardedAdVerifications.adUnitId,
          rewardedAdVerifications.rewardEventIdHash
        ]
      })
      .returning({
        verificationId: rewardedAdVerifications.id,
        verificationStatus: rewardedAdVerifications.verificationStatus
      });

    if (created !== undefined) {
      return {
        ...created,
        duplicate: false
      };
    }

    const [existing] = await this.database
      .select({
        verificationId: rewardedAdVerifications.id,
        verificationStatus: rewardedAdVerifications.verificationStatus
      })
      .from(rewardedAdVerifications)
      .where(
        and(
          eq(rewardedAdVerifications.provider, normalized.provider),
          eq(rewardedAdVerifications.adUnitId, normalized.adUnitId),
          eq(rewardedAdVerifications.rewardEventIdHash, normalized.rewardEventIdHash)
        )
      )
      .limit(1);

    if (existing === undefined) {
      throw new Error("Failed to load duplicate rewarded ad verification.");
    }

    return {
      ...existing,
      duplicate: true
    };
  }
}

const aiCreditScopeTypes: readonly AiCreditScopeType[] = [
  "anonymous_session",
  "participant",
  "schedule"
];

const refundableAttemptStatuses = [
  "started",
  "low_confidence",
  "provider_unavailable",
  "failed"
] satisfies readonly AiRecognitionAttemptStatus[];

type NormalizedConsumeInput = Omit<ConsumeImageRecognitionCreditInput, "estimatedCostUsd"> & {
  readonly estimatedCostUsd: string;
  readonly now: Date;
};

type NormalizedRewardedAdVerificationInput = Omit<
  RecordRewardedAdVerificationInput,
  "grossRevenueUsd"
> & {
  readonly grossRevenueUsd?: string;
};

function activeGrantScopeWhere(scope: AiCreditScope, now: Date) {
  return and(
    eq(aiRecognitionCreditGrants.scopeType, scope.scopeType),
    eq(aiRecognitionCreditGrants.scopeIdHash, scope.scopeIdHash),
    gt(aiRecognitionCreditGrants.creditsRemaining, 0),
    gt(aiRecognitionCreditGrants.expiresAt, now)
  );
}

function normalizeScope(scope: AiCreditScope): AiCreditScope {
  const scopeType = normalizeNonEmptyString(scope.scopeType, "scopeType");

  if (!aiCreditScopeTypes.includes(scopeType as AiCreditScopeType)) {
    throw new Error("scopeType must be anonymous_session, participant, or schedule.");
  }

  return {
    scopeType: scopeType as AiCreditScopeType,
    scopeIdHash: normalizeNonEmptyString(scope.scopeIdHash, "scopeIdHash")
  };
}

function normalizeGrantInput(
  input: GrantAiRecognitionCreditsInput
): GrantAiRecognitionCreditsInput {
  return {
    ...normalizeScope(input),
    credits: normalizePositiveInteger(input.credits, "credits"),
    expiresAt: normalizeFutureDate(input.expiresAt, "expiresAt"),
    provider: normalizeNonEmptyString(input.provider, "provider"),
    ...(input.providerEventIdHash === undefined
      ? {}
      : {
          providerEventIdHash: normalizeNonEmptyString(
            input.providerEventIdHash,
            "providerEventIdHash"
          )
        }),
    ...(input.scheduleId === undefined
      ? {}
      : { scheduleId: normalizeNonEmptyString(input.scheduleId, "scheduleId") }),
    source: input.source
  };
}

function normalizeConsumeInput(input: ConsumeImageRecognitionCreditInput): NormalizedConsumeInput {
  return {
    ...normalizeScope(input),
    estimatedCostUsd: normalizeUsdString(input.estimatedCostUsd, "estimatedCostUsd"),
    imageByteSize: normalizePositiveInteger(input.imageByteSize, "imageByteSize"),
    imageMimeType: normalizeNonEmptyString(input.imageMimeType, "imageMimeType").toLowerCase(),
    model: normalizeNonEmptyString(input.model, "model"),
    now: new Date(),
    ...(input.participantId === undefined
      ? {}
      : { participantId: normalizeNonEmptyString(input.participantId, "participantId") }),
    scheduleId: normalizeNonEmptyString(input.scheduleId, "scheduleId")
  };
}

function normalizeRewardedAdVerificationInput(
  input: RecordRewardedAdVerificationInput
): NormalizedRewardedAdVerificationInput {
  return {
    ...normalizeScope(input),
    adUnitId: normalizeNonEmptyString(input.adUnitId, "adUnitId"),
    ...(input.grossRevenueUsd === undefined
      ? {}
      : { grossRevenueUsd: normalizeUsdString(input.grossRevenueUsd, "grossRevenueUsd") }),
    provider: normalizeNonEmptyString(input.provider, "provider"),
    rewardEventIdHash: normalizeNonEmptyString(input.rewardEventIdHash, "rewardEventIdHash"),
    verificationStatus: input.verificationStatus
  };
}

function normalizeNonEmptyString(value: string, name: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return trimmed;
}

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function normalizeNonNegativeNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }

  return value;
}

function normalizeUsdString(value: number, name: string): string {
  return normalizeNonNegativeNumber(value, name).toFixed(6);
}

function normalizeFutureDate(value: Date, name: string): Date {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid date.`);
  }

  return value;
}
