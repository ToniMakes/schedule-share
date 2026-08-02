const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);
const defaultDatabaseUrl = "postgres://schedule_share:schedule_share@localhost:5432/schedule_share";
const defaultSmokeBaseUrl = "http://127.0.0.1:3000";
const displayAdKeyedUrlModes = new Set(["off", "internal", "full"]);
const displayAdProviders = new Set(["placeholder", "adsense"]);
const imageImportReleaseModes = new Set(["off", "local_only", "internal_test", "public"]);
const imageImportCostPolicyDefaults = {
  dailyCostLimitUsd: 0.25,
  dailyRequestLimit: 20,
  estimatedCostPerRequestUsd: 0.01,
  maxEstimatedCostPerRequestUsd: 0.02
};
const imageImportCostPolicyLimits = {
  dailyCostLimitUsd: { maxValue: 10, minValue: 0.01 },
  dailyRequestLimit: { maxValue: 500, minValue: 1 },
  estimatedCostPerRequestUsd: { maxValue: 0.1, minValue: 0.0001 },
  maxEstimatedCostPerRequestUsd: { maxValue: 0.1, minValue: 0.0001 }
};
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

  const costPolicyCheck = checkImageImportCostPolicy(environment, { requireProductionSafe });

  if (costPolicyCheck !== undefined) {
    return costPolicyCheck;
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

export function checkDisplayAdsConfig(environment = {}, options = {}) {
  const requireProductionSafe = options.requireProductionSafe ?? false;
  const enabled = parseBooleanFlag(environment.NEXT_PUBLIC_DISPLAY_ADS_ENABLED);
  const preview = parseBooleanFlag(environment.NEXT_PUBLIC_DISPLAY_ADS_PREVIEW);
  const provider =
    normalizeOptionalString(environment.NEXT_PUBLIC_DISPLAY_ADS_PROVIDER) || "placeholder";
  const clientId = normalizeOptionalString(environment.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
  const keyedUrlMode =
    normalizeOptionalString(environment.NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE) || "internal";
  const allowedHosts = parseCsv(environment.NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS);
  const adsTxtPublisherId = normalizeOptionalString(environment.ADS_TXT_PUBLISHER_ID);
  const consentStrategyReady = parseBooleanFlag(environment.ADS_CONSENT_STRATEGY_READY);
  const policyReviewReady = parseBooleanFlag(environment.ADS_POLICY_REVIEW_READY);
  const privacyDisclosureReady = parseBooleanFlag(environment.ADS_PRIVACY_DISCLOSURE_READY);
  const supportEmail = normalizeDisplayString(environment.NEXT_PUBLIC_SUPPORT_EMAIL);
  const testMode = parseBooleanFlag(environment.NEXT_PUBLIC_DISPLAY_ADS_TEST_MODE);
  const configuredSlotIds = [
    environment.NEXT_PUBLIC_ADSENSE_SLOT_TOP_BANNER,
    environment.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM_BANNER,
    environment.NEXT_PUBLIC_ADSENSE_SLOT_INLINE_RESULTS,
    environment.NEXT_PUBLIC_ADSENSE_SLOT_POST_SUBMIT,
    environment.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_RAIL,
    environment.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_ANCHOR
  ].filter((value) => normalizeOptionalString(value).length > 0);

  if (!displayAdProviders.has(provider)) {
    return {
      detail: "NEXT_PUBLIC_DISPLAY_ADS_PROVIDER must be placeholder or adsense.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "invalid-provider"
    };
  }

  if (!displayAdKeyedUrlModes.has(keyedUrlMode)) {
    return {
      detail: "NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE must be off, internal, or full.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "invalid-keyed-url-mode"
    };
  }

  if (!enabled && !preview) {
    return {
      detail: "Display ads are closed by default.",
      level: "ok",
      name: "DISPLAY_ADS",
      status: "disabled"
    };
  }

  if (provider === "placeholder") {
    return {
      detail:
        "Only first-party placeholder or sponsor slots can render. No third-party ad script is loaded.",
      level: "ok",
      name: "DISPLAY_ADS",
      status: preview ? "placeholder-preview" : "placeholder"
    };
  }

  if (keyedUrlMode === "full") {
    return {
      detail:
        "Do not load third-party ads on keyed owner/edit URLs until those keys are no longer exposed in the URL.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "unsafe-keyed-url-mode"
    };
  }

  if (requireProductionSafe && testMode) {
    return {
      detail:
        "NEXT_PUBLIC_DISPLAY_ADS_TEST_MODE must be false before real production AdSense traffic.",
      level: "error",
      name: "DISPLAY_ADS",
      status: "adsense-test-mode-production"
    };
  }

  if (supportEmail.length === 0) {
    return {
      detail:
        "Real display ads require NEXT_PUBLIC_SUPPORT_EMAIL for public feedback and deletion requests.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "missing-support-email"
    };
  }

  if (!isValidEmailAddress(supportEmail)) {
    return {
      detail: "NEXT_PUBLIC_SUPPORT_EMAIL must be a valid public support email address.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "invalid-support-email"
    };
  }

  if (requireProductionSafe && !privacyDisclosureReady) {
    return {
      detail:
        "Set ADS_PRIVACY_DISCLOSURE_READY=true only after the public privacy page names the actual ad providers, cookie/ad request data, opt-out path, and AI processing boundary.",
      level: "error",
      name: "DISPLAY_ADS",
      status: "privacy-disclosure-not-ready"
    };
  }

  if (requireProductionSafe && !policyReviewReady) {
    return {
      detail:
        "Set ADS_POLICY_REVIEW_READY=true only after reviewing the ad platform policies, invalid traffic rules, placement rules, and production test plan.",
      level: "error",
      name: "DISPLAY_ADS",
      status: "policy-review-not-ready"
    };
  }

  if (requireProductionSafe && !consentStrategyReady) {
    return {
      detail:
        "Set ADS_CONSENT_STRATEGY_READY=true only after deciding the cookie/consent flow for target regions, including opt-out or consent messaging when required.",
      level: "error",
      name: "DISPLAY_ADS",
      status: "consent-strategy-not-ready"
    };
  }

  if (requireProductionSafe && adsTxtPublisherId.length === 0) {
    return {
      detail:
        "Real AdSense traffic requires ADS_TXT_PUBLISHER_ID so /ads.txt returns an authorized seller record.",
      level: "error",
      name: "DISPLAY_ADS",
      status: "missing-ads-txt-publisher-id"
    };
  }

  if (clientId.length === 0) {
    return {
      detail: "AdSense provider is enabled, but NEXT_PUBLIC_ADSENSE_CLIENT_ID is missing.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "missing-adsense-client"
    };
  }

  if (configuredSlotIds.length === 0) {
    return {
      detail: "AdSense provider is enabled, but no NEXT_PUBLIC_ADSENSE_SLOT_* value is set.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "missing-adsense-slot"
    };
  }

  if (allowedHosts.length === 0 && !testMode) {
    return {
      detail:
        "AdSense provider is enabled without test mode, but NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS is empty.",
      level: requireProductionSafe ? "error" : "warn",
      name: "DISPLAY_ADS",
      status: "missing-allowed-hosts"
    };
  }

  return {
    detail: testMode
      ? "AdSense is configured in test mode. Keep this out of public production traffic."
      : "AdSense can load only on the configured allowed hosts; keyed URLs stay protected unless explicitly overridden.",
    level: testMode && requireProductionSafe ? "warn" : "ok",
    name: "DISPLAY_ADS",
    status: testMode ? "adsense-test-mode" : "adsense-ready"
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

function checkImageImportCostPolicy(environment, options = {}) {
  const requireProductionSafe = options.requireProductionSafe ?? false;
  const level = requireProductionSafe ? "error" : "warn";
  const dailyCostLimitUsd = parseNumericConfig(environment.AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD, {
    defaultValue: imageImportCostPolicyDefaults.dailyCostLimitUsd,
    integer: false,
    name: "AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD",
    status: "invalid-daily-cost-limit",
    ...imageImportCostPolicyLimits.dailyCostLimitUsd
  });
  const dailyRequestLimit = parseNumericConfig(environment.AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT, {
    defaultValue: imageImportCostPolicyDefaults.dailyRequestLimit,
    integer: true,
    name: "AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT",
    status: "invalid-daily-request-limit",
    ...imageImportCostPolicyLimits.dailyRequestLimit
  });
  const estimatedCostPerRequestUsd = parseNumericConfig(
    environment.AI_IMAGE_IMPORT_ESTIMATED_COST_USD,
    {
      defaultValue: imageImportCostPolicyDefaults.estimatedCostPerRequestUsd,
      integer: false,
      name: "AI_IMAGE_IMPORT_ESTIMATED_COST_USD",
      status: "invalid-estimated-cost",
      ...imageImportCostPolicyLimits.estimatedCostPerRequestUsd
    }
  );
  const maxEstimatedCostPerRequestUsd = parseNumericConfig(
    environment.AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD,
    {
      defaultValue: imageImportCostPolicyDefaults.maxEstimatedCostPerRequestUsd,
      integer: false,
      name: "AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD",
      status: "invalid-max-estimated-cost",
      ...imageImportCostPolicyLimits.maxEstimatedCostPerRequestUsd
    }
  );

  for (const parsed of [
    dailyCostLimitUsd,
    dailyRequestLimit,
    estimatedCostPerRequestUsd,
    maxEstimatedCostPerRequestUsd
  ]) {
    if (parsed.error !== undefined) {
      return {
        detail: parsed.error,
        level,
        name: "AI_IMAGE_IMPORT",
        status: parsed.status
      };
    }
  }

  if (estimatedCostPerRequestUsd.value > maxEstimatedCostPerRequestUsd.value) {
    return {
      detail: "AI_IMAGE_IMPORT_ESTIMATED_COST_USD exceeds AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD.",
      level,
      name: "AI_IMAGE_IMPORT",
      status: "estimated-cost-too-high"
    };
  }

  if (estimatedCostPerRequestUsd.value > dailyCostLimitUsd.value) {
    return {
      detail: "A single image import estimate exceeds AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD.",
      level,
      name: "AI_IMAGE_IMPORT",
      status: "request-cost-exceeds-daily-budget"
    };
  }

  if (estimatedCostPerRequestUsd.value * dailyRequestLimit.value > dailyCostLimitUsd.value) {
    return {
      detail:
        "AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT multiplied by AI_IMAGE_IMPORT_ESTIMATED_COST_USD can exceed AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD.",
      level,
      name: "AI_IMAGE_IMPORT",
      status: "daily-budget-too-low"
    };
  }

  return undefined;
}

function parseNumericConfig(value, options) {
  const rawValue = value?.trim() ?? "";

  if (rawValue.length === 0) {
    return { value: options.defaultValue };
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || (options.integer && !Number.isInteger(parsed))) {
    return {
      error: `${options.name} must be ${options.integer ? "an integer" : "a number"}.`,
      status: options.status
    };
  }

  if (parsed < options.minValue || parsed > options.maxValue) {
    return {
      error: `${options.name} must be between ${options.minValue} and ${options.maxValue}.`,
      status: options.status
    };
  }

  return { value: parsed };
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

function normalizeOptionalString(value) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeDisplayString(value) {
  return value?.trim() ?? "";
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseCsv(value) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}
