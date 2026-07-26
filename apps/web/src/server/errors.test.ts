import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpError, unknownErrorResponse, withApiErrorHandling } from "./errors";

describe("unknownErrorResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes known HttpError values without logging them", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = unknownErrorResponse(
      new HttpError(403, "INVALID_OWNER_KEY", "Owner key is invalid.", {
        ownerKey: ["Invalid owner key."]
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_OWNER_KEY",
        details: {
          ownerKey: ["Invalid owner key."]
        },
        message: "Owner key is invalid."
      }
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs unknown errors and returns a generic internal error response", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("Database exploded.");
    const response = unknownErrorResponse(error);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error."
      }
    });
    expect(errorSpy).toHaveBeenCalledWith(error);
  });
});

describe("withApiErrorHandling", () => {
  it("returns the handler response when it succeeds", async () => {
    const response = await withApiErrorHandling(async () =>
      Response.json(
        {
          ok: true
        },
        {
          status: 201
        }
      )
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });

  it("converts thrown HttpError values into API error responses", async () => {
    const response = await withApiErrorHandling(async () => {
      throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SCHEDULE_NOT_FOUND",
        message: "Schedule not found."
      }
    });
  });
});
