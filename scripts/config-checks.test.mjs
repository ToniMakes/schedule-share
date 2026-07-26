import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkDatabaseUrl, checkSmokeBaseUrl, hasCheckLevel, redactUrl } from "./config-checks.mjs";

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
