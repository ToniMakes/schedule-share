import { describe, expect, it } from "vitest";

import { HttpError } from "./errors";
import { checkHealth } from "./health";

describe("checkHealth", () => {
  it("returns healthy when the database answers", async () => {
    const health = await checkHealth({
      database: {
        execute: async () => undefined
      }
    });

    expect(health).toEqual({
      status: "healthy",
      checks: {
        database: "ok"
      }
    });
  });

  it("returns unhealthy when the database is not configured", async () => {
    const health = await checkHealth({
      getDatabase: () => {
        throw new HttpError(503, "DATABASE_UNAVAILABLE", "Database is not configured.");
      }
    });

    expect(health).toEqual({
      status: "unhealthy",
      checks: {
        database: "unavailable"
      }
    });
  });

  it("returns unhealthy when the database query fails", async () => {
    const health = await checkHealth({
      database: {
        execute: async () => {
          throw new Error("connection refused");
        }
      }
    });

    expect(health).toEqual({
      status: "unhealthy",
      checks: {
        database: "unavailable"
      }
    });
  });
});
