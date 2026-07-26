import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

export interface DatabaseClientOptions {
  readonly maxConnections?: number;
  readonly prepare?: boolean;
}

export function createDatabase(databaseUrl: string, options: DatabaseClientOptions = {}) {
  if (databaseUrl.trim().length === 0) {
    throw new Error("DATABASE_URL is required to create a database client.");
  }

  const client = postgres(databaseUrl, {
    max: options.maxConnections ?? 1,
    prepare: options.prepare ?? false
  });

  return drizzle(client, { schema });
}
