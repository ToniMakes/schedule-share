import { describe, expect, it } from "vitest";

import { ApiClientError, getHealthStatus, healthStatusResponseSchema } from "../src";

describe("healthStatusResponseSchema", () => {
  it("parses healthy and unhealthy responses", () => {
    expect(
      healthStatusResponseSchema.parse({
        status: "healthy",
        checks: {
          database: "ok"
        }
      })
    ).toEqual({
      status: "healthy",
      checks: {
        database: "ok"
      }
    });

    expect(
      healthStatusResponseSchema.parse({
        status: "unhealthy",
        checks: {
          database: "unavailable"
        }
      })
    ).toEqual({
      status: "unhealthy",
      checks: {
        database: "unavailable"
      }
    });
  });
});

describe("getHealthStatus", () => {
  it("fetches health status and parses a healthy response", async () => {
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await getHealthStatus({
      baseUrl: "https://example.com",
      fetch: async (input, init) => {
        calls.push({ input, init });
        return new Response(
          JSON.stringify({
            status: "healthy",
            checks: {
              database: "ok"
            }
          }),
          {
            status: 200
          }
        );
      }
    });

    expect(result).toEqual({
      status: "healthy",
      checks: {
        database: "ok"
      }
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/health");
    expect(calls[0]!.init).toBeUndefined();
  });

  it("returns unhealthy health payloads even when HTTP status is 503", async () => {
    await expect(
      getHealthStatus({
        fetch: async () =>
          new Response(
            JSON.stringify({
              status: "unhealthy",
              checks: {
                database: "unavailable"
              }
            }),
            {
              status: 503
            }
          )
      })
    ).resolves.toEqual({
      status: "unhealthy",
      checks: {
        database: "unavailable"
      }
    });
  });

  it("rejects unexpected health responses", async () => {
    await expect(
      getHealthStatus({
        fetch: async () =>
          new Response(JSON.stringify({ status: "ok" }), {
            status: 200
          })
      })
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "INTERNAL_ERROR"
    } satisfies Partial<ApiClientError>);
  });
});
