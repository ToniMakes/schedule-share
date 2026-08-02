import { loadRootEnv } from "./load-env.mjs";
import {
  checkAppBaseUrl,
  checkDatabaseUrl,
  checkDisplayAdsConfig,
  checkImageImportConfig,
  checkMaintenanceCronConfig,
  checkMigrationDatabaseUrl,
  checkSmokeBaseUrl,
  hasCheckLevel
} from "./config-checks.mjs";

loadRootEnv();

const checks = [
  checkDatabaseUrl(process.env.DATABASE_URL, { requireHosted: true }),
  checkMigrationDatabaseUrl(process.env.DATABASE_MIGRATION_URL, process.env.DATABASE_URL, {
    requireHosted: true
  }),
  checkSmokeBaseUrl(process.env.SMOKE_BASE_URL, { requireRemote: true }),
  checkAppBaseUrl(process.env.APP_BASE_URL, { requireRemote: true }),
  checkMaintenanceCronConfig(process.env, { requireProductionSafe: true }),
  checkDisplayAdsConfig(process.env, { requireProductionSafe: true }),
  checkImageImportConfig(process.env, { requireProductionSafe: true })
];

for (const check of checks) {
  log(`${check.name}: ${check.status}`);
  log(`  ${check.detail}`);

  if (check.value !== undefined) {
    log(`  value: ${check.value}`);
  }
}

if (hasCheckLevel(checks, "error")) {
  fail("Deployment config is not ready.");
}

log("Deployment config looks ready.");

function log(message) {
  console.log(`[deployment:config] ${message}`);
}

function fail(message) {
  console.error(`[deployment:config] ${message}`);
  process.exit(1);
}
