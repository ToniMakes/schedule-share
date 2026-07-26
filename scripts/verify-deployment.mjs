/* global console, fetch, process */

import { spawn } from "node:child_process";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  fail("DATABASE_URL is required before running deployment verification.");
}

await main();

async function main() {
  log(`Verifying deployment target ${baseUrl}`);
  log("This will run one API smoke test and create one archived smoke-test schedule.");

  await run("corepack", ["pnpm", "db:check"]);
  await checkHealth();
  await run("corepack", ["pnpm", "smoke:api"], {
    env: {
      ...process.env,
      SMOKE_BASE_URL: baseUrl
    }
  });

  log("Deployment verification passed.");
}

async function checkHealth() {
  log("Checking /api/health");

  const response = await fetch(new URL("/api/health", baseUrl));
  const payload = await readJson(response);

  if (response.status !== 200) {
    throw new Error(`/api/health expected 200, got ${response.status}: ${JSON.stringify(payload)}`);
  }

  if (
    !isRecord(payload) ||
    payload.status !== "healthy" ||
    !isRecord(payload.checks) ||
    payload.checks.database !== "ok"
  ) {
    throw new Error(`/api/health returned an unexpected payload: ${JSON.stringify(payload)}`);
  }

  log("Health check passed.");
}

function run(rawCommand, args, options = {}) {
  const command =
    process.platform === "win32" && rawCommand === "corepack" ? "corepack.cmd" : rawCommand;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      shell: false,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${rawCommand} ${args.join(" ")} exited with signal ${signal}.`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${rawCommand} ${args.join(" ")} exited with code ${code}.`));
        return;
      }

      resolve();
    });
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function log(message) {
  console.log(`[verify:deployment] ${message}`);
}

function fail(message) {
  console.error(`[verify:deployment] ${message}`);
  process.exit(1);
}
