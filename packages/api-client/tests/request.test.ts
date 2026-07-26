import { z } from "zod";
import { describe, expect, it } from "vitest";

import { ApiClientError } from "../src";
import { requestJson, resolveApiUrl } from "../src/client/request";

const okResponseSchema = z.object({
  ok: z.boolean()
});

describe("resolveApiUrl", () => {
  it("returns relative API paths when no base URL is configured", () => {
    expect(resolveApiUrl("/api/schedules")).toBe("/api/schedules");
    expect(resolveApiUrl("/api/schedules", " ")).toBe("/api/schedules");
  });

  it("resolves API paths against a configured base URL", () => {
    expect(resolveApiUrl("/api/schedules", "https://example.com/app")).toBe(
      "https://example.com/api/schedules"
    );
  });
});

describe("requestJson", () => {
  it("fetches JSON and parses successful responses", async () => {
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await requestJson({
      init: {
        method: "POST"
      },
      options: {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200
          });
        }
      },
      path: "/api/example",
      responseSchema: okResponseSchema
    });

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        input: "https://example.com/api/example",
        init: {
          method: "POST"
        }
      }
    ]);
  });

  it("maps API error payloads to ApiClientError", async () => {
    await expect(
      requestJson({
        options: {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid request body."
                }
              }),
              {
                status: 400
              }
            )
        },
        path: "/api/example",
        responseSchema: okResponseSchema
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      name: "ApiClientError",
      status: 400
    } satisfies Partial<ApiClientError>);
  });

  it("maps unexpected error payloads to a generic ApiClientError", async () => {
    await expect(
      requestJson({
        options: {
          fetch: async () =>
            new Response("Server exploded.", {
              status: 500
            })
        },
        path: "/api/example",
        responseSchema: okResponseSchema
      })
    ).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Unexpected API error.",
      name: "ApiClientError",
      status: 500
    } satisfies Partial<ApiClientError>);
  });

  it("can parse schema-valid payloads from allowed error statuses", async () => {
    await expect(
      requestJson({
        allowErrorStatus: true,
        options: {
          fetch: async () =>
            new Response(JSON.stringify({ ok: false }), {
              status: 503
            })
        },
        path: "/api/example",
        responseSchema: okResponseSchema
      })
    ).resolves.toEqual({ ok: false });
  });
});
