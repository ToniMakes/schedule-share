/* global console, fetch, process */

import { loadRootEnv } from "./load-env.mjs";
import { runCommand } from "./run-command.mjs";

loadRootEnv();

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;
const publicPages = [
  {
    expectedText: "隐私与数据保留说明",
    path: "/privacy"
  },
  {
    expectedText: "反馈与删除请求",
    path: "/feedback"
  }
];

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  fail("DATABASE_URL is required before running deployment verification.");
}

await main();

async function main() {
  log(`Verifying deployment target ${baseUrl}`);
  log("This will run one API smoke test and create one archived smoke-test schedule.");

  await run("corepack", ["pnpm", "db:check"]);
  await checkHealth();
  await checkPublicPages();
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

async function checkPublicPages() {
  for (const page of publicPages) {
    await checkPublicPage(page);
  }
}

async function checkPublicPage(page) {
  log(`Checking ${page.path}`);

  const response = await fetch(new URL(page.path, baseUrl));
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`${page.path} expected 200, got ${response.status}.`);
  }

  if (!body.includes(page.expectedText)) {
    throw new Error(`${page.path} did not include expected text: ${page.expectedText}`);
  }

  log(`${page.path} check passed.`);
}

function run(rawCommand, args, options = {}) {
  return runCommand(rawCommand, args, options);
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
