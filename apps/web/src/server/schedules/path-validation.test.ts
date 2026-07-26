import { describe, expect, it } from "vitest";

import type { ApiErrorCode } from "@schedule-share/api-client";
import { HttpError } from "../errors";
import {
  assertParticipantId,
  assertScheduleParticipantPath,
  assertSchedulePublicId
} from "./path-validation";

describe("assertSchedulePublicId", () => {
  it("accepts non-empty public ids", () => {
    expect(() => assertSchedulePublicId("abc123")).not.toThrow();
  });

  it("rejects blank public ids", () => {
    expectHttpError(() => assertSchedulePublicId(" "), {
      code: "VALIDATION_ERROR",
      message: "Schedule public id is required.",
      status: 400
    });
  });
});

describe("assertParticipantId", () => {
  it("accepts non-empty participant ids", () => {
    expect(() => assertParticipantId("participant-1")).not.toThrow();
  });

  it("rejects blank participant ids", () => {
    expectHttpError(() => assertParticipantId(" "), {
      code: "VALIDATION_ERROR",
      message: "Participant id is required.",
      status: 400
    });
  });
});

describe("assertScheduleParticipantPath", () => {
  it("validates schedule and participant ids together", () => {
    expect(() => assertScheduleParticipantPath("abc123", "participant-1")).not.toThrow();
  });
});

function expectHttpError(
  action: () => void,
  expected: { readonly code: ApiErrorCode; readonly message: string; readonly status: number }
): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject(expected);
    return;
  }

  throw new Error("Expected HttpError.");
}
