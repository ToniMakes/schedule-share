import { createDatabase } from "@schedule-share/db";

import { HttpError } from "./errors";

type Database = ReturnType<typeof createDatabase>;

let cachedDatabase: Database | undefined;

export function getDatabase(): Database {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new HttpError(503, "DATABASE_UNAVAILABLE", "Database is not configured.");
  }

  cachedDatabase ??= createDatabase(databaseUrl);
  return cachedDatabase;
}
