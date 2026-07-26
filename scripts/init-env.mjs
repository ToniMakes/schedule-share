/* global console, process */

import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = resolve(repoRoot, ".env.example");
const localPath = resolve(repoRoot, ".env.local");
const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

const allowedArgs = new Set(["--dry-run"]);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));

if (unknownArgs.length > 0) {
  fail(`Unknown option: ${unknownArgs.join(", ")}`);
}

if (!existsSync(examplePath)) {
  fail(".env.example is missing.");
}

if (existsSync(localPath)) {
  fail(".env.local already exists. Leaving it untouched.");
}

if (args.has("--dry-run")) {
  log("Would create .env.local from .env.example.");
  process.exit(0);
}

copyFileSync(examplePath, localPath);
log("Created .env.local from .env.example.");
log("Edit DATABASE_URL before running database migrations against a hosted Postgres.");

function printHelp() {
  console.log(`Usage: corepack pnpm env:init [--dry-run]

Creates .env.local from .env.example when .env.local does not already exist.
The command refuses to overwrite an existing local env file.`);
}

function log(message) {
  console.log(`[env:init] ${message}`);
}

function fail(message) {
  console.error(`[env:init] ${message}`);
  process.exit(1);
}
