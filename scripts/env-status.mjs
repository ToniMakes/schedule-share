/* global console, process */

import { loadRootEnv } from "./load-env.mjs";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const defaultDatabaseUrl = "postgres://schedule_share:schedule_share@localhost:5432/schedule_share";
const defaultSmokeBaseUrl = "http://127.0.0.1:3000";

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

if (checks.some((check) => check.level === "warn")) {
  process.exitCode = 1;
}

function checkDatabaseUrl(rawValue) {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return {
      detail: "DATABASE_URL is missing. Run corepack pnpm env:init, then fill .env.local.",
      level: "warn",
      name: "DATABASE_URL",
      status: "missing"
    };
  }

  const parsed = parseUrl(rawValue);

  if (parsed === undefined || !["postgres:", "postgresql:"].includes(parsed.protocol)) {
    return {
      detail: "DATABASE_URL must be a postgres:// or postgresql:// connection string.",
      level: "warn",
      name: "DATABASE_URL",
      status: "invalid",
      value: redactUrl(rawValue)
    };
  }

  const isDefault = rawValue === defaultDatabaseUrl;
  const isLocal = localHosts.has(parsed.hostname);

  if (isDefault || isLocal) {
    return {
      detail: isDefault
        ? "Using the local Docker default. Replace it before checking a hosted Postgres."
        : "Using a localhost database. This is fine for local Docker, not for hosted deployment.",
      level: "warn",
      name: "DATABASE_URL",
      status: isDefault ? "default-local" : "local",
      value: redactUrl(rawValue)
    };
  }

  return {
    detail: "Looks like a hosted Postgres connection string. Run db:check before migration.",
    level: "ok",
    name: "DATABASE_URL",
    status: "hosted",
    value: redactUrl(rawValue)
  };
}

function checkSmokeBaseUrl(rawValue) {
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return {
      detail: "SMOKE_BASE_URL is optional. smoke:api will default to http://localhost:3000.",
      level: "ok",
      name: "SMOKE_BASE_URL",
      status: "default-runtime"
    };
  }

  const parsed = parseUrl(value);

  if (parsed === undefined || !["http:", "https:"].includes(parsed.protocol)) {
    return {
      detail: "SMOKE_BASE_URL must be an http:// or https:// URL.",
      level: "warn",
      name: "SMOKE_BASE_URL",
      status: "invalid",
      value
    };
  }

  const isDefault = value === defaultSmokeBaseUrl;
  const isLocal = localHosts.has(parsed.hostname);

  return {
    detail: isDefault || isLocal ? "Targets the local dev server." : "Targets a remote site.",
    level: "ok",
    name: "SMOKE_BASE_URL",
    status: isDefault || isLocal ? "local" : "remote",
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
  console.log(`[env:status] ${message}`);
}
