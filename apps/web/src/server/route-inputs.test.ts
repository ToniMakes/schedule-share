import { describe, expect, it } from "vitest";

import { readAccessKey, readParticipantRouteParams, readScheduleRouteParams } from "./route-inputs";

describe("readScheduleRouteParams", () => {
  it("returns the schedule public id from route params", async () => {
    await expect(
      readScheduleRouteParams({
        params: Promise.resolve({
          publicId: "abc123"
        })
      })
    ).resolves.toEqual({
      publicId: "abc123"
    });
  });
});

describe("readParticipantRouteParams", () => {
  it("returns schedule and participant ids from route params", async () => {
    await expect(
      readParticipantRouteParams({
        params: Promise.resolve({
          participantId: "participant-1",
          publicId: "abc123"
        })
      })
    ).resolves.toEqual({
      participantId: "participant-1",
      publicId: "abc123"
    });
  });
});

describe("readAccessKey", () => {
  it("returns the key query parameter", () => {
    const request = new Request("https://example.com/s/abc123?key=secret");

    expect(readAccessKey(request)).toBe("secret");
  });

  it("returns an empty string when the key query parameter is missing", () => {
    const request = new Request("https://example.com/s/abc123");

    expect(readAccessKey(request)).toBe("");
  });
});
