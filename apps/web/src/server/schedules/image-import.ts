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
const DEFAULT_OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS = 2000;
const DEFAULT_OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE = 0.6;
const DEFAULT_OPENAI_IMAGE_IMPORT_TIMEOUT_MS = 15_000;
const MAX_OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS = 3000;
const MAX_OPENAI_IMAGE_IMPORT_TIMEOUT_MS = 30_000;
const DEFAULT_AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD = 0.25;
const DEFAULT_AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT = 20;
const DEFAULT_AI_IMAGE_IMPORT_ESTIMATED_COST_USD = 0.01;
const DEFAULT_AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD = 0.02;
const MAX_AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD = 10;
const MAX_AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT = 500;
const MAX_AI_IMAGE_IMPORT_ESTIMATED_COST_USD = 0.1;
const PUBLIC_IMAGE_IMPORT_RELEASE_SUPPORTED = false;

const imageImportReleaseModes = ["off", "local_only", "internal_test", "public"] as const;

export type ImageImportReleaseMode = (typeof imageImportReleaseModes)[number];

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
  readonly maxOutputTokens?: number;
  readonly minConfidence?: number;
  readonly model?: string;
  readonly timeoutMs?: number;
}

interface ImageImportEnvironment {
  readonly [key: string]: string | undefined;
  readonly AI_IMAGE_AD_GATE_READY?: string;
  readonly AI_IMAGE_COST_GUARDRAIL_ENABLED?: string;
  readonly AI_IMAGE_CREDITS_ENFORCED?: string;
  readonly AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD?: string;
  readonly AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT?: string;
  readonly AI_IMAGE_IMPORT_ENABLED?: string;
  readonly AI_IMAGE_IMPORT_ESTIMATED_COST_USD?: string;
  readonly AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN?: string;
  readonly AI_IMAGE_IMPORT_MAX_BYTES?: string;
  readonly AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD?: string;
  readonly AI_IMAGE_IMPORT_RELEASE_MODE?: string;
  readonly NODE_ENV?: string;
  readonly OPENAI_API_KEY?: string;
  readonly OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS?: string;
  readonly OPENAI_IMAGE_IMPORT_MODEL?: string;
  readonly OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE?: string;
  readonly OPENAI_IMAGE_IMPORT_TIMEOUT_MS?: string;
  readonly VERCEL_ENV?: string;
}

export interface ImageImportRuntimeConfig {
  readonly adGateReady: boolean;
  readonly costGuardrailEnabled: boolean;
  readonly creditsEnforced: boolean;
  readonly dailyCostLimitUsd: number;
  readonly dailyRequestLimit: number;
  readonly enabled: boolean;
  readonly estimatedCostPerRequestUsd: number;
  readonly internalTestToken?: string;
  readonly maxBytes: number;
  readonly maxEstimatedCostPerRequestUsd: number;
  readonly maxOutputTokens: number;
  readonly minConfidence: number;
  readonly model: string;
  readonly nodeEnv?: string;
  readonly releaseMode: ImageImportReleaseMode;
  readonly timeoutMs: number;
  readonly vercelEnv?: string;
}

interface ImageImportAccessResult {
  readonly allowed: boolean;
  readonly reason?: string;
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
  formData: FormData,
  options: { readonly maxBytes?: number } = {}
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

  if (file.size > (options.maxBytes ?? IMAGE_IMPORT_MAX_BYTES)) {
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
  fetchImpl: typeof fetch = fetch,
  accessToken?: string
): ImageImportProvider | undefined {
  const config = readImageImportRuntimeConfig(environment);
  const access = checkImageImportAccess(config, accessToken);

  if (!access.allowed) {
    return undefined;
  }

  return new OpenAiImageImportProvider({
    apiKey: environment.OPENAI_API_KEY,
    fetch: fetchImpl,
    maxOutputTokens: config.maxOutputTokens,
    minConfidence: config.minConfidence,
    model: config.model,
    timeoutMs: config.timeoutMs
  });
}

export function readImageImportRuntimeConfig(
  environment: ImageImportEnvironment = process.env
): ImageImportRuntimeConfig {
  return {
    adGateReady: parseBooleanFlag(environment.AI_IMAGE_AD_GATE_READY),
    costGuardrailEnabled: parseBooleanFlag(environment.AI_IMAGE_COST_GUARDRAIL_ENABLED),
    creditsEnforced: parseBooleanFlag(environment.AI_IMAGE_CREDITS_ENFORCED),
    dailyCostLimitUsd: parseBoundedNumber(environment.AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD, {
      defaultValue: DEFAULT_AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD,
      maxValue: MAX_AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD,
      minValue: 0.01
    }),
    dailyRequestLimit: parseBoundedInteger(environment.AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT, {
      defaultValue: DEFAULT_AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT,
      maxValue: MAX_AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT,
      minValue: 1
    }),
    enabled: parseBooleanFlag(environment.AI_IMAGE_IMPORT_ENABLED),
    estimatedCostPerRequestUsd: parseBoundedNumber(environment.AI_IMAGE_IMPORT_ESTIMATED_COST_USD, {
      defaultValue: DEFAULT_AI_IMAGE_IMPORT_ESTIMATED_COST_USD,
      maxValue: MAX_AI_IMAGE_IMPORT_ESTIMATED_COST_USD,
      minValue: 0.0001
    }),
    internalTestToken: trimToUndefined(environment.AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN),
    maxBytes: parseBoundedInteger(environment.AI_IMAGE_IMPORT_MAX_BYTES, {
      defaultValue: IMAGE_IMPORT_MAX_BYTES,
      maxValue: IMAGE_IMPORT_MAX_BYTES,
      minValue: 1
    }),
    maxEstimatedCostPerRequestUsd: parseBoundedNumber(
      environment.AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD,
      {
        defaultValue: DEFAULT_AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD,
        maxValue: MAX_AI_IMAGE_IMPORT_ESTIMATED_COST_USD,
        minValue: 0.0001
      }
    ),
    maxOutputTokens: parseBoundedInteger(environment.OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS, {
      defaultValue: DEFAULT_OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS,
      maxValue: MAX_OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS,
      minValue: 200
    }),
    minConfidence: parseBoundedNumber(environment.OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE, {
      defaultValue: DEFAULT_OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE,
      maxValue: 1,
      minValue: 0
    }),
    model:
      trimToUndefined(environment.OPENAI_IMAGE_IMPORT_MODEL) ?? DEFAULT_OPENAI_IMAGE_IMPORT_MODEL,
    nodeEnv: trimToUndefined(environment.NODE_ENV),
    releaseMode: parseReleaseMode(environment.AI_IMAGE_IMPORT_RELEASE_MODE),
    timeoutMs: parseBoundedInteger(environment.OPENAI_IMAGE_IMPORT_TIMEOUT_MS, {
      defaultValue: DEFAULT_OPENAI_IMAGE_IMPORT_TIMEOUT_MS,
      maxValue: MAX_OPENAI_IMAGE_IMPORT_TIMEOUT_MS,
      minValue: 1000
    }),
    vercelEnv: trimToUndefined(environment.VERCEL_ENV)
  };
}

export function checkImageImportAccess(
  config: ImageImportRuntimeConfig,
  accessToken?: string
): ImageImportAccessResult {
  if (!config.enabled) {
    return { allowed: false, reason: "Image import is disabled by feature flag." };
  }

  if (config.releaseMode === "off") {
    return { allowed: false, reason: "Image import release mode is off." };
  }

  const costPolicy = checkImageImportCostPolicy(config);

  if (!costPolicy.allowed) {
    return costPolicy;
  }

  if (config.releaseMode === "local_only") {
    const isLocalRuntime =
      config.nodeEnv !== "production" &&
      (config.vercelEnv === undefined || config.vercelEnv === "");

    return isLocalRuntime
      ? { allowed: true }
      : { allowed: false, reason: "Image import local-only mode is not available here." };
  }

  if (config.releaseMode === "internal_test") {
    if (config.internalTestToken === undefined) {
      return { allowed: false, reason: "Image import internal test token is not configured." };
    }

    return accessToken === config.internalTestToken
      ? { allowed: true }
      : { allowed: false, reason: "Image import internal test token did not match." };
  }

  if (!PUBLIC_IMAGE_IMPORT_RELEASE_SUPPORTED) {
    return {
      allowed: false,
      reason: "Public image import requires the credit ledger and rewarded ad verification first."
    };
  }

  if (!config.adGateReady || !config.creditsEnforced || !config.costGuardrailEnabled) {
    return {
      allowed: false,
      reason: "Public image import requires ad gating, credit enforcement, and cost guardrails."
    };
  }

  return { allowed: true };
}

export function checkImageImportCostPolicy(
  config: Pick<
    ImageImportRuntimeConfig,
    | "dailyCostLimitUsd"
    | "dailyRequestLimit"
    | "estimatedCostPerRequestUsd"
    | "maxEstimatedCostPerRequestUsd"
  >
): ImageImportAccessResult {
  if (config.estimatedCostPerRequestUsd > config.maxEstimatedCostPerRequestUsd) {
    return {
      allowed: false,
      reason: "Image import estimated cost exceeds the per-request cost ceiling."
    };
  }

  if (config.estimatedCostPerRequestUsd > config.dailyCostLimitUsd) {
    return {
      allowed: false,
      reason: "Image import estimated cost exceeds the daily cost ceiling."
    };
  }

  if (config.estimatedCostPerRequestUsd * config.dailyRequestLimit > config.dailyCostLimitUsd) {
    return {
      allowed: false,
      reason: "Image import daily request limit can exceed the daily cost ceiling."
    };
  }

  return { allowed: true };
}

export function isPublicImageImportVisible(
  config: ImageImportRuntimeConfig = readImageImportRuntimeConfig()
): boolean {
  return checkImageImportAccess(config).allowed && config.releaseMode === "public";
}

export class OpenAiImageImportProvider implements ImageImportProvider {
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxOutputTokens: number;
  private readonly minConfidence: number;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAiImageImportProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
    this.maxOutputTokens = options.maxOutputTokens ?? DEFAULT_OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS;
    this.minConfidence = options.minConfidence ?? DEFAULT_OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE;
    this.model = options.model?.trim() || DEFAULT_OPENAI_IMAGE_IMPORT_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_OPENAI_IMAGE_IMPORT_TIMEOUT_MS;
  }

  async recognizeBusyBlocks(
    input: ImageImportRecognitionInput
  ): Promise<ImageImportRecognitionResult> {
    if (this.apiKey === undefined || this.apiKey.trim().length === 0) {
      throw new ImageImportProviderUnavailableError();
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

    let response: Response;

    try {
      response = await this.fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(buildOpenAiRequest(this.model, input, this.maxOutputTokens)),
        signal: abortController.signal
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new ImageImportProviderUnavailableError("Image import provider timed out.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }

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

    const normalized = normalizeRawImageImportResponse(parsed.data, input.timezone);

    if (normalized.confidence !== undefined && normalized.confidence < this.minConfidence) {
      throw new ImageImportLowConfidenceError();
    }

    return normalized;
  }
}

function buildOpenAiRequest(
  model: string,
  input: ImageImportRecognitionInput,
  maxOutputTokens: number
): unknown {
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
    max_output_tokens: maxOutputTokens,
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

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function parseReleaseMode(value: string | undefined): ImageImportReleaseMode {
  const normalized = value?.trim();

  return imageImportReleaseModes.includes(normalized as ImageImportReleaseMode)
    ? (normalized as ImageImportReleaseMode)
    : "off";
}

function parseBoundedInteger(
  value: string | undefined,
  {
    defaultValue,
    maxValue,
    minValue
  }: { readonly defaultValue: number; readonly maxValue: number; readonly minValue: number }
): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, minValue), maxValue);
}

function parseBoundedNumber(
  value: string | undefined,
  {
    defaultValue,
    maxValue,
    minValue
  }: { readonly defaultValue: number; readonly maxValue: number; readonly minValue: number }
): number {
  const parsed = Number.parseFloat(value ?? "");

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, minValue), maxValue);
}

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
