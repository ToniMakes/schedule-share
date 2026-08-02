import { describe, expect, it } from "vitest";

import { aiCreditStatusResponseSchema, getAiCreditStatus } from "../src";

describe("aiCreditStatusResponseSchema", () => {
  it("parses AI credit status responses", () => {
    expect(
      aiCreditStatusResponseSchema.parse({
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
      })
    ).toEqual({
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
  });
});

describe("getAiCreditStatus", () => {
  it("fetches schedule-scoped AI credit status", async () => {
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];
    const payload = {
      activeGrantCount: 0,
      creditsRemaining: 0,
      imageImport: {
        blockedReason: "Image import is disabled by feature flag.",
        canUse: false,
        creditsEnforced: false,
        maxUploadBytes: 4_194_304,
        needsCredit: false,
        requiresCredit: false,
        rewardedAdsEnabled: false
      },
      nextExpiresAt: null,
      scheduleStatus: "open",
      scope: {
        schedulePublicId: "abc123",
        scopeType: "schedule"
      }
    };

    await expect(
      getAiCreditStatus(
        {
          schedulePublicId: " abc123 "
        },
        {
          baseUrl: "https://example.com",
          fetch: async (input, init) => {
            calls.push({ input, init });
            return new Response(JSON.stringify(payload), {
              headers: {
                "content-type": "application/json"
              },
              status: 200
            });
          }
        }
      )
    ).resolves.toEqual(payload);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe(
      "https://example.com/api/ai-credits/status?schedulePublicId=abc123"
    );
    expect(calls[0]!.init).toBeUndefined();
  });
});
