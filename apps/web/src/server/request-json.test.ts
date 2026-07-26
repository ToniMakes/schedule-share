import { describe, expect, it } from "vitest";

import { parseJsonRequest } from "./request-json";

const bodySchema = {
  safeParse(value: unknown) {
    if (
      typeof value === "object" &&
      value !== null &&
      "title" in value &&
      typeof value.title === "string" &&
      value.title.trim().length > 0
    ) {
      return {
        data: {
          title: value.title.trim()
        },
        success: true as const
      };
    }

    return {
      error: {
        flatten: () => ({
          fieldErrors: {
            title: ["Title is required."]
          },
          formErrors: []
        })
      },
      success: false as const
    };
  }
};

describe("parseJsonRequest", () => {
  it("parses valid JSON and validates it with the supplied schema", async () => {
    const result = await parseJsonRequest(
      new Request("https://example.com", {
        body: JSON.stringify({
          title: "  Team dinner  "
        }),
        method: "POST"
      }),
      bodySchema
    );

    expect(result).toEqual({
      data: {
        title: "Team dinner"
      },
      success: true
    });
  });

  it("returns a validation error response when the body is not valid JSON", async () => {
    const result = await parseJsonRequest(
      new Request("https://example.com", {
        body: "{",
        method: "POST"
      }),
      bodySchema
    );

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body must be valid JSON."
      }
    });
  });

  it("returns schema details when JSON is valid but the payload is invalid", async () => {
    const result = await parseJsonRequest(
      new Request("https://example.com", {
        body: JSON.stringify({
          title: ""
        }),
        method: "POST"
      }),
      bodySchema
    );

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: {
          fieldErrors: {
            title: expect.any(Array)
          }
        },
        message: "Invalid request body."
      }
    });
  });
});
