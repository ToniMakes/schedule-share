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
  checkDatabaseUrl(process.env.DATABASE_URL),
  checkMigrationDatabaseUrl(process.env.DATABASE_MIGRATION_URL, process.env.DATABASE_URL),
  checkSmokeBaseUrl(process.env.SMOKE_BASE_URL),
  checkAppBaseUrl(process.env.APP_BASE_URL),
  checkMaintenanceCronConfig(process.env),
  checkDisplayAdsConfig(process.env),
  checkImageImportConfig(process.env)
];

for (const check of checks) {
  log(`${check.name}: ${check.status}`);
  log(`  ${check.detail}`);

  if (check.value !== undefined) {
    log(`  value: ${check.value}`);
  }
}

if (hasCheckLevel(checks, "warn")) {
  process.exitCode = 1;
}

function log(message) {
  console.log(`[env:status] ${message}`);
}
