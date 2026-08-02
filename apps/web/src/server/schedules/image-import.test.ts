import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import {
  IMAGE_IMPORT_MAX_BYTES,
  checkImageImportCostPolicy,
  checkImageImportAccess,
  createConfiguredImageImportProvider,
  ImageImportProviderUnavailableError,
  OpenAiImageImportProvider,
  parseImageImportFormData,
  parseImageImportFormDataFields,
  readImageImportRuntimeConfig
} from "./image-import";

describe("parseImageImportFormData", () => {
  it("accepts a supported image upload", async () => {
    const formData = new FormData();
    formData.set("method", "image_import");
    formData.set("timezone", "Australia/Sydney");
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "timetable.png", {
        type: "image/png"
      })
    );

    const result = await parseImageImportFormData(
      new Request("http://test.local", {
        body: formData,
        method: "POST"
      })
    );

    expect(result).toMatchObject({
      file: {
        filename: "timetable.png",
        mimeType: "image/png",
        size: 3
      },
      interpretsAs: "busy",
      timezone: "Australia/Sydney"
    });
    expect(Array.from(result.file.bytes)).toEqual([1, 2, 3]);
  });

  it("rejects unsupported file types", async () => {
    const formData = new FormData();
    formData.set("method", "image_import");
    formData.set("timezone", "Australia/Sydney");
    formData.set(
      "file",
      new File([new Uint8Array([1])], "timetable.gif", {
        type: "image/gif"
      })
    );

    await expect(
      parseImageImportFormData(
        new Request("http://test.local", {
          body: formData,
          method: "POST"
        })
      )
    ).rejects.toMatchObject({
      code: "IMPORT_UNSUPPORTED_FILE_TYPE",
      status: 415
    } satisfies Partial<HttpError>);
  });

  it("rejects oversized images", async () => {
    const formData = new FormData();
    formData.set("method", "image_import");
    formData.set("timezone", "Australia/Sydney");
    formData.set(
      "file",
      new File([new Uint8Array(IMAGE_IMPORT_MAX_BYTES + 1)], "timetable.png", {
        type: "image/png"
      })
    );

    await expect(
      parseImageImportFormData(
        new Request("http://test.local", {
          body: formData,
          method: "POST"
        })
      )
    ).rejects.toMatchObject({
      code: "IMPORT_FILE_TOO_LARGE",
      status: 413
    } satisfies Partial<HttpError>);
  });

  it("applies a stricter runtime upload limit", async () => {
    const formData = new FormData();
    formData.set("method", "image_import");
    formData.set("timezone", "Australia/Sydney");
    formData.set(
      "file",
      new File([new Uint8Array(11)], "timetable.png", {
        type: "image/png"
      })
    );

    await expect(parseImageImportFormDataFields(formData, { maxBytes: 10 })).rejects.toMatchObject({
      code: "IMPORT_FILE_TOO_LARGE",
      status: 413
    } satisfies Partial<HttpError>);
  });
});

describe("OpenAiImageImportProvider", () => {
  it("requires an API key", async () => {
    const provider = new OpenAiImageImportProvider();

    await expect(
      provider.recognizeBusyBlocks({
        file: {
          bytes: new Uint8Array([1]),
          filename: "timetable.png",
          mimeType: "image/png",
          size: 1
        },
        scheduleDateRangeEnd: "2026-08-01",
        scheduleDateRangeStart: "2026-08-01",
        scheduleTimezone: "Australia/Sydney",
        timezone: "Australia/Sydney"
      })
    ).rejects.toBeInstanceOf(ImageImportProviderUnavailableError);
  });

  it("parses structured OpenAI output into busy blocks", async () => {
    const calls: Array<{ readonly body: unknown; readonly input: RequestInfo | URL }> = [];
    const provider = new OpenAiImageImportProvider({
      apiKey: "test-key",
      fetch: async (input, init) => {
        calls.push({
          body: JSON.parse(String(init?.body)),
          input
        });

        return new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              busyBlocks: [
                {
                  sourceLabel: "COMP101",
                  localDate: null,
                  dayOfWeek: 6,
                  startTime: "09:00",
                  endTime: "10:30",
                  timezone: "Australia/Sydney",
                  confidence: 0.82,
                  warnings: []
                }
              ],
              warnings: ["Review OCR output before submitting."],
              confidence: 0.82
            })
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      },
      model: "gpt-5.6-luna"
    });

    const result = await provider.recognizeBusyBlocks({
      defaultYear: 2026,
      file: {
        bytes: new Uint8Array([1, 2, 3]),
        filename: "timetable.png",
        mimeType: "image/png",
        size: 3
      },
      scheduleDateRangeEnd: "2026-08-01",
      scheduleDateRangeStart: "2026-08-01",
      scheduleTimezone: "Australia/Sydney",
      timezone: "Australia/Sydney"
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://api.openai.com/v1/responses");
    expect(calls[0]!.body).toMatchObject({
      max_output_tokens: 2000,
      model: "gpt-5.6-luna",
      text: {
        format: {
          type: "json_schema",
          name: "schedule_image_busy_blocks",
          strict: true
        }
      }
    });
    expect(result).toEqual({
      busyBlocks: [
        {
          sourceLabel: "COMP101",
          dayOfWeek: 6,
          startTime: "09:00",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.82,
          warnings: []
        }
      ],
      warnings: ["Review OCR output before submitting."],
      confidence: 0.82
    });
  });

  it("rejects recognized output below the configured confidence threshold", async () => {
    const provider = new OpenAiImageImportProvider({
      apiKey: "test-key",
      fetch: async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              busyBlocks: [],
              warnings: ["Image is unclear."],
              confidence: 0.4
            })
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        ),
      minConfidence: 0.7
    });

    await expect(
      provider.recognizeBusyBlocks({
        file: {
          bytes: new Uint8Array([1]),
          filename: "timetable.png",
          mimeType: "image/png",
          size: 1
        },
        scheduleDateRangeEnd: "2026-08-01",
        scheduleDateRangeStart: "2026-08-01",
        scheduleTimezone: "Australia/Sydney",
        timezone: "Australia/Sydney"
      })
    ).rejects.toMatchObject({
      name: "ImageImportLowConfidenceError"
    });
  });
});

describe("image import runtime gates", () => {
  it("keeps image import disabled by default even when an API key exists", () => {
    const environment = {
      OPENAI_API_KEY: "test-key"
    };

    expect(readImageImportRuntimeConfig(environment)).toMatchObject({
      enabled: false,
      releaseMode: "off"
    });
    expect(createConfiguredImageImportProvider(environment)).toBeUndefined();
  });

  it("allows local-only image import outside production when explicitly enabled", () => {
    const environment = {
      AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD: "0.25",
      AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT: "20",
      AI_IMAGE_IMPORT_ENABLED: "true",
      AI_IMAGE_IMPORT_ESTIMATED_COST_USD: "0.01",
      AI_IMAGE_IMPORT_RELEASE_MODE: "local_only",
      AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD: "0.02",
      NODE_ENV: "development",
      OPENAI_API_KEY: "test-key"
    };

    expect(createConfiguredImageImportProvider(environment)).toBeInstanceOf(
      OpenAiImageImportProvider
    );
  });

  it("requires the internal test token in internal test mode", () => {
    const config = readImageImportRuntimeConfig({
      AI_IMAGE_IMPORT_ENABLED: "true",
      AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN: "secret",
      AI_IMAGE_IMPORT_RELEASE_MODE: "internal_test",
      NODE_ENV: "production",
      OPENAI_API_KEY: "test-key"
    });

    expect(checkImageImportAccess(config, "wrong")).toMatchObject({ allowed: false });
    expect(checkImageImportAccess(config, "secret")).toMatchObject({ allowed: true });
  });

  it("rejects a cost policy where each image import can exceed the per-request ceiling", () => {
    expect(
      checkImageImportCostPolicy({
        dailyCostLimitUsd: 1,
        dailyRequestLimit: 10,
        estimatedCostPerRequestUsd: 0.03,
        maxEstimatedCostPerRequestUsd: 0.02
      })
    ).toMatchObject({
      allowed: false
    });
  });

  it("rejects a cost policy where the daily request limit can overspend the daily budget", () => {
    const environment = {
      AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD: "0.05",
      AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT: "20",
      AI_IMAGE_IMPORT_ENABLED: "true",
      AI_IMAGE_IMPORT_ESTIMATED_COST_USD: "0.01",
      AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN: "secret",
      AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD: "0.02",
      AI_IMAGE_IMPORT_RELEASE_MODE: "internal_test",
      NODE_ENV: "production",
      OPENAI_API_KEY: "test-key"
    };

    expect(createConfiguredImageImportProvider(environment, fetch, "secret")).toBeUndefined();
  });

  it("does not allow public image import before credit and ad gate code exists", () => {
    const environment = {
      AI_IMAGE_AD_GATE_READY: "true",
      AI_IMAGE_COST_GUARDRAIL_ENABLED: "true",
      AI_IMAGE_CREDITS_ENFORCED: "true",
      AI_IMAGE_IMPORT_ENABLED: "true",
      AI_IMAGE_IMPORT_RELEASE_MODE: "public",
      NODE_ENV: "production",
      OPENAI_API_KEY: "test-key"
    };

    expect(createConfiguredImageImportProvider(environment)).toBeUndefined();
  });
});
