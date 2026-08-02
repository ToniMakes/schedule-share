import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import {
  IMAGE_IMPORT_MAX_BYTES,
  ImageImportProviderUnavailableError,
  OpenAiImageImportProvider,
  parseImageImportFormData
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
});
