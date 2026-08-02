/* global console, process */

import postgres from "postgres";

import { loadRootEnv } from "../../../scripts/load-env.mjs";

loadRootEnv();

const requiredExtensions = ["pgcrypto"];
const requiredTables = [
  "availability_slots",
  "candidate_time_options",
  "candidate_votes",
  "participants",
  "schedules"
];
const requiredTypes = ["candidate_vote_response", "schedule_mode", "schedule_status"];
const requiredColumnsByTable = {
  candidate_votes: ["preference_rank"],
  schedules: ["final_start_utc", "final_end_utc"]
};

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  fail("DATABASE_URL is required.");
}

const sql = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
  prepare: false
});

let exitCode = 0;

try {
  const [connection] = await sql`
    select
      current_database() as database_name,
      current_schema() as schema_name
  `;

  log(`Connected to ${connection.database_name} using schema ${connection.schema_name}.`);

  await assertPresent(
    "extension",
    requiredExtensions,
    await readNames(sql`
      select extname as name
      from pg_extension
    `)
  );
  await assertPresent(
    "type",
    requiredTypes,
    await readNames(sql`
      select typname as name
      from pg_type
      where typnamespace = 'public'::regnamespace
    `)
  );
  await assertPresent(
    "table",
    requiredTables,
    await readNames(sql`
      select table_name as name
      from information_schema.tables
      where table_schema = 'public'
    `)
  );
  for (const [tableName, requiredColumns] of Object.entries(requiredColumnsByTable)) {
    await assertColumnsPresent(
      tableName,
      requiredColumns,
      await readNames(sql`
        select column_name as name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = ${tableName}
      `)
    );
  }

  log("Database check passed.");
} catch (error) {
  console.error(`[db:check] ${describeError(error)}`);
  exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

process.exit(exitCode);

async function readNames(queryPromise) {
  const rows = await queryPromise;
  return new Set(rows.map((row) => row.name));
}

async function assertPresent(kind, requiredNames, actualNames) {
  const missing = requiredNames.filter((name) => !actualNames.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Missing ${kind}${missing.length === 1 ? "" : "s"}: ${missing.join(
        ", "
      )}. Run migrations before starting the app.`
    );
  }

  log(`Found ${kind}${requiredNames.length === 1 ? "" : "s"}: ${requiredNames.join(", ")}.`);
}

async function assertColumnsPresent(tableName, requiredColumns, actualColumns) {
  const missing = requiredColumns.filter((columnName) => !actualColumns.has(columnName));

  if (missing.length > 0) {
    throw new Error(
      `Missing column${missing.length === 1 ? "" : "s"} on ${tableName}: ${missing.join(
        ", "
      )}. Run migrations before starting the app.`
    );
  }

  log(
    `Found column${requiredColumns.length === 1 ? "" : "s"} on ${tableName}: ${requiredColumns.join(", ")}.`
  );
}

function log(message) {
  console.log(`[db:check] ${message}`);
}

function describeError(error) {
  if (!(error instanceof Error)) {
    return "Database check failed.";
  }

  const details = [];
  const message = error.message.trim();
  const code = readStringProperty(error, "code");
  const nestedErrors = Array.isArray(error.errors)
    ? error.errors.map(describeNestedError).filter((nestedError) => nestedError.length > 0)
    : [];

  if (message.length > 0) {
    details.push(message);
  }

  if (code !== undefined) {
    details.push(`code ${code}`);
  }

  if (nestedErrors.length > 0) {
    details.push(`causes: ${nestedErrors.join("; ")}`);
  }

  return details.length > 0 ? details.join(" ") : `${error.name} while checking database.`;
}

function describeNestedError(error) {
  if (!(error instanceof Error)) {
    return "";
  }

  const message = error.message.trim();
  const code = readStringProperty(error, "code");

  if (message.length > 0) {
    return message;
  }

  return code === undefined ? error.name : `${error.name} ${code}`;
}

function readStringProperty(value, key) {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }

  const property = value[key];
  return typeof property === "string" && property.length > 0 ? property : undefined;
}

function fail(message) {
  console.error(`[db:check] ${message}`);
  process.exit(1);
}
