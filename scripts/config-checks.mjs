const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);
const defaultDatabaseUrl = "postgres://schedule_share:schedule_share@localhost:5432/schedule_share";
const defaultSmokeBaseUrl = "http://127.0.0.1:3000";
const imageImportReleaseModes = new Set(["off", "local_only", "internal_test", "public"]);
const publicImageImportReleaseSupported = false;

export function checkDatabaseUrl(rawValue, options = {}) {
  const requireHosted = options.requireHosted ?? false;
  const name = options.name ?? "DATABASE_URL";
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return {
      detail:
        options.missingDetail ??
        (requireHosted
          ? `${name} is required and must point to the target hosted Postgres database.`
          : `${name} is missing. Run corepack pnpm env:init, then fill .env.local.`),
      level: requireHosted ? "error" : "warn",
      name,
      status: "missing"
    };
  }

  const parsed = parseUrl(value);

  if (parsed === undefined || !["postgres:", "postgresql:"].includes(parsed.protocol)) {
    return {
      detail: `${name} must be a postgres:// or postgresql:// connection string.`,
      level: requireHosted ? "error" : "warn",
      name,
      status: "invalid",
      value: redactUrl(value)
    };
  }

  const isDefault = value === defaultDatabaseUrl;
  const isLocal = isLocalHostname(parsed.hostname);

  if (isDefault || isLocal) {
    return {
      detail: describeLocalDatabase({ isDefault, name, requireHosted }),
      level: requireHosted ? "error" : "warn",
      name,
      status: isDefault ? "default-local" : "local",
      value: redactUrl(value)
    };
  }

  return {
    detail: requireHosted
      ? "Looks like a hosted Postgres connection string."
      : "Looks like a hosted Postgres connection string. Run db:check before migration.",
    level: "ok",
    name,
    status: "hosted",
    value: redactUrl(value)
  };
}

export function checkMigrationDatabaseUrl(rawValue, fallbackRawValue, options = {}) {
  const requireHosted = options.requireHosted ?? false;
  const value = rawValue?.trim() ?? "";
  const fallbackValue = fallbackRawValue?.trim() ?? "";

  if (value.length === 0) {
    const fallback = parseUrl(fallbackValue);
    const fallbackIsPooled = fallback !== undefined && isPooledPostgresHostname(fallback.hostname);

    return {
      detail: fallbackIsPooled
        ? "DATABASE_URL looks like a pooled Neon endpoint. Set DATABASE_MIGRATION_URL to the direct endpoint before running migrations."
        : "Optional. db:migrate uses DATABASE_URL when DATABASE_MIGRATION_URL is missing.",
      level: fallbackIsPooled ? "warn" : "ok",
      name: "DATABASE_MIGRATION_URL",
      status: fallbackIsPooled ? "missing-for-pooled-runtime" : "fallback"
    };
  }

  const check = checkDatabaseUrl(value, {
    missingDetail:
      "DATABASE_MIGRATION_URL is optional. Set it only when migrations need a direct database connection.",
    name: "DATABASE_MIGRATION_URL",
    requireHosted
  });

  const parsed = parseUrl(value);

  if (check.level === "ok" && parsed !== undefined && isPooledPostgresHostname(parsed.hostname)) {
    return {
      ...check,
      detail:
        "Use a direct Neon endpoint for migrations. Pooled endpoints can break session-sensitive migration behavior.",
      level: "warn",
      status: "pooled"
    };
  }

  return check;
}

export function checkSmokeBaseUrl(rawValue, options = {}) {
  const requireRemote = options.requireRemote ?? false;
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return {
      detail: requireRemote
        ? "SMOKE_BASE_URL is required and must point to the deployed site URL."
        : "SMOKE_BASE_URL is optional. smoke:api will default to http://localhost:3000.",
      level: requireRemote ? "error" : "ok",
      name: "SMOKE_BASE_URL",
      status: requireRemote ? "missing" : "default-runtime"
    };
  }

  const parsed = parseUrl(value);

  if (parsed === undefined || !["http:", "https:"].includes(parsed.protocol)) {
    return {
      detail: "SMOKE_BASE_URL must be an http:// or https:// URL.",
      level: requireRemote ? "error" : "warn",
      name: "SMOKE_BASE_URL",
      status: "invalid",
      value
    };
  }

  const isDefault = value === defaultSmokeBaseUrl;
  const isLocal = isDefault || isLocalHostname(parsed.hostname);

  if (requireRemote && isLocal) {
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
    detail: isLocal ? "Targets the local dev server." : "Targets a remote site.",
    level: "ok",
    name: "SMOKE_BASE_URL",
    status: isLocal ? "local" : "remote",
    value
  };
}

export function checkAppBaseUrl(rawValue, options = {}) {
  const requireRemote = options.requireRemote ?? false;
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return {
      detail:
        "APP_BASE_URL is optional. Generated links will use the incoming request host when it is missing.",
      level: "ok",
      name: "APP_BASE_URL",
      status: "request-host"
    };
  }

  const parsed = parseUrl(value);

  if (parsed === undefined || !["http:", "https:"].includes(parsed.protocol)) {
    return {
      detail: "APP_BASE_URL must be an http:// or https:// URL.",
      level: requireRemote ? "error" : "warn",
      name: "APP_BASE_URL",
      status: "invalid",
      value
    };
  }

  const isLocal = isLocalHostname(parsed.hostname);

  if (requireRemote && isLocal) {
    return {
      detail: "APP_BASE_URL points to a local server. Use the deployed site URL in production.",
      level: "error",
      name: "APP_BASE_URL",
      status: "local",
      value: parsed.origin
    };
  }

  return {
    detail: isLocal
      ? "Generated links will use a local app URL."
      : "Generated links will use the configured remote app URL.",
    level: "ok",
    name: "APP_BASE_URL",
    status: isLocal ? "local" : "remote",
    value: parsed.origin
  };
}

export function checkImageImportConfig(environment = {}, options = {}) {
  const requireProductionSafe = options.requireProductionSafe ?? false;
  const apiKey = environment.OPENAI_API_KEY?.trim() ?? "";
  const enabled = parseBooleanFlag(environment.AI_IMAGE_IMPORT_ENABLED);
  const releaseMode = environment.AI_IMAGE_IMPORT_RELEASE_MODE?.trim() || "off";
  const internalTestToken = environment.AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN?.trim() ?? "";
  const adGateReady = parseBooleanFlag(environment.AI_IMAGE_AD_GATE_READY);
  const creditsEnforced = parseBooleanFlag(environment.AI_IMAGE_CREDITS_ENFORCED);
  const costGuardrailEnabled = parseBooleanFlag(environment.AI_IMAGE_COST_GUARDRAIL_ENABLED);

  if (!imageImportReleaseModes.has(releaseMode)) {
    return {
      detail:
        "AI_IMAGE_IMPORT_RELEASE_MODE must be one of off, local_only, internal_test, or public.",
      level: requireProductionSafe ? "error" : "warn",
      name: "AI_IMAGE_IMPORT",
      status: "invalid-release-mode"
    };
  }

  if (!enabled) {
    return {
      detail:
        apiKey.length === 0
          ? "Image import is closed. OPENAI_API_KEY is not set."
          : "Image import is closed even though OPENAI_API_KEY is set. This is safe for production.",
      level: "ok",
      name: "AI_IMAGE_IMPORT",
      status: "disabled"
    };
  }

  if (apiKey.length === 0) {
    return {
      detail: "AI_IMAGE_IMPORT_ENABLED is true, but OPENAI_API_KEY is missing.",
      level: requireProductionSafe ? "error" : "warn",
      name: "AI_IMAGE_IMPORT",
      status: "missing-openai-key"
    };
  }

  if (releaseMode === "off") {
    return {
      detail:
        "AI_IMAGE_IMPORT_ENABLED is true, but AI_IMAGE_IMPORT_RELEASE_MODE is off. No public calls will be made.",
      level: "ok",
      name: "AI_IMAGE_IMPORT",
      status: "enabled-but-off"
    };
  }

  if (releaseMode === "local_only") {
    return {
      detail:
        "Image import is enabled for local development only. Production and Vercel Preview requests remain blocked.",
      level: requireProductionSafe ? "warn" : "ok",
      name: "AI_IMAGE_IMPORT",
      status: "local-only"
    };
  }

  if (releaseMode === "internal_test" && internalTestToken.length === 0) {
    return {
      detail: "Internal image import testing requires AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN.",
      level: requireProductionSafe ? "error" : "warn",
      name: "AI_IMAGE_IMPORT",
      status: "missing-internal-test-token"
    };
  }

  if (releaseMode === "internal_test") {
    return {
      detail:
        "Image import is enabled only for requests with the matching x-ai-image-import-test-token header.",
      level: "ok",
      name: "AI_IMAGE_IMPORT",
      status: "internal-test"
    };
  }

  if (!publicImageImportReleaseSupported) {
    return {
      detail:
        "Public image import is blocked in this codebase until the credit ledger, rewarded ad verification, and hard cost guardrails are implemented.",
      level: "error",
      name: "AI_IMAGE_IMPORT",
      status: "public-not-supported"
    };
  }

  if (!adGateReady || !creditsEnforced || !costGuardrailEnabled) {
    return {
      detail:
        "Public image import requires AI_IMAGE_AD_GATE_READY, AI_IMAGE_CREDITS_ENFORCED, and AI_IMAGE_COST_GUARDRAIL_ENABLED.",
      level: "error",
      name: "AI_IMAGE_IMPORT",
      status: "public-guardrails-missing"
    };
  }

  return {
    detail: "Public image import guardrails are marked ready.",
    level: "ok",
    name: "AI_IMAGE_IMPORT",
    status: "public-ready"
  };
}

export function hasCheckLevel(checks, level) {
  return checks.some((check) => check.level === level);
}

export function redactUrl(value) {
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

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function describeLocalDatabase({ isDefault, name, requireHosted }) {
  if (requireHosted) {
    return isDefault
      ? "Still using the local Docker default. Replace it with a hosted Postgres connection string before deployment verification."
      : `${name} points to a local host. Use a hosted Postgres database for deployment verification.`;
  }

  return isDefault
    ? "Using the local Docker default. Replace it before checking a hosted Postgres."
    : "Using a localhost database. This is fine for local Docker, not for hosted deployment.";
}

function isLocalHostname(hostname) {
  return localHosts.has(hostname.toLowerCase());
}

function isPooledPostgresHostname(hostname) {
  return hostname.toLowerCase().includes("-pooler.");
}

function parseBooleanFlag(value) {
  return value?.trim().toLowerCase() === "true";
}
