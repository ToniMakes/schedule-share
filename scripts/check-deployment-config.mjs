/* global console, process */

import { loadRootEnv } from "./load-env.mjs";

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);
const defaultDatabaseUrl = "postgres://schedule_share:schedule_share@localhost:5432/schedule_share";

loadRootEnv();

const checks = [
  checkDatabaseUrl(process.env.DATABASE_URL),
  checkSmokeBaseUrl(process.env.SMOKE_BASE_URL)
];

for (const check of checks) {
  log(`${check.name}: ${check.status}`);
  log(`  ${check.detail}`);

  if (check.value !== undefined) {
    log(`  value: ${check.value}`);
  }
}

if (checks.some((check) => check.level === "error")) {
  fail("Deployment config is not ready.");
}

log("Deployment config looks ready.");

function checkDatabaseUrl(rawValue) {
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return {
      detail: "DATABASE_URL is required and must point to the target hosted Postgres database.",
      level: "error",
      name: "DATABASE_URL",
      status: "missing"
    };
  }

  const parsed = parseUrl(value);

  if (parsed === undefined || !["postgres:", "postgresql:"].includes(parsed.protocol)) {
    return {
      detail: "DATABASE_URL must be a postgres:// or postgresql:// connection string.",
      level: "error",
      name: "DATABASE_URL",
      status: "invalid",
      value: redactUrl(value)
    };
  }

  const isDefault = value === defaultDatabaseUrl;
  const isLocal = localHosts.has(parsed.hostname.toLowerCase());

  if (isDefault || isLocal) {
    return {
      detail: isDefault
        ? "Still using the local Docker default. Replace it with a hosted Postgres connection string before deployment verification."
        : "DATABASE_URL points to a local host. Use a hosted Postgres database for deployment verification.",
      level: "error",
      name: "DATABASE_URL",
      status: isDefault ? "default-local" : "local",
      value: redactUrl(value)
    };
  }

  return {
    detail: "Looks like a hosted Postgres connection string.",
    level: "ok",
    name: "DATABASE_URL",
    status: "hosted",
    value: redactUrl(value)
  };
}

function checkSmokeBaseUrl(rawValue) {
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return {
      detail: "SMOKE_BASE_URL is required and must point to the deployed site URL.",
      level: "error",
      name: "SMOKE_BASE_URL",
      status: "missing"
    };
  }

  const parsed = parseUrl(value);

  if (parsed === undefined || !["http:", "https:"].includes(parsed.protocol)) {
    return {
      detail: "SMOKE_BASE_URL must be an http:// or https:// URL.",
      level: "error",
      name: "SMOKE_BASE_URL",
      status: "invalid",
      value
    };
  }

  if (localHosts.has(parsed.hostname.toLowerCase())) {
    return {
      detail:
        "SMOKE_BASE_URL points to a local server. Use the deployed site URL for deployment verification.",
      level: "error",
      name: "SMOKE_BASE_URL",
      status: "local",
      value
    };
  }

  return {
    detail: "Looks like a remote deployment target.",
    level: "ok",
    name: "SMOKE_BASE_URL",
    status: "remote",
    value
  };
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function redactUrl(value) {
  const parsed = parseUrl(value);

  if (parsed === undefined) {
    return "<invalid-url>";
  }

  if (parsed.password.length > 0) {
    parsed.password = "***";
  }

  if (parsed.username.length > 0) {
    parsed.username = `${parsed.username.slice(0, 2)}***`;
  }

  return parsed.toString();
}

function log(message) {
  console.log(`[deployment:config] ${message}`);
}

function fail(message) {
  console.error(`[deployment:config] ${message}`);
  process.exit(1);
}
