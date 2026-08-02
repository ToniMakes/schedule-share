import type { Database } from "@schedule-share/db";
import { describe, expect, it } from "vitest";

import { DrizzleAiRecognitionCreditLedger } from "./ai-credits";

describe("DrizzleAiRecognitionCreditLedger", () => {
  it("summarizes active credits and the next expiration", async () => {
    const firstExpiration = new Date("2026-08-03T00:00:00.000Z");
    const secondExpiration = new Date("2026-08-04T00:00:00.000Z");
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildSelectOnlyDatabase([
        {
          creditsRemaining: 2,
          expiresAt: firstExpiration
        },
        {
          creditsRemaining: 1,
          expiresAt: secondExpiration
        }
      ])
    );

    await expect(
      ledger.getCreditStatus(
        {
          scopeType: "schedule",
          scopeIdHash: "scope_hash"
        },
        new Date("2026-08-02T00:00:00.000Z")
      )
    ).resolves.toEqual({
      activeGrantCount: 2,
      creditsRemaining: 3,
      nextExpirationAt: firstExpiration
    });
  });

  it("creates an idempotent credit grant for a provider event", async () => {
    const values: unknown[] = [];
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildInsertDatabase({
        onValues: (value) => values.push(value),
        returningRows: [
          {
            creditsGranted: 1,
            creditsRemaining: 1,
            grantId: "grant-1"
          }
        ]
      })
    );

    await expect(
      ledger.grantCredits({
        credits: 1,
        expiresAt: new Date("2026-08-09T00:00:00.000Z"),
        provider: "google_ad_manager",
        providerEventIdHash: "reward_hash",
        scheduleId: "schedule-1",
        scopeIdHash: "scope_hash",
        scopeType: "schedule",
        source: "rewarded_ad"
      })
    ).resolves.toEqual({
      creditsGranted: 1,
      creditsRemaining: 1,
      duplicate: false,
      grantId: "grant-1"
    });

    expect(values).toEqual([
      expect.objectContaining({
        creditsGranted: 1,
        creditsRemaining: 1,
        provider: "google_ad_manager",
        providerEventIdHash: "reward_hash",
        source: "rewarded_ad"
      })
    ]);
  });

  it("returns the existing grant when the provider event was already used", async () => {
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildDuplicateGrantDatabase({
        creditsGranted: 1,
        creditsRemaining: 0,
        grantId: "grant-existing"
      })
    );

    await expect(
      ledger.grantCredits({
        credits: 1,
        expiresAt: new Date("2026-08-09T00:00:00.000Z"),
        provider: "google_ad_manager",
        providerEventIdHash: "reward_hash",
        scopeIdHash: "scope_hash",
        scopeType: "schedule",
        source: "rewarded_ad"
      })
    ).resolves.toEqual({
      creditsGranted: 1,
      creditsRemaining: 0,
      duplicate: true,
      grantId: "grant-existing"
    });
  });

  it("atomically decrements a grant and creates a started recognition attempt", async () => {
    const insertedAttempts: unknown[] = [];
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildTransactionDatabase({
        grantRows: [{ id: "grant-1" }],
        insertRows: [{ attemptId: "attempt-1" }],
        onInsertValues: (value) => insertedAttempts.push(value),
        updateRows: [{ creditGrantId: "grant-1", creditsRemainingInGrant: 0 }]
      })
    );

    await expect(
      ledger.consumeImageRecognitionCredit({
        estimatedCostUsd: 0.01,
        imageByteSize: 123,
        imageMimeType: "IMAGE/PNG",
        model: "gpt-5.6-luna",
        participantId: "participant-1",
        scheduleId: "schedule-1",
        scopeIdHash: "scope_hash",
        scopeType: "schedule"
      })
    ).resolves.toEqual({
      attemptId: "attempt-1",
      consumed: true,
      creditGrantId: "grant-1",
      creditsRemainingInGrant: 0
    });

    expect(insertedAttempts).toEqual([
      expect.objectContaining({
        creditGrantId: "grant-1",
        estimatedCostUsd: "0.010000",
        imageByteSize: 123,
        imageMimeType: "image/png",
        model: "gpt-5.6-luna",
        participantId: "participant-1",
        scheduleId: "schedule-1",
        status: "started"
      })
    ]);
  });

  it("does not create an attempt when no credits are available", async () => {
    const insertedAttempts: unknown[] = [];
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildTransactionDatabase({
        grantRows: [],
        insertRows: [{ attemptId: "attempt-1" }],
        onInsertValues: (value) => insertedAttempts.push(value),
        updateRows: []
      })
    );

    await expect(
      ledger.consumeImageRecognitionCredit({
        estimatedCostUsd: 0.01,
        imageByteSize: 123,
        imageMimeType: "image/png",
        model: "gpt-5.6-luna",
        scheduleId: "schedule-1",
        scopeIdHash: "scope_hash",
        scopeType: "schedule"
      })
    ).resolves.toEqual({
      consumed: false,
      reason: "no_credits"
    });

    expect(insertedAttempts).toEqual([]);
  });

  it("marks a started attempt as succeeded without refunding", async () => {
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildUpdateOnlyDatabase([{ id: "attempt-1" }])
    );

    await expect(ledger.markRecognitionAttemptSucceeded("attempt-1")).resolves.toBe(true);
  });

  it("refunds a failed attempt once and reports later duplicate refunds", async () => {
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildRefundDatabase({
        refundedAttemptRows: [{ creditGrantId: "grant-1" }],
        updatedGrantRows: [{ creditGrantId: "grant-1", creditsRemainingInGrant: 1 }]
      })
    );

    await expect(ledger.refundRecognitionAttempt({ attemptId: "attempt-1" })).resolves.toEqual({
      creditGrantId: "grant-1",
      creditsRemainingInGrant: 1,
      refunded: true
    });

    const duplicateLedger = new DrizzleAiRecognitionCreditLedger(
      buildRefundDatabase({
        existingAttemptRows: [{ status: "refunded" }],
        refundedAttemptRows: [],
        updatedGrantRows: []
      })
    );

    await expect(
      duplicateLedger.refundRecognitionAttempt({ attemptId: "attempt-1" })
    ).resolves.toEqual({
      refunded: false,
      reason: "already_refunded"
    });
  });

  it("records rewarded ad verifications idempotently", async () => {
    const values: unknown[] = [];
    const ledger = new DrizzleAiRecognitionCreditLedger(
      buildInsertDatabase({
        onValues: (value) => values.push(value),
        returningRows: [
          {
            verificationId: "verification-1",
            verificationStatus: "verified"
          }
        ]
      })
    );

    await expect(
      ledger.recordRewardedAdVerification({
        adUnitId: "image-import-reward",
        grossRevenueUsd: 0.02,
        provider: "google_ad_manager",
        rewardEventIdHash: "reward_hash",
        scopeIdHash: "scope_hash",
        scopeType: "schedule",
        verificationStatus: "verified"
      })
    ).resolves.toEqual({
      duplicate: false,
      verificationId: "verification-1",
      verificationStatus: "verified"
    });

    expect(values).toEqual([
      expect.objectContaining({
        adUnitId: "image-import-reward",
        grossRevenueUsd: "0.020000",
        provider: "google_ad_manager",
        rewardEventIdHash: "reward_hash",
        scopeIdHash: "scope_hash",
        verificationStatus: "verified"
      })
    ]);
  });

  it("validates scope and positive credit inputs before writing", async () => {
    const ledger = new DrizzleAiRecognitionCreditLedger(buildInsertDatabase({ returningRows: [] }));

    await expect(
      ledger.grantCredits({
        credits: 0,
        expiresAt: new Date("2026-08-09T00:00:00.000Z"),
        provider: "admin",
        scopeIdHash: "scope_hash",
        scopeType: "schedule",
        source: "admin"
      })
    ).rejects.toThrow("credits must be a positive integer.");

    await expect(
      ledger.getCreditStatus({
        scopeIdHash: "scope_hash",
        scopeType: "bad_scope" as "schedule"
      })
    ).rejects.toThrow("scopeType must be anonymous_session, participant, or schedule.");
  });
});

function buildSelectOnlyDatabase<T>(rows: readonly T[]): Database {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: async () => rows
        })
      })
    })
  } as unknown as Database;
}

function buildInsertDatabase<T>({
  onValues,
  returningRows
}: {
  readonly onValues?: (value: unknown) => void;
  readonly returningRows: readonly T[];
}): Database {
  return {
    insert: () => ({
      values: (value: unknown) => {
        onValues?.(value);

        return {
          onConflictDoNothing: () => ({
            returning: async () => returningRows
          })
        };
      }
    })
  } as unknown as Database;
}

function buildDuplicateGrantDatabase<T>(existingRow: T): Database {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => []
        })
      })
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [existingRow]
        })
      })
    })
  } as unknown as Database;
}

function buildTransactionDatabase({
  grantRows,
  insertRows,
  onInsertValues,
  updateRows
}: {
  readonly grantRows: readonly unknown[];
  readonly insertRows: readonly unknown[];
  readonly onInsertValues?: (value: unknown) => void;
  readonly updateRows: readonly unknown[];
}): Database {
  const transaction = {
    insert: () => ({
      values: (value: unknown) => {
        onInsertValues?.(value);

        return {
          returning: async () => insertRows
        };
      }
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => grantRows
          })
        })
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => updateRows
        })
      })
    })
  };

  return {
    transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
      await callback(transaction)
  } as unknown as Database;
}

function buildUpdateOnlyDatabase<T>(rows: readonly T[]): Database {
  return {
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => rows
        })
      })
    })
  } as unknown as Database;
}

function buildRefundDatabase({
  existingAttemptRows = [],
  refundedAttemptRows,
  updatedGrantRows
}: {
  readonly existingAttemptRows?: readonly unknown[];
  readonly refundedAttemptRows: readonly unknown[];
  readonly updatedGrantRows: readonly unknown[];
}): Database {
  let updateCalls = 0;
  const transaction = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => existingAttemptRows
        })
      })
    }),
    update: () => {
      updateCalls += 1;

      return {
        set: () => ({
          where: () => ({
            returning: async () => (updateCalls === 1 ? refundedAttemptRows : updatedGrantRows)
          })
        })
      };
    }
  };

  return {
    transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
      await callback(transaction)
  } as unknown as Database;
}
