import { describe, expect, it } from "vitest";

import { buildAbsoluteUrl, getConfiguredAppBaseUrl, getRequestBaseUrl } from "./urls";

describe("buildAbsoluteUrl", () => {
  it("builds absolute URLs with query parameters", () => {
    expect(
      buildAbsoluteUrl("https://schedule.example", "/s/abc123/manage", {
        key: "owner secret"
      })
    ).toBe("https://schedule.example/s/abc123/manage?key=owner+secret");
  });
});

describe("getRequestBaseUrl", () => {
  it("prefers a configured app base URL", () => {
    const request = new Request("http://localhost:3000/api/schedules", {
      headers: {
        host: "localhost:3000"
      }
    });

    expect(getRequestBaseUrl(request, { appBaseUrl: "https://schedule.example/" })).toBe(
      "https://schedule.example"
    );
  });

  it("uses forwarded host and protocol when no app base URL is configured", () => {
    const request = new Request("http://internal.local/api/schedules", {
      headers: {
        "x-forwarded-host": "schedule.example",
        "x-forwarded-proto": "https"
      }
    });

    expect(getRequestBaseUrl(request, { appBaseUrl: "" })).toBe("https://schedule.example");
  });

  it("falls back to the request origin when host headers are unavailable", () => {
    const request = new Request("http://localhost:3000/api/schedules");

    expect(getRequestBaseUrl(request, { appBaseUrl: "" })).toBe("http://localhost:3000");
  });
});

describe("getConfiguredAppBaseUrl", () => {
  it("returns undefined when the value is missing", () => {
    expect(getConfiguredAppBaseUrl(undefined)).toBeUndefined();
  });

  it("rejects non-http URLs", () => {
    expect(() => getConfiguredAppBaseUrl("ftp://schedule.example")).toThrow(
      "APP_BASE_URL must be an http:// or https:// URL."
    );
  });

  it("rejects invalid URLs", () => {
    expect(() => getConfiguredAppBaseUrl("not a url")).toThrow(
      "APP_BASE_URL must be an http:// or https:// URL."
    );
  });
});
