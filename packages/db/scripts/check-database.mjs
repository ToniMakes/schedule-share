/* global console, process */

import postgres from "postgres";

const requiredExtensions = ["pgcrypto"];
const requiredTables = ["availability_slots", "participants", "schedules"];
const requiredTypes = ["schedule_status"];

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

  log("Database check passed.");
} catch (error) {
  console.error(`[db:check] ${error instanceof Error ? error.message : "Database check failed."}`);
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

function log(message) {
  console.log(`[db:check] ${message}`);
}

function fail(message) {
  console.error(`[db:check] ${message}`);
  process.exit(1);
}
