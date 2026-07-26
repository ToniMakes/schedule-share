import { sql } from "drizzle-orm";

import type { HealthStatusResponse } from "@schedule-share/api-client";

import { getDatabase } from "./db";

export interface HealthDatabase {
  execute(query: unknown): Promise<unknown>;
}

export async function checkHealth(
  dependencies: {
    readonly database?: HealthDatabase;
    readonly getDatabase?: () => HealthDatabase;
  } = {}
): Promise<HealthStatusResponse> {
  try {
    const database = dependencies.database ?? (dependencies.getDatabase ?? getDatabase)();

    await database.execute(sql`select 1`);

    return {
      status: "healthy",
      checks: {
        database: "ok"
      }
    };
  } catch {
    return {
      status: "unhealthy",
      checks: {
        database: "unavailable"
      }
    };
  }
}
