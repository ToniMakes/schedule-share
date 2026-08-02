import { describe, expect, it } from "vitest";

import type {
  AiRecognitionCreditLedger,
  ConsumeImageRecognitionCreditInput,
  ConsumeImageRecognitionCreditResult
} from "../ai-credits";
import { HttpError } from "../errors";
import {
  ImageImportLowConfidenceError,
  ImageImportProviderUnavailableError,
  type ImageImportProvider,
  type ImageImportRecognitionInput,
  type ImageImportRecognitionResult
} from "./image-import";
import {
  previewAvailabilityDraft,
  previewAvailabilityDraftFromCsv,
  previewAvailabilityDraftFromIcs,
  previewAvailabilityDraftFromImage
} from "./preview-availability";
import type { ReadScheduleRepository, ScheduleWithAvailabilityRecord } from "./repository";

class FakeScheduleRepository implements ReadScheduleRepository {
  readonly publicIds: string[] = [];

  constructor(private readonly record?: ScheduleWithAvailabilityRecord) {}

  async getScheduleByPublicId(
    publicId: string
  ): Promise<ScheduleWithAvailabilityRecord | undefined> {
    this.publicIds.push(publicId);
    return this.record;
  }
}

class FakeImageImportProvider implements ImageImportProvider {
  readonly inputs: ImageImportRecognitionInput[] = [];

  constructor(
    private readonly result:
      | ImageImportRecognitionResult
      | ImageImportLowConfidenceError
      | ImageImportProviderUnavailableError
  ) {}

  async recognizeBusyBlocks(
    input: ImageImportRecognitionInput
  ): Promise<ImageImportRecognitionResult> {
    this.inputs.push(input);

    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}

class FakeAiRecognitionCreditLedger implements AiRecognitionCreditLedger {
  readonly consumedInputs: ConsumeImageRecognitionCreditInput[] = [];
  readonly events: string[] = [];
  readonly failedAttempts: Array<{ readonly attemptId: string; readonly status: string }> = [];
  readonly refundedAttemptIds: string[] = [];
  readonly succeededAttemptIds: string[] = [];

  constructor(private readonly consumeResult: ConsumeImageRecognitionCreditResult) {}

  async consumeImageRecognitionCredit(
    input: ConsumeImageRecognitionCreditInput
  ): Promise<ConsumeImageRecognitionCreditResult> {
    this.consumedInputs.push(input);
    return this.consumeResult;
  }

  async getCreditStatus() {
    return {
      activeGrantCount: 0,
      creditsRemaining: 0
    };
  }

  async grantCredits() {
    return {
      creditsGranted: 1,
      creditsRemaining: 1,
      duplicate: false,
      grantId: "grant-1"
    };
  }

  async markRecognitionAttemptFailed(
    attemptId: string,
    status: "failed" | "low_confidence" | "provider_unavailable"
  ) {
    this.events.push(`failed:${status}:${attemptId}`);
    this.failedAttempts.push({ attemptId, status });
    return true;
  }

  async markRecognitionAttemptSucceeded(attemptId: string) {
    this.events.push(`succeeded:${attemptId}`);
    this.succeededAttemptIds.push(attemptId);
    return true;
  }

  async recordRewardedAdVerification() {
    return {
      duplicate: false,
      verificationId: "verification-1",
      verificationStatus: "verified" as const
    };
  }

  async refundRecognitionAttempt(input: { readonly attemptId: string }) {
    this.events.push(`refunded:${input.attemptId}`);
    this.refundedAttemptIds.push(input.attemptId);

    return {
      creditGrantId: "grant-1",
      creditsRemainingInGrant: 1,
      refunded: true as const
    };
  }
}

describe("previewAvailabilityDraft", () => {
  it("parses pasted text into busy blocks and returns an availability draft", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraft(
      "abc123",
      {
        method: "text_import",
        sourceText: "Sat 09:30-10:30 COMP101",
        timezone: "Australia/Sydney",
        interpretsAs: "busy"
      },
      {
        repository
      }
    );

    expect(repository.publicIds).toEqual(["abc123"]);
    expect(result).toMatchObject({
      entryMethod: "text_import",
      confidence: 0.65,
      busyBlocks: [
        {
          sourceLabel: "Sat 09:30-10:30 COMP101",
          dayOfWeek: 6,
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.65
        }
      ],
      warnings: []
    });
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-07-31T23:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("turns pasted timetable cells into an availability draft", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraft(
      "abc123",
      {
        method: "text_import",
        sourceText: ["时间\t周六", "09:00-10:00\tCOMP101"].join("\n"),
        timezone: "Australia/Sydney",
        interpretsAs: "busy"
      },
      {
        repository
      }
    );

    expect(result).toMatchObject({
      entryMethod: "text_import",
      confidence: 0.7,
      busyBlocks: [
        {
          sourceLabel: "COMP101 (周六 09:00-10:00)",
          dayOfWeek: 6,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.7
        }
      ],
      warnings: []
    });
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("accepts structured busy blocks without source text", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraft(
      "abc123",
      {
        method: "text_import",
        busyBlocks: [
          {
            sourceLabel: "Class",
            localDate: "2026-08-01",
            startTime: "09:00",
            endTime: "10:00",
            timezone: "Australia/Sydney"
          }
        ],
        timezone: "Australia/Sydney",
        interpretsAs: "busy"
      },
      {
        repository
      }
    );

    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("accepts structured image import busy blocks without multipart upload", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraft(
      "abc123",
      {
        method: "image_import",
        busyBlocks: [
          {
            sourceLabel: "Shift",
            localDate: "2026-08-01",
            startTime: "09:00",
            endTime: "10:00",
            timezone: "Australia/Sydney",
            confidence: 0.8
          }
        ],
        timezone: "Australia/Sydney",
        interpretsAs: "busy"
      },
      {
        repository
      }
    );

    expect(result).toMatchObject({
      entryMethod: "image_import",
      busyBlocks: [
        {
          sourceLabel: "Shift",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.8
        }
      ]
    });
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("uses the schedule year when pasted text has a month-day date", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraft(
      "abc123",
      {
        method: "text_import",
        sourceText: "8/1 9am-10am Work",
        timezone: "Australia/Sydney",
        interpretsAs: "busy"
      },
      {
        repository
      }
    );

    expect(result.busyBlocks).toMatchObject([
      {
        localDate: "2026-08-01",
        startTime: "09:00",
        endTime: "10:00"
      }
    ]);
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("projects inline weekly templates into availability drafts", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraft(
      "abc123",
      {
        method: "template",
        timezone: "Australia/Sydney",
        interpretsAs: "busy",
        template: {
          name: "Weekend mornings",
          timezone: "Australia/Sydney",
          weeklyWindows: [
            {
              dayOfWeek: 6,
              startTime: "09:30",
              endTime: "10:30"
            }
          ]
        }
      },
      {
        repository
      }
    );

    expect(result).toMatchObject({
      entryMethod: "template",
      busyBlocks: [],
      warnings: []
    });
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-07-31T23:30:00.000Z",
      "2026-08-01T00:00:00.000Z"
    ]);
  });

  it("parses ICS calendar files into availability drafts", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraftFromIcs(
      "abc123",
      {
        file: {
          bytes: new TextEncoder().encode(
            [
              "BEGIN:VCALENDAR",
              "BEGIN:VEVENT",
              "SUMMARY:COMP101",
              "DTSTART;TZID=Australia/Sydney:20260801T093000",
              "DTEND;TZID=Australia/Sydney:20260801T103000",
              "END:VEVENT",
              "END:VCALENDAR"
            ].join("\n")
          ),
          filename: "calendar.ics",
          mimeType: "text/calendar",
          size: 167
        },
        interpretsAs: "busy",
        timezone: "Australia/Sydney"
      },
      {
        repository
      }
    );

    expect(result).toMatchObject({
      entryMethod: "ics_import",
      confidence: 0.9,
      busyBlocks: [
        {
          sourceLabel: "COMP101",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney"
        }
      ],
      warnings: []
    });
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-07-31T23:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("applies ICS weekly EXDATE exclusions inside the schedule date range", async () => {
    const baseRecord = buildScheduleRecord();
    const repository = new FakeScheduleRepository(
      buildScheduleRecord({
        schedule: {
          ...baseRecord.schedule,
          dateRangeEnd: "2026-08-15",
          dailyWindows: [
            {
              daysOfWeek: [6],
              startTime: "09:00",
              endTime: "11:00"
            }
          ]
        }
      })
    );

    const result = await previewAvailabilityDraftFromIcs(
      "abc123",
      {
        file: {
          bytes: new TextEncoder().encode(
            [
              "BEGIN:VCALENDAR",
              "BEGIN:VEVENT",
              "SUMMARY:Weekly lab",
              "DTSTART;TZID=Australia/Sydney:20260801T093000",
              "DTEND;TZID=Australia/Sydney:20260801T103000",
              "RRULE:FREQ=WEEKLY",
              "EXDATE;TZID=Australia/Sydney:20260808T093000",
              "END:VEVENT",
              "END:VCALENDAR"
            ].join("\n")
          ),
          filename: "calendar.ics",
          mimeType: "text/calendar",
          size: 232
        },
        interpretsAs: "busy",
        timezone: "Australia/Sydney"
      },
      {
        repository
      }
    );

    const availableSlotStarts = result.availableSlots.map((slot) => slot.startUtc);

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual(["2026-08-01", "2026-08-15"]);
    expect(result.availableSlots).toHaveLength(8);
    expect(availableSlotStarts).not.toContain("2026-07-31T23:30:00.000Z");
    expect(availableSlotStarts).toContain("2026-08-07T23:30:00.000Z");
    expect(availableSlotStarts).not.toContain("2026-08-14T23:30:00.000Z");
  });

  it("expands ICS monthly recurrences inside the schedule date range", async () => {
    const baseRecord = buildScheduleRecord();
    const repository = new FakeScheduleRepository(
      buildScheduleRecord({
        schedule: {
          ...baseRecord.schedule,
          dateRangeEnd: "2026-10-01"
        }
      })
    );

    const result = await previewAvailabilityDraftFromIcs(
      "abc123",
      {
        file: {
          bytes: new TextEncoder().encode(
            [
              "BEGIN:VCALENDAR",
              "BEGIN:VEVENT",
              "SUMMARY:Monthly review",
              "DTSTART;TZID=Australia/Sydney:20260815T093000",
              "DTEND;TZID=Australia/Sydney:20260815T103000",
              "RRULE:FREQ=MONTHLY",
              "EXDATE;TZID=Australia/Sydney:20260915T093000",
              "END:VEVENT",
              "END:VCALENDAR"
            ].join("\n")
          ),
          filename: "calendar.ics",
          mimeType: "text/calendar",
          size: 229
        },
        interpretsAs: "busy",
        timezone: "Australia/Sydney"
      },
      {
        repository
      }
    );

    const availableSlotStarts = result.availableSlots.map((slot) => slot.startUtc);

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual(["2026-08-15"]);
    expect(availableSlotStarts).not.toContain("2026-08-14T23:30:00.000Z");
    expect(availableSlotStarts).not.toContain("2026-08-15T00:00:00.000Z");
    expect(availableSlotStarts).toContain("2026-09-14T23:30:00.000Z");
  });

  it("parses CSV schedule files into availability drafts", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraftFromCsv(
      "abc123",
      {
        file: {
          bytes: new TextEncoder().encode(
            ["Date,Start,End,Title", "2026-08-01,09:30,10:30,CSV Busy"].join("\n")
          ),
          filename: "schedule.csv",
          mimeType: "text/csv",
          size: 64
        },
        interpretsAs: "busy",
        timezone: "Australia/Sydney"
      },
      {
        repository
      }
    );

    expect(result).toMatchObject({
      entryMethod: "csv_import",
      confidence: 0.75,
      busyBlocks: [
        {
          sourceLabel: "2026-08-01 09:30-10:30 CSV Busy",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney"
        }
      ],
      warnings: []
    });
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-07-31T23:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("requires an inline template for template previews", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    await expect(
      previewAvailabilityDraft(
        "abc123",
        {
          method: "template",
          timezone: "Australia/Sydney",
          interpretsAs: "busy"
        },
        {
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
  });

  it("returns warnings and keeps all slots when pasted text has no parseable busy blocks", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    const result = await previewAvailabilityDraft(
      "abc123",
      {
        method: "text_import",
        sourceText: "COMP101 lecture sometime",
        timezone: "Australia/Sydney",
        interpretsAs: "busy"
      },
      {
        repository
      }
    );

    expect(result.availableSlots).toHaveLength(4);
    expect(result.warnings).toContain('Could not find a time range in "COMP101 lecture sometime".');
    expect(result.warnings).toContain("No busy time blocks could be parsed from the pasted text.");
  });

  it("throws not found when the schedule is missing", async () => {
    const repository = new FakeScheduleRepository();

    await expect(
      previewAvailabilityDraft(
        "missing",
        {
          method: "text_import",
          sourceText: "Sat 09:30-10:30 COMP101",
          timezone: "Australia/Sydney",
          interpretsAs: "busy"
        },
        {
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_NOT_FOUND",
      status: 404
    } satisfies Partial<HttpError>);
  });

  it("rejects previews for locked schedules", async () => {
    const repository = new FakeScheduleRepository(
      buildScheduleRecord({
        schedule: {
          ...buildScheduleRecord().schedule,
          status: "locked"
        }
      })
    );

    await expect(
      previewAvailabilityDraft(
        "abc123",
        {
          method: "text_import",
          sourceText: "Sat 09:30-10:30 COMP101",
          timezone: "Australia/Sydney",
          interpretsAs: "busy"
        },
        {
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_LOCKED",
      status: 409
    } satisfies Partial<HttpError>);
  });
});

describe("previewAvailabilityDraftFromImage", () => {
  it("uses the image provider and returns an image import availability draft", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());
    const provider = new FakeImageImportProvider({
      busyBlocks: [
        {
          sourceLabel: "Lab",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.87
        }
      ],
      confidence: 0.87,
      warnings: ["Review image import before submitting."]
    });

    const result = await previewAvailabilityDraftFromImage(
      "abc123",
      {
        file: {
          bytes: new Uint8Array([1, 2, 3]),
          filename: "timetable.png",
          mimeType: "image/png",
          size: 3
        },
        interpretsAs: "busy",
        timezone: "Australia/Sydney"
      },
      {
        imageImportProvider: provider,
        repository
      }
    );

    expect(provider.inputs).toHaveLength(1);
    expect(provider.inputs[0]).toMatchObject({
      defaultYear: 2026,
      scheduleDateRangeStart: "2026-08-01",
      scheduleDateRangeEnd: "2026-08-01",
      scheduleTimezone: "Australia/Sydney",
      timezone: "Australia/Sydney"
    });
    expect(result).toMatchObject({
      entryMethod: "image_import",
      confidence: 0.87,
      warnings: ["Review image import before submitting."]
    });
    expect(result.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("consumes and finalizes an AI credit when credit enforcement is enabled", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());
    const provider = new FakeImageImportProvider({
      busyBlocks: [],
      confidence: 0.9,
      warnings: []
    });
    const ledger = new FakeAiRecognitionCreditLedger({
      attemptId: "attempt-1",
      consumed: true,
      creditGrantId: "grant-1",
      creditsRemainingInGrant: 0
    });

    await previewAvailabilityDraftFromImage(
      "abc123",
      {
        file: {
          bytes: new Uint8Array([1, 2, 3]),
          filename: "timetable.png",
          mimeType: "image/png",
          size: 3
        },
        interpretsAs: "busy",
        timezone: "Australia/Sydney"
      },
      {
        imageCreditLedger: ledger,
        imageImportConfig: {
          creditsEnforced: true,
          estimatedCostPerRequestUsd: 0.01,
          model: "gpt-5.6-luna"
        },
        imageImportProvider: provider,
        repository
      }
    );

    expect(ledger.consumedInputs).toEqual([
      expect.objectContaining({
        estimatedCostUsd: 0.01,
        imageByteSize: 3,
        imageMimeType: "image/png",
        model: "gpt-5.6-luna",
        scheduleId: "schedule-1",
        scopeType: "schedule"
      })
    ]);
    expect(ledger.succeededAttemptIds).toEqual(["attempt-1"]);
    expect(ledger.refundedAttemptIds).toEqual([]);
  });

  it("requires an AI credit before calling the image provider when credits are enforced", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());
    const provider = new FakeImageImportProvider({
      busyBlocks: [],
      confidence: 0.9,
      warnings: []
    });
    const ledger = new FakeAiRecognitionCreditLedger({
      consumed: false,
      reason: "no_credits"
    });

    await expect(
      previewAvailabilityDraftFromImage(
        "abc123",
        {
          file: {
            bytes: new Uint8Array([1, 2, 3]),
            filename: "timetable.png",
            mimeType: "image/png",
            size: 3
          },
          interpretsAs: "busy",
          timezone: "Australia/Sydney"
        },
        {
          imageCreditLedger: ledger,
          imageImportConfig: {
            creditsEnforced: true,
            estimatedCostPerRequestUsd: 0.01,
            model: "gpt-5.6-luna"
          },
          imageImportProvider: provider,
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "AI_CREDIT_REQUIRED",
      status: 402
    } satisfies Partial<HttpError>);

    expect(provider.inputs).toEqual([]);
  });

  it("returns provider unavailable when image import has no provider", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    await expect(
      previewAvailabilityDraftFromImage(
        "abc123",
        {
          file: {
            bytes: new Uint8Array([1, 2, 3]),
            filename: "timetable.png",
            mimeType: "image/png",
            size: 3
          },
          interpretsAs: "busy",
          timezone: "Australia/Sydney"
        },
        {
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "IMPORT_PROVIDER_UNAVAILABLE",
      status: 503
    } satisfies Partial<HttpError>);
  });

  it("maps image provider failures to import API errors", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());

    await expect(
      previewAvailabilityDraftFromImage(
        "abc123",
        {
          file: {
            bytes: new Uint8Array([1, 2, 3]),
            filename: "timetable.png",
            mimeType: "image/png",
            size: 3
          },
          interpretsAs: "busy",
          timezone: "Australia/Sydney"
        },
        {
          imageImportProvider: new FakeImageImportProvider(
            new ImageImportLowConfidenceError("Could not read image.")
          ),
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "IMPORT_LOW_CONFIDENCE",
      status: 422
    } satisfies Partial<HttpError>);

    await expect(
      previewAvailabilityDraftFromImage(
        "abc123",
        {
          file: {
            bytes: new Uint8Array([1, 2, 3]),
            filename: "timetable.png",
            mimeType: "image/png",
            size: 3
          },
          interpretsAs: "busy",
          timezone: "Australia/Sydney"
        },
        {
          imageImportProvider: new FakeImageImportProvider(
            new ImageImportProviderUnavailableError("Provider failed.")
          ),
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "IMPORT_PROVIDER_UNAVAILABLE",
      status: 503
    } satisfies Partial<HttpError>);
  });

  it("refunds the consumed credit when the image provider is unavailable", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());
    const ledger = new FakeAiRecognitionCreditLedger({
      attemptId: "attempt-1",
      consumed: true,
      creditGrantId: "grant-1",
      creditsRemainingInGrant: 0
    });

    await expect(
      previewAvailabilityDraftFromImage(
        "abc123",
        {
          file: {
            bytes: new Uint8Array([1, 2, 3]),
            filename: "timetable.png",
            mimeType: "image/png",
            size: 3
          },
          interpretsAs: "busy",
          timezone: "Australia/Sydney"
        },
        {
          imageCreditLedger: ledger,
          imageImportConfig: {
            creditsEnforced: true,
            estimatedCostPerRequestUsd: 0.01,
            model: "gpt-5.6-luna"
          },
          imageImportProvider: new FakeImageImportProvider(
            new ImageImportProviderUnavailableError("Provider failed.")
          ),
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "IMPORT_PROVIDER_UNAVAILABLE",
      status: 503
    } satisfies Partial<HttpError>);

    expect(ledger.failedAttempts).toEqual([
      {
        attemptId: "attempt-1",
        status: "provider_unavailable"
      }
    ]);
    expect(ledger.events).toEqual(["failed:provider_unavailable:attempt-1", "refunded:attempt-1"]);
    expect(ledger.refundedAttemptIds).toEqual(["attempt-1"]);
  });

  it("does not auto-refund low-confidence image recognition attempts", async () => {
    const repository = new FakeScheduleRepository(buildScheduleRecord());
    const ledger = new FakeAiRecognitionCreditLedger({
      attemptId: "attempt-1",
      consumed: true,
      creditGrantId: "grant-1",
      creditsRemainingInGrant: 0
    });

    await expect(
      previewAvailabilityDraftFromImage(
        "abc123",
        {
          file: {
            bytes: new Uint8Array([1, 2, 3]),
            filename: "timetable.png",
            mimeType: "image/png",
            size: 3
          },
          interpretsAs: "busy",
          timezone: "Australia/Sydney"
        },
        {
          imageCreditLedger: ledger,
          imageImportConfig: {
            creditsEnforced: true,
            estimatedCostPerRequestUsd: 0.01,
            model: "gpt-5.6-luna"
          },
          imageImportProvider: new FakeImageImportProvider(
            new ImageImportLowConfidenceError("Could not read image.")
          ),
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "IMPORT_LOW_CONFIDENCE",
      status: 422
    } satisfies Partial<HttpError>);

    expect(ledger.failedAttempts).toEqual([
      {
        attemptId: "attempt-1",
        status: "low_confidence"
      }
    ]);
    expect(ledger.events).toEqual(["failed:low_confidence:attempt-1"]);
    expect(ledger.refundedAttemptIds).toEqual([]);
  });
});

function buildScheduleRecord(
  overrides: Partial<ScheduleWithAvailabilityRecord> = {}
): ScheduleWithAvailabilityRecord {
  return {
    schedule: {
      id: "schedule-1",
      publicId: "abc123",
      title: "Team dinner",
      description: null,
      timezone: "Australia/Sydney",
      dateRangeStart: "2026-08-01",
      dateRangeEnd: "2026-08-01",
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "11:00"
        }
      ],
      scheduleMode: "availability_grid",
      status: "open"
    },
    candidateTimeOptions: [],
    participants: [],
    availabilitySlots: [],
    ...overrides
  };
}
