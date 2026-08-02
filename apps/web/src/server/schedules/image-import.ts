import { importedBusyBlockSchema, type ImportedBusyBlockDto } from "@schedule-share/api-client";
import { z } from "zod";

import { HttpError } from "../errors";
import {
  isUploadedFile,
  readImportFormData,
  readOptionalFormString,
  readRequiredFormString
} from "./import-form-data";

export const IMAGE_IMPORT_MAX_BYTES = 4 * 1024 * 1024;
export const IMAGE_IMPORT_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const DEFAULT_OPENAI_IMAGE_IMPORT_MODEL = "gpt-5.6-luna";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export interface ImageImportFile {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
}

export interface ImageImportPreviewInput {
  readonly file: ImageImportFile;
  readonly interpretsAs: "busy";
  readonly timezone: string;
}

export interface ImageImportRecognitionInput {
  readonly defaultYear?: number;
  readonly file: ImageImportFile;
  readonly scheduleDateRangeEnd: string;
  readonly scheduleDateRangeStart: string;
  readonly scheduleTimezone: string;
  readonly timezone: string;
}

export interface ImageImportRecognitionResult {
  readonly busyBlocks: readonly ImportedBusyBlockDto[];
  readonly confidence?: number;
  readonly warnings: readonly string[];
}

export interface ImageImportProvider {
  recognizeBusyBlocks(input: ImageImportRecognitionInput): Promise<ImageImportRecognitionResult>;
}

export class ImageImportProviderUnavailableError extends Error {
  constructor(message = "Image import provider is unavailable.") {
    super(message);
    this.name = "ImageImportProviderUnavailableError";
  }
}

export class ImageImportLowConfidenceError extends Error {
  constructor(message = "Could not confidently read the uploaded image.") {
    super(message);
    this.name = "ImageImportLowConfidenceError";
  }
}

interface OpenAiImageImportProviderOptions {
  readonly apiKey?: string;
  readonly fetch?: typeof fetch;
  readonly model?: string;
}

interface ImageImportEnvironment {
  readonly [key: string]: string | undefined;
  readonly OPENAI_API_KEY?: string;
  readonly OPENAI_IMAGE_IMPORT_MODEL?: string;
}

const rawImageImportResponseSchema = z
  .object({
    busyBlocks: z
      .array(
        z
          .object({
            sourceLabel: z.string().nullable(),
            localDate: z.string().nullable(),
            dayOfWeek: z.number().int().min(0).max(6).nullable(),
            startTime: z.string(),
            endTime: z.string(),
            timezone: z.string(),
            confidence: z.number().min(0).max(1).nullable(),
            warnings: z.array(z.string())
          })
          .strict()
      )
      .max(200),
    warnings: z.array(z.string()),
    confidence: z.number().min(0).max(1).nullable()
  })
  .strict();

type RawImageImportResponse = z.infer<typeof rawImageImportResponseSchema>;

export async function parseImageImportFormData(request: Request): Promise<ImageImportPreviewInput> {
  return parseImageImportFormDataFields(await readImportFormData(request));
}

export async function parseImageImportFormDataFields(
  formData: FormData
): Promise<ImageImportPreviewInput> {
  const method = readRequiredFormString(formData, "method");

  if (method !== "image_import") {
    throw new HttpError(
      400,
      "UNSUPPORTED_ENTRY_METHOD",
      "Multipart availability preview only supports image_import."
    );
  }

  const timezone = readRequiredFormString(formData, "timezone");
  const interpretsAs = readOptionalFormString(formData, "interpretsAs") ?? "busy";

  if (timezone.length > 100) {
    throw new HttpError(400, "VALIDATION_ERROR", "Timezone is too long.");
  }

  if (interpretsAs !== "busy") {
    throw new HttpError(400, "VALIDATION_ERROR", "Image imports must be interpreted as busy.");
  }

  const file = formData.get("file");

  if (!isUploadedFile(file)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Image file is required.");
  }

  const mimeType = file.type.toLowerCase();

  if (
    !IMAGE_IMPORT_ALLOWED_TYPES.includes(mimeType as (typeof IMAGE_IMPORT_ALLOWED_TYPES)[number])
  ) {
    throw new HttpError(
      415,
      "IMPORT_UNSUPPORTED_FILE_TYPE",
      "Image import supports PNG, JPEG, and WebP files."
    );
  }

  if (file.size <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Image file is empty.");
  }

  if (file.size > IMAGE_IMPORT_MAX_BYTES) {
    throw new HttpError(413, "IMPORT_FILE_TOO_LARGE", "Image file is too large.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  return {
    file: {
      bytes,
      filename: file.name || "schedule-image",
      mimeType,
      size: file.size
    },
    interpretsAs,
    timezone
  };
}

export function createConfiguredImageImportProvider(
  environment: ImageImportEnvironment = process.env,
  fetchImpl: typeof fetch = fetch
): ImageImportProvider {
  return new OpenAiImageImportProvider({
    apiKey: environment.OPENAI_API_KEY,
    fetch: fetchImpl,
    model: environment.OPENAI_IMAGE_IMPORT_MODEL
  });
}

export class OpenAiImageImportProvider implements ImageImportProvider {
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly model: string;

  constructor(options: OpenAiImageImportProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
    this.model = options.model?.trim() || DEFAULT_OPENAI_IMAGE_IMPORT_MODEL;
  }

  async recognizeBusyBlocks(
    input: ImageImportRecognitionInput
  ): Promise<ImageImportRecognitionResult> {
    if (this.apiKey === undefined || this.apiKey.trim().length === 0) {
      throw new ImageImportProviderUnavailableError();
    }

    const response = await this.fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(buildOpenAiRequest(this.model, input))
    });

    if (!response.ok) {
      throw new ImageImportProviderUnavailableError("Image import provider request failed.");
    }

    const payload = await response.json();
    const outputText = extractOutputText(payload);

    if (outputText === undefined) {
      throw new ImageImportLowConfidenceError();
    }

    let rawResult: unknown;

    try {
      rawResult = JSON.parse(outputText);
    } catch {
      throw new ImageImportLowConfidenceError();
    }

    const parsed = rawImageImportResponseSchema.safeParse(rawResult);

    if (!parsed.success) {
      throw new ImageImportLowConfidenceError();
    }

    return normalizeRawImageImportResponse(parsed.data, input.timezone);
  }
}

function buildOpenAiRequest(model: string, input: ImageImportRecognitionInput): unknown {
  return {
    model,
    input: [
      {
        role: "system",
        content:
          "Extract busy time blocks from a timetable or work schedule image. Return only the JSON schema. Do not infer availability; only extract busy classes, shifts, meetings, or blocked times visible in the image."
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildImageImportPrompt(input)
          },
          {
            type: "input_image",
            image_url: `data:${input.file.mimeType};base64,${Buffer.from(input.file.bytes).toString(
              "base64"
            )}`,
            detail: "high"
          }
        ]
      }
    ],
    max_output_tokens: 2000,
    text: {
      format: {
        type: "json_schema",
        name: "schedule_image_busy_blocks",
        strict: true,
        schema: {
          type: "object",
          properties: {
            busyBlocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sourceLabel: { type: ["string", "null"] },
                  localDate: {
                    type: ["string", "null"],
                    description: "YYYY-MM-DD when the image shows a concrete date."
                  },
                  dayOfWeek: {
                    type: ["integer", "null"],
                    description: "0 for Sunday through 6 for Saturday when recurring weekly."
                  },
                  startTime: { type: "string", description: "HH:mm in 24-hour local time." },
                  endTime: { type: "string", description: "HH:mm in 24-hour local time." },
                  timezone: { type: "string" },
                  confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
                  warnings: { type: "array", items: { type: "string" } }
                },
                required: [
                  "sourceLabel",
                  "localDate",
                  "dayOfWeek",
                  "startTime",
                  "endTime",
                  "timezone",
                  "confidence",
                  "warnings"
                ],
                additionalProperties: false
              }
            },
            warnings: { type: "array", items: { type: "string" } },
            confidence: { type: ["number", "null"], minimum: 0, maximum: 1 }
          },
          required: ["busyBlocks", "warnings", "confidence"],
          additionalProperties: false
        }
      }
    }
  };
}

function buildImageImportPrompt(input: ImageImportRecognitionInput): string {
  const defaultYear =
    input.defaultYear === undefined
      ? "If the image omits a year, leave localDate null and use dayOfWeek when possible."
      : `If the image shows a month and day without a year, use ${input.defaultYear}.`;

  return [
    `User timezone: ${input.timezone}.`,
    `Schedule timezone: ${input.scheduleTimezone}.`,
    `Schedule date range: ${input.scheduleDateRangeStart} to ${input.scheduleDateRangeEnd}.`,
    defaultYear,
    "For weekly class timetables, prefer dayOfWeek instead of localDate.",
    "For dated work shifts or one-off meetings, prefer localDate.",
    "Use the user timezone for every busy block timezone unless the image clearly says another IANA timezone.",
    "Ignore room names, teachers, notes, and locations except as sourceLabel context.",
    "If a time is uncertain, still return the best block with lower confidence and a warning."
  ].join("\n");
}

function extractOutputText(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return undefined;
  }

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (!isRecord(contentItem)) {
        continue;
      }

      if (typeof contentItem.text === "string") {
        return contentItem.text;
      }
    }
  }

  return undefined;
}

function normalizeRawImageImportResponse(
  raw: RawImageImportResponse,
  fallbackTimezone: string
): ImageImportRecognitionResult {
  let busyBlocks: ImportedBusyBlockDto[];

  try {
    busyBlocks = raw.busyBlocks.map((block) =>
      importedBusyBlockSchema.parse({
        ...(block.sourceLabel === null ? {} : { sourceLabel: block.sourceLabel }),
        ...(block.localDate === null ? {} : { localDate: block.localDate }),
        ...(block.dayOfWeek === null ? {} : { dayOfWeek: block.dayOfWeek }),
        startTime: block.startTime,
        endTime: block.endTime,
        timezone: block.timezone.trim().length === 0 ? fallbackTimezone : block.timezone,
        ...(block.confidence === null ? {} : { confidence: block.confidence }),
        warnings: block.warnings
      })
    );
  } catch {
    throw new ImageImportLowConfidenceError();
  }

  return {
    busyBlocks,
    warnings: raw.warnings,
    ...(raw.confidence === null ? {} : { confidence: raw.confidence })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
