import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkAppBaseUrl,
  checkDatabaseUrl,
  checkDisplayAdsConfig,
  checkImageImportConfig,
  checkMigrationDatabaseUrl,
  checkSmokeBaseUrl,
  hasCheckLevel,
  redactUrl
} from "./config-checks.mjs";

describe("redactUrl", () => {
  it("redacts postgres usernames and passwords", () => {
    assert.equal(
      redactUrl("postgres://schedule_share:schedule_share@localhost:5432/schedule_share"),
      "postgres://sc***:***@localhost:5432/schedule_share"
    );
  });

  it("handles invalid URLs without returning the raw value", () => {
    assert.equal(redactUrl("not a url"), "<invalid-url>");
  });
});

describe("checkDatabaseUrl", () => {
  it("warns when DATABASE_URL is missing during local status checks", () => {
    assert.deepEqual(checkDatabaseUrl(undefined), {
      detail: "DATABASE_URL is missing. Run corepack pnpm env:init, then fill .env.local.",
      level: "warn",
      name: "DATABASE_URL",
      status: "missing"
    });
  });

  it("errors when DATABASE_URL is missing during deployment preflight", () => {
    assert.equal(checkDatabaseUrl(undefined, { requireHosted: true }).level, "error");
  });

  it("marks the local default database as default-local", () => {
    const check = checkDatabaseUrl(
      "postgres://schedule_share:schedule_share@localhost:5432/schedule_share"
    );

    assert.equal(check.level, "warn");
    assert.equal(check.status, "default-local");
    assert.equal(check.value, "postgres://sc***:***@localhost:5432/schedule_share");
  });

  it("rejects local databases during deployment preflight", () => {
    const check = checkDatabaseUrl("postgres://user:pass@127.0.0.1:5432/app", {
      requireHosted: true
    });

    assert.equal(check.level, "error");
    assert.equal(check.status, "local");
  });

  it("accepts hosted postgres URLs", () => {
    const check = checkDatabaseUrl("postgresql://user:pass@db.example.com:5432/app", {
      requireHosted: true
    });

    assert.equal(check.level, "ok");
    assert.equal(check.status, "hosted");
    assert.equal(check.value, "postgresql://us***:***@db.example.com:5432/app");
  });
});

describe("checkMigrationDatabaseUrl", () => {
  it("falls back to DATABASE_URL when no migration URL is set", () => {
    const check = checkMigrationDatabaseUrl(
      undefined,
      "postgresql://user:pass@db.example.com:5432/app"
    );

    assert.equal(check.level, "ok");
    assert.equal(check.status, "fallback");
  });

  it("warns when DATABASE_URL is pooled and no migration URL is set", () => {
    const check = checkMigrationDatabaseUrl(
      undefined,
      "postgresql://user:pass@ep-test-pooler.ap-southeast-1.aws.neon.tech/app"
    );

    assert.equal(check.level, "warn");
    assert.equal(check.status, "missing-for-pooled-runtime");
  });

  it("accepts a direct migration URL", () => {
    const check = checkMigrationDatabaseUrl(
      "postgresql://user:pass@ep-test.ap-southeast-1.aws.neon.tech/app",
      "postgresql://user:pass@ep-test-pooler.ap-southeast-1.aws.neon.tech/app",
      { requireHosted: true }
    );

    assert.equal(check.level, "ok");
    assert.equal(check.status, "hosted");
    assert.equal(check.name, "DATABASE_MIGRATION_URL");
  });

  it("warns when the migration URL is pooled", () => {
    const check = checkMigrationDatabaseUrl(
      "postgresql://user:pass@ep-test-pooler.ap-southeast-1.aws.neon.tech/app",
      "postgresql://user:pass@ep-test-pooler.ap-southeast-1.aws.neon.tech/app",
      { requireHosted: true }
    );

    assert.equal(check.level, "warn");
    assert.equal(check.status, "pooled");
  });
});

describe("checkSmokeBaseUrl", () => {
  it("allows missing SMOKE_BASE_URL for local smoke tests", () => {
    const check = checkSmokeBaseUrl(undefined);

    assert.equal(check.level, "ok");
    assert.equal(check.status, "default-runtime");
  });

  it("requires SMOKE_BASE_URL during deployment preflight", () => {
    const check = checkSmokeBaseUrl(undefined, { requireRemote: true });

    assert.equal(check.level, "error");
    assert.equal(check.status, "missing");
  });

  it("allows local SMOKE_BASE_URL for local smoke tests", () => {
    const check = checkSmokeBaseUrl("http://127.0.0.1:3000");

    assert.equal(check.level, "ok");
    assert.equal(check.status, "local");
  });

  it("rejects local SMOKE_BASE_URL during deployment preflight", () => {
    const check = checkSmokeBaseUrl("http://localhost:3000", { requireRemote: true });

    assert.equal(check.level, "error");
    assert.equal(check.status, "local");
  });

  it("accepts remote deployment targets", () => {
    const check = checkSmokeBaseUrl("https://schedule-share.example", { requireRemote: true });

    assert.equal(check.level, "ok");
    assert.equal(check.status, "remote");
  });
});

describe("checkAppBaseUrl", () => {
  it("allows missing APP_BASE_URL", () => {
    const check = checkAppBaseUrl(undefined);

    assert.equal(check.level, "ok");
    assert.equal(check.status, "request-host");
  });

  it("warns for invalid APP_BASE_URL values during local status checks", () => {
    const check = checkAppBaseUrl("not a url");

    assert.equal(check.level, "warn");
    assert.equal(check.status, "invalid");
  });

  it("allows local APP_BASE_URL values for local development", () => {
    const check = checkAppBaseUrl("http://localhost:3000");

    assert.equal(check.level, "ok");
    assert.equal(check.status, "local");
    assert.equal(check.value, "http://localhost:3000");
  });

  it("rejects local APP_BASE_URL values during deployment preflight", () => {
    const check = checkAppBaseUrl("http://localhost:3000", { requireRemote: true });

    assert.equal(check.level, "error");
    assert.equal(check.status, "local");
  });

  it("accepts remote APP_BASE_URL values", () => {
    const check = checkAppBaseUrl("https://schedule-share.example", { requireRemote: true });

    assert.equal(check.level, "ok");
    assert.equal(check.status, "remote");
    assert.equal(check.value, "https://schedule-share.example");
  });
});

describe("checkImageImportConfig", () => {
  it("keeps image import safely disabled even when OPENAI_API_KEY is set", () => {
    const check = checkImageImportConfig({
      OPENAI_API_KEY: "sk-test"
    });

    assert.equal(check.level, "ok");
    assert.equal(check.status, "disabled");
  });

  it("warns when local-only mode is set for deployment preflight", () => {
    const check = checkImageImportConfig(
      {
        AI_IMAGE_IMPORT_ENABLED: "true",
        AI_IMAGE_IMPORT_RELEASE_MODE: "local_only",
        OPENAI_API_KEY: "sk-test"
      },
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "warn");
    assert.equal(check.status, "local-only");
  });

  it("requires an internal test token in internal test mode", () => {
    const check = checkImageImportConfig(
      {
        AI_IMAGE_IMPORT_ENABLED: "true",
        AI_IMAGE_IMPORT_RELEASE_MODE: "internal_test",
        OPENAI_API_KEY: "sk-test"
      },
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "missing-internal-test-token");
  });

  it("blocks public image import until the guarded implementation exists", () => {
    const check = checkImageImportConfig(
      {
        AI_IMAGE_AD_GATE_READY: "true",
        AI_IMAGE_COST_GUARDRAIL_ENABLED: "true",
        AI_IMAGE_CREDITS_ENFORCED: "true",
        AI_IMAGE_IMPORT_ENABLED: "true",
        AI_IMAGE_IMPORT_RELEASE_MODE: "public",
        OPENAI_API_KEY: "sk-test"
      },
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "public-not-supported");
  });
});

describe("checkDisplayAdsConfig", () => {
  function realAdsEnvironment(overrides = {}) {
    return {
      ADS_CONSENT_STRATEGY_READY: "true",
      ADS_POLICY_REVIEW_READY: "true",
      ADS_PRIVACY_DISCLOSURE_READY: "true",
      ADS_TXT_PUBLISHER_ID: "pub-123",
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-123",
      NEXT_PUBLIC_ADSENSE_SLOT_TOP_BANNER: "123456",
      NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS: "schedule.tonimakes.com",
      NEXT_PUBLIC_DISPLAY_ADS_ENABLED: "true",
      NEXT_PUBLIC_DISPLAY_ADS_PROVIDER: "adsense",
      NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.com",
      ...overrides
    };
  }

  it("keeps display ads disabled by default", () => {
    const check = checkDisplayAdsConfig({});

    assert.equal(check.level, "ok");
    assert.equal(check.status, "disabled");
  });

  it("requires a public support email before real AdSense deployment", () => {
    const check = checkDisplayAdsConfig(
      realAdsEnvironment({
        NEXT_PUBLIC_SUPPORT_EMAIL: ""
      }),
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "missing-support-email");
  });

  it("requires ad privacy disclosure attestation before real AdSense deployment", () => {
    const check = checkDisplayAdsConfig(
      realAdsEnvironment({
        ADS_PRIVACY_DISCLOSURE_READY: "false"
      }),
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "privacy-disclosure-not-ready");
  });

  it("requires ad policy review before real AdSense deployment", () => {
    const check = checkDisplayAdsConfig(
      realAdsEnvironment({
        ADS_POLICY_REVIEW_READY: "false"
      }),
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "policy-review-not-ready");
  });

  it("requires consent strategy review before real AdSense deployment", () => {
    const check = checkDisplayAdsConfig(
      realAdsEnvironment({
        ADS_CONSENT_STRATEGY_READY: "false"
      }),
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "consent-strategy-not-ready");
  });

  it("requires ads.txt publisher ID before real AdSense deployment", () => {
    const check = checkDisplayAdsConfig(
      realAdsEnvironment({
        ADS_TXT_PUBLISHER_ID: ""
      }),
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "missing-ads-txt-publisher-id");
  });

  it("blocks AdSense test mode for real production deployment", () => {
    const check = checkDisplayAdsConfig(
      realAdsEnvironment({
        NEXT_PUBLIC_DISPLAY_ADS_TEST_MODE: "true"
      }),
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "adsense-test-mode-production");
  });

  it("requires an AdSense client when AdSense is enabled for deployment", () => {
    const check = checkDisplayAdsConfig(
      realAdsEnvironment({
        NEXT_PUBLIC_ADSENSE_CLIENT_ID: ""
      }),
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "missing-adsense-client");
  });

  it("accepts AdSense when the client, a slot, and an allowed host are configured", () => {
    const check = checkDisplayAdsConfig(realAdsEnvironment(), { requireProductionSafe: true });

    assert.equal(check.level, "ok");
    assert.equal(check.status, "adsense-ready");
  });

  it("blocks full third-party ad mode on keyed URLs for deployment", () => {
    const check = checkDisplayAdsConfig(
      {
        NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-123",
        NEXT_PUBLIC_ADSENSE_SLOT_TOP_BANNER: "123456",
        NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS: "schedule.tonimakes.com",
        NEXT_PUBLIC_DISPLAY_ADS_ENABLED: "true",
        NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE: "full",
        NEXT_PUBLIC_DISPLAY_ADS_PROVIDER: "adsense"
      },
      { requireProductionSafe: true }
    );

    assert.equal(check.level, "error");
    assert.equal(check.status, "unsafe-keyed-url-mode");
  });
});

describe("hasCheckLevel", () => {
  it("detects a matching level", () => {
    assert.equal(
      hasCheckLevel(
        [
          { level: "ok", name: "one", status: "ready" },
          { level: "error", name: "two", status: "missing" }
        ],
        "error"
      ),
      true
    );
  });
});
