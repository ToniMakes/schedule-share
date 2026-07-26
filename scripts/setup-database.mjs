import { runCommand } from "./run-command.mjs";

const args = new Set(process.argv.slice(2));
const allowedArgs = new Set(["--dry-run", "--help"]);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

if (unknownArgs.length > 0) {
  fail(`Unknown option: ${unknownArgs.join(", ")}`);
}

const steps = [
  {
    args: ["pnpm", "env:status"],
    command: "corepack",
    label: "Check environment configuration"
  },
  {
    args: ["pnpm", "db:migrate"],
    command: "corepack",
    label: "Run database migrations"
  },
  {
    args: ["pnpm", "db:check"],
    command: "corepack",
    label: "Verify database schema"
  }
];

if (args.has("--dry-run")) {
  log("Would run:");

  for (const step of steps) {
    log(`- ${step.command} ${step.args.join(" ")}`);
  }

  process.exit(0);
}

try {
  for (const step of steps) {
    log(step.label);
    await run(step.command, step.args);
  }

  log("Database setup passed.");
} catch (error) {
  fail(error instanceof Error ? error.message : "Database setup failed.");
}

function run(rawCommand, args) {
  return runCommand(rawCommand, args);
}

function printHelp() {
  console.log(`Usage: corepack pnpm db:setup [--dry-run]

Runs env:status, db:migrate, then db:check.
Use this after DATABASE_URL points to the target Postgres database.`);
}

function log(message) {
  console.log(`[db:setup] ${message}`);
}

function fail(message) {
  console.error(`[db:setup] ${message}`);
  process.exit(1);
}
