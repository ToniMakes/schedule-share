import { type Database } from "@schedule-share/db";

import { getDatabase as getDefaultDatabase } from "../db";
import { DrizzleScheduleRepository, type ScheduleRepository } from "./repository";

export interface ScheduleRepositoryFactoryDependencies {
  readonly database?: Database;
  readonly getDatabase?: () => Database;
}

export function createScheduleRepository(
  dependencies: ScheduleRepositoryFactoryDependencies = {}
): ScheduleRepository {
  const database = dependencies.database ?? (dependencies.getDatabase ?? getDefaultDatabase)();

  return new DrizzleScheduleRepository(database);
}
