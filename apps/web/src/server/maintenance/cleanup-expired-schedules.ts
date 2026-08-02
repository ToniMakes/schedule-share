import { timingSafeEqual } from "node:crypto";

import { HttpError } from "../errors";
import type { ScheduleMaintenanceRepository } from "../schedules/repository";

const DEFAULT_HARD_DELETE_GRACE_DAYS = 30;
const DEFAULT_BATCH_SIZE = 100;
const MAX_HARD_DELETE_GRACE_DAYS = 365;
const MAX_BATCH_SIZE = 1000;

export interface ScheduleCleanupConfig {
  readonly batchSize: number;
  readonly hardDeleteGraceDays: number;
}

export interface ScheduleCleanupEnvironment {
  readonly [key: string]: string | undefined;
  readonly CRON_SECRET?: string;
  readonly SCHEDULE_CLEANUP_BATCH_SIZE?: string;
  readonly SCHEDULE_HARD_DELETE_GRACE_DAYS?: string;
}

export interface ScheduleCleanupDependencies {
  readonly now?: () => Date;
  readonly repository: ScheduleMaintenanceRepository;
}

export interface ScheduleCleanupResult {
  readonly archivedCount: number;
  readonly batchSize: number;
  readonly deletedCount: number;
  readonly expiresAtCutoff: Date;
  readonly hardDeleteCutoff: Date;
  readonly hardDeleteGraceDays: number;
  readonly ranAt: Date;
}

export async function cleanupExpiredSchedules(
  dependencies: ScheduleCleanupDependencies,
  config: ScheduleCleanupConfig = readScheduleCleanupConfig()
): Promise<ScheduleCleanupResult> {
  const now = dependencies.now?.() ?? new Date();
  const hardDeleteCutoff = subtractDays(now, config.hardDeleteGraceDays);

  const archived = await dependencies.repository.archiveExpiredSchedules({
    expiresAtOrBefore: now,
    limit: config.batchSize,
    now
  });
  const deleted = await dependencies.repository.hardDeleteArchivedSchedules({
    expiresAtOrBefore: hardDeleteCutoff,
    limit: config.batchSize
  });

  return {
    archivedCount: archived.count,
    batchSize: config.batchSize,
    deletedCount: deleted.count,
    expiresAtCutoff: now,
    hardDeleteCutoff,
    hardDeleteGraceDays: config.hardDeleteGraceDays,
    ranAt: now
  };
}

export function assertMaintenanceCronAuthorized(
  headers: Pick<Headers, "get">,
  environment: ScheduleCleanupEnvironment = process.env
): void {
  const cronSecret = environment.CRON_SECRET?.trim() ?? "";

  if (cronSecret.length === 0) {
    throw new HttpError(503, "INTERNAL_ERROR", "Maintenance cron secret is not configured.");
  }

  const authorization = headers.get("authorization")?.trim() ?? "";
  const expected = `Bearer ${cronSecret}`;

  if (!constantTimeEqual(authorization, expected)) {
    throw new HttpError(401, "UNAUTHENTICATED", "Maintenance cron authorization is invalid.");
  }
}

export function readScheduleCleanupConfig(
  environment: ScheduleCleanupEnvironment = process.env
): ScheduleCleanupConfig {
  return {
    batchSize: readBoundedInteger(environment.SCHEDULE_CLEANUP_BATCH_SIZE, {
      defaultValue: DEFAULT_BATCH_SIZE,
      maxValue: MAX_BATCH_SIZE,
      minValue: 1,
      name: "SCHEDULE_CLEANUP_BATCH_SIZE"
    }),
    hardDeleteGraceDays: readBoundedInteger(environment.SCHEDULE_HARD_DELETE_GRACE_DAYS, {
      defaultValue: DEFAULT_HARD_DELETE_GRACE_DAYS,
      maxValue: MAX_HARD_DELETE_GRACE_DAYS,
      minValue: 1,
      name: "SCHEDULE_HARD_DELETE_GRACE_DAYS"
    })
  };
}

function readBoundedInteger(
  rawValue: string | undefined,
  options: {
    readonly defaultValue: number;
    readonly maxValue: number;
    readonly minValue: number;
    readonly name: string;
  }
): number {
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return options.defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < options.minValue || parsed > options.maxValue) {
    throw new HttpError(
      500,
      "INTERNAL_ERROR",
      `${options.name} must be an integer between ${options.minValue} and ${options.maxValue}.`
    );
  }

  return parsed;
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
