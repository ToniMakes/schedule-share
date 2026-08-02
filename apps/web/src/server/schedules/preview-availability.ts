import type {
  AvailabilityPreviewRequest,
  AvailabilityPreviewResponse,
  AvailabilityTemplateDto,
  ImportedBusyBlockDto
} from "@schedule-share/api-client";
import {
  CoreError,
  createAvailabilityDraftFromBusyBlocks,
  createAvailabilityDraftFromTemplate,
  type AvailabilityTemplate,
  type AvailabilityDraft,
  type ImportedBusyBlock,
  type LocalDate,
  type LocalTime
} from "@schedule-share/core";

import { createScheduleAiCreditScope, type AiRecognitionCreditLedger } from "../ai-credits";
import { HttpError } from "../errors";
import { parseCsvImportBusyBlocks, type CsvImportPreviewInput } from "./csv-import";
import {
  ImageImportLowConfidenceError,
  ImageImportProviderUnavailableError,
  type ImageImportRuntimeConfig,
  type ImageImportPreviewInput,
  type ImageImportProvider
} from "./image-import";
import { parseIcsImportBusyBlocks, type IcsImportPreviewInput } from "./ics-import";
import { assertSchedulePublicId } from "./path-validation";
import type { ReadScheduleRepository, ScheduleWithAvailabilityRecord } from "./repository";
import { toTimeSlotConfig } from "./schedule-config";
import { parseTextImportBusyBlocks } from "./text-import";

export interface PreviewAvailabilityDependencies {
  readonly imageCreditLedger?: AiRecognitionCreditLedger;
  readonly imageImportConfig?: Pick<
    ImageImportRuntimeConfig,
    "creditsEnforced" | "estimatedCostPerRequestUsd" | "model"
  >;
  readonly imageImportProvider?: ImageImportProvider;
  readonly repository: ReadScheduleRepository;
}

export async function previewAvailabilityDraft(
  publicId: string,
  input: AvailabilityPreviewRequest,
  dependencies: PreviewAvailabilityDependencies
): Promise<AvailabilityPreviewResponse> {
  assertSchedulePublicId(publicId);

  const record = await getOpenScheduleRecord(publicId, dependencies.repository);

  if (input.method === "template") {
    return createPreviewFromTemplate({
      record,
      template: input.template
    });
  }

  const parsedText =
    input.method !== "text_import" || input.sourceText === undefined
      ? {
          busyBlocks: [],
          warnings: []
        }
      : parseTextImportBusyBlocks(input.sourceText, input.timezone, {
          defaultYear: defaultYearFromSchedule(record.schedule.dateRangeStart)
        });
  const busyBlocks = [...parsedText.busyBlocks, ...(input.busyBlocks ?? [])];

  return createPreviewFromBusyBlocks({
    busyBlocks,
    confidence: parsedText.confidence,
    entryMethod: input.method,
    record,
    warnings: parsedText.warnings
  });
}

export async function previewAvailabilityDraftFromImage(
  publicId: string,
  input: ImageImportPreviewInput,
  dependencies: PreviewAvailabilityDependencies
): Promise<AvailabilityPreviewResponse> {
  assertSchedulePublicId(publicId);

  const provider = dependencies.imageImportProvider;

  if (provider === undefined) {
    throw new HttpError(
      503,
      "IMPORT_PROVIDER_UNAVAILABLE",
      "Image import provider is not configured."
    );
  }

  const record = await getOpenScheduleRecord(publicId, dependencies.repository);
  const creditAttempt = await consumeImageRecognitionCreditIfNeeded(
    publicId,
    input,
    record,
    dependencies
  );

  try {
    const recognized = await provider.recognizeBusyBlocks({
      defaultYear: defaultYearFromSchedule(record.schedule.dateRangeStart),
      file: input.file,
      scheduleDateRangeEnd: record.schedule.dateRangeEnd,
      scheduleDateRangeStart: record.schedule.dateRangeStart,
      scheduleTimezone: record.schedule.timezone,
      timezone: input.timezone
    });

    if (creditAttempt !== undefined) {
      await dependencies.imageCreditLedger?.markRecognitionAttemptSucceeded(
        creditAttempt.attemptId
      );
    }

    return createPreviewFromBusyBlocks({
      busyBlocks: recognized.busyBlocks,
      confidence: recognized.confidence,
      entryMethod: "image_import",
      record,
      warnings: recognized.warnings
    });
  } catch (error) {
    if (error instanceof ImageImportProviderUnavailableError) {
      if (creditAttempt !== undefined) {
        await dependencies.imageCreditLedger?.markRecognitionAttemptFailed(
          creditAttempt.attemptId,
          "provider_unavailable"
        );
        await dependencies.imageCreditLedger?.refundRecognitionAttempt({
          attemptId: creditAttempt.attemptId
        });
      }

      throw new HttpError(503, "IMPORT_PROVIDER_UNAVAILABLE", error.message);
    }

    if (error instanceof ImageImportLowConfidenceError) {
      if (creditAttempt !== undefined) {
        await dependencies.imageCreditLedger?.markRecognitionAttemptFailed(
          creditAttempt.attemptId,
          "low_confidence"
        );
      }

      throw new HttpError(422, "IMPORT_LOW_CONFIDENCE", error.message);
    }

    if (creditAttempt !== undefined) {
      await dependencies.imageCreditLedger?.markRecognitionAttemptFailed(
        creditAttempt.attemptId,
        "failed"
      );
      await dependencies.imageCreditLedger?.refundRecognitionAttempt({
        attemptId: creditAttempt.attemptId
      });
    }

    throw error;
  }
}

export async function previewAvailabilityDraftFromIcs(
  publicId: string,
  input: IcsImportPreviewInput,
  dependencies: PreviewAvailabilityDependencies
): Promise<AvailabilityPreviewResponse> {
  assertSchedulePublicId(publicId);

  const record = await getOpenScheduleRecord(publicId, dependencies.repository);
  const parsed = parseIcsImportBusyBlocks(
    new TextDecoder().decode(input.file.bytes),
    input.timezone,
    {
      scheduleDateRangeEnd: record.schedule.dateRangeEnd,
      scheduleDateRangeStart: record.schedule.dateRangeStart
    }
  );

  return createPreviewFromBusyBlocks({
    busyBlocks: parsed.busyBlocks,
    confidence: parsed.confidence,
    entryMethod: "ics_import",
    record,
    warnings: parsed.warnings
  });
}

export async function previewAvailabilityDraftFromCsv(
  publicId: string,
  input: CsvImportPreviewInput,
  dependencies: PreviewAvailabilityDependencies
): Promise<AvailabilityPreviewResponse> {
  assertSchedulePublicId(publicId);

  const record = await getOpenScheduleRecord(publicId, dependencies.repository);
  const parsed = parseCsvImportBusyBlocks(
    new TextDecoder().decode(input.file.bytes),
    input.timezone,
    {
      defaultYear: defaultYearFromSchedule(record.schedule.dateRangeStart)
    }
  );

  return createPreviewFromBusyBlocks({
    busyBlocks: parsed.busyBlocks,
    confidence: parsed.confidence,
    entryMethod: "csv_import",
    record,
    warnings: parsed.warnings
  });
}

interface CreatePreviewFromTemplateInput {
  readonly record: ScheduleWithAvailabilityRecord;
  readonly template: AvailabilityTemplateDto | undefined;
}

interface CreatePreviewFromBusyBlocksInput {
  readonly busyBlocks: readonly ImportedBusyBlockDto[];
  readonly confidence?: number;
  readonly entryMethod: AvailabilityPreviewRequest["method"];
  readonly record: ScheduleWithAvailabilityRecord;
  readonly warnings: readonly string[];
}

async function getOpenScheduleRecord(
  publicId: string,
  repository: ReadScheduleRepository
): Promise<ScheduleWithAvailabilityRecord> {
  const record = await repository.getScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  if (record.schedule.status !== "open") {
    throw new HttpError(409, "SCHEDULE_LOCKED", "This schedule no longer accepts changes.");
  }

  return record;
}

function createPreviewFromTemplate({
  record,
  template
}: CreatePreviewFromTemplateInput): AvailabilityPreviewResponse {
  if (template === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", "Template preview requires a template.");
  }

  try {
    const draft = createAvailabilityDraftFromTemplate({
      config: toTimeSlotConfig(record.schedule),
      template: toCoreAvailabilityTemplate(template)
    });

    return toAvailabilityPreviewResponse(draft);
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(400, coreErrorCode(error), error.message, {
        coreCode: error.code
      });
    }

    throw error;
  }
}

async function consumeImageRecognitionCreditIfNeeded(
  publicId: string,
  input: ImageImportPreviewInput,
  record: ScheduleWithAvailabilityRecord,
  dependencies: PreviewAvailabilityDependencies
): Promise<{ readonly attemptId: string } | undefined> {
  const config = dependencies.imageImportConfig;

  if (config?.creditsEnforced !== true) {
    return undefined;
  }

  const ledger = dependencies.imageCreditLedger;

  if (ledger === undefined) {
    throw new HttpError(503, "IMPORT_PROVIDER_UNAVAILABLE", "AI credit ledger is not configured.");
  }

  const consumed = await ledger.consumeImageRecognitionCredit({
    ...createScheduleAiCreditScope(publicId),
    estimatedCostUsd: config.estimatedCostPerRequestUsd,
    imageByteSize: input.file.size,
    imageMimeType: input.file.mimeType,
    model: config.model,
    scheduleId: record.schedule.id
  });

  if (!consumed.consumed) {
    throw new HttpError(
      402,
      "AI_CREDIT_REQUIRED",
      "An AI image recognition credit is required before using image import."
    );
  }

  return {
    attemptId: consumed.attemptId
  };
}

function createPreviewFromBusyBlocks({
  busyBlocks,
  confidence,
  entryMethod,
  record,
  warnings
}: CreatePreviewFromBusyBlocksInput): AvailabilityPreviewResponse {
  try {
    const draft = createAvailabilityDraftFromBusyBlocks({
      config: toTimeSlotConfig(record.schedule),
      entryMethod,
      busyBlocks: busyBlocks.map(toCoreBusyBlock),
      warnings,
      ...(confidence === undefined ? {} : { confidence })
    });

    return toAvailabilityPreviewResponse(draft);
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(400, coreErrorCode(error), error.message, {
        coreCode: error.code
      });
    }

    throw error;
  }
}

function toCoreAvailabilityTemplate(template: AvailabilityTemplateDto): AvailabilityTemplate {
  return {
    ...(template.name === undefined ? {} : { name: template.name }),
    timezone: template.timezone,
    weeklyWindows: template.weeklyWindows.map((window) => ({
      dayOfWeek: window.dayOfWeek,
      startTime: window.startTime as LocalTime,
      endTime: window.endTime as LocalTime
    }))
  };
}

function toCoreBusyBlock(block: ImportedBusyBlockDto): ImportedBusyBlock {
  return {
    ...(block.sourceLabel === undefined ? {} : { sourceLabel: block.sourceLabel }),
    ...(block.localDate === undefined ? {} : { localDate: block.localDate as LocalDate }),
    ...(block.dayOfWeek === undefined ? {} : { dayOfWeek: block.dayOfWeek }),
    startTime: block.startTime as LocalTime,
    endTime: block.endTime as LocalTime,
    timezone: block.timezone,
    ...(block.confidence === undefined ? {} : { confidence: block.confidence }),
    ...(block.warnings === undefined ? {} : { warnings: block.warnings })
  };
}

function toAvailabilityPreviewResponse(draft: AvailabilityDraft): AvailabilityPreviewResponse {
  return {
    entryMethod: draft.entryMethod,
    busyBlocks: draft.busyBlocks.map(toImportedBusyBlockDto),
    availableSlots: draft.availableSlots.map((slot) => ({
      startUtc: slot.startUtc,
      endUtc: slot.endUtc
    })),
    warnings: [...draft.warnings],
    ...(draft.confidence === undefined ? {} : { confidence: draft.confidence })
  };
}

function toImportedBusyBlockDto(block: ImportedBusyBlock): ImportedBusyBlockDto {
  return {
    ...(block.sourceLabel === undefined ? {} : { sourceLabel: block.sourceLabel }),
    ...(block.localDate === undefined ? {} : { localDate: block.localDate }),
    ...(block.dayOfWeek === undefined ? {} : { dayOfWeek: block.dayOfWeek }),
    startTime: block.startTime,
    endTime: block.endTime,
    timezone: block.timezone,
    ...(block.confidence === undefined ? {} : { confidence: block.confidence }),
    ...(block.warnings === undefined ? {} : { warnings: [...block.warnings] })
  };
}

function coreErrorCode(
  error: CoreError
): "SLOT_OUT_OF_RANGE" | "UNSUPPORTED_ENTRY_METHOD" | "VALIDATION_ERROR" {
  if (error.code === "SLOT_OUT_OF_RANGE") {
    return "SLOT_OUT_OF_RANGE";
  }

  if (error.code === "UNSUPPORTED_ENTRY_METHOD") {
    return "UNSUPPORTED_ENTRY_METHOD";
  }

  return "VALIDATION_ERROR";
}

function defaultYearFromSchedule(dateRangeStart: string): number | undefined {
  const year = Number(dateRangeStart.slice(0, 4));

  return Number.isInteger(year) ? year : undefined;
}
