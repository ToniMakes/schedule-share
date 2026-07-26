import { describe, expect, it } from "vitest";

import type { ApiErrorCode } from "@schedule-share/api-client";
import { hashKey } from "../credentials";
import { HttpError } from "../errors";
import {
  assertOwnerKeyMatches,
  assertOwnerKeyPresent,
  assertParticipantEditKeyMatches,
  assertParticipantEditKeyPresent
} from "./access-keys";

describe("assertOwnerKeyPresent", () => {
  it("accepts non-empty owner keys", () => {
    expect(() => assertOwnerKeyPresent("owner-secret")).not.toThrow();
  });

  it("rejects empty owner keys", () => {
    expectHttpError(() => assertOwnerKeyPresent(""), {
      code: "INVALID_OWNER_KEY",
      message: "Owner key is invalid.",
      status: 403
    });
  });
});

describe("assertOwnerKeyMatches", () => {
  it("accepts matching owner keys", () => {
    expect(() => assertOwnerKeyMatches("owner-secret", hashKey("owner-secret"))).not.toThrow();
  });

  it("rejects mismatched owner keys", () => {
    expectHttpError(() => assertOwnerKeyMatches("wrong", hashKey("owner-secret")), {
      code: "INVALID_OWNER_KEY",
      message: "Owner key is invalid.",
      status: 403
    });
  });
});

describe("assertParticipantEditKeyPresent", () => {
  it("accepts non-empty participant edit keys", () => {
    expect(() => assertParticipantEditKeyPresent("edit-secret")).not.toThrow();
  });

  it("rejects empty participant edit keys", () => {
    expectHttpError(() => assertParticipantEditKeyPresent(""), {
      code: "INVALID_EDIT_KEY",
      message: "Participant edit key is invalid.",
      status: 403
    });
  });
});

describe("assertParticipantEditKeyMatches", () => {
  it("accepts matching participant edit keys", () => {
    expect(() =>
      assertParticipantEditKeyMatches("edit-secret", hashKey("edit-secret"))
    ).not.toThrow();
  });

  it("rejects mismatched participant edit keys", () => {
    expectHttpError(() => assertParticipantEditKeyMatches("wrong", hashKey("edit-secret")), {
      code: "INVALID_EDIT_KEY",
      message: "Participant edit key is invalid.",
      status: 403
    });
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
