import { withApiErrorHandling } from "@/server/errors";
import {
  assertMaintenanceCronAuthorized,
  cleanupExpiredSchedules,
  readScheduleCleanupConfig
} from "@/server/maintenance/cleanup-expired-schedules";
import { createScheduleRepository } from "@/server/schedules/repository-factory";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return withApiErrorHandling(async () => {
    assertMaintenanceCronAuthorized(request.headers);

    const repository = createScheduleRepository();
    const result = await cleanupExpiredSchedules(
      { repository },
      readScheduleCleanupConfig(process.env)
    );

    return Response.json({
      maintenance: {
        archivedCount: result.archivedCount,
        batchSize: result.batchSize,
        deletedCount: result.deletedCount,
        expiresAtCutoff: result.expiresAtCutoff.toISOString(),
        hardDeleteCutoff: result.hardDeleteCutoff.toISOString(),
        hardDeleteGraceDays: result.hardDeleteGraceDays,
        ranAt: result.ranAt.toISOString()
      }
    });
  });
}
