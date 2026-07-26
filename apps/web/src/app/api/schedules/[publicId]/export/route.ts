import { getDatabase } from "@/server/db";
import { withApiErrorHandling } from "@/server/errors";
import {
  readAccessKey,
  readScheduleRouteParams,
  type ScheduleRouteContext
} from "@/server/route-inputs";
import { exportOwnerScheduleCsv } from "@/server/schedules/export-owner-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

export async function GET(request: Request, context: ScheduleRouteContext): Promise<Response> {
  return withApiErrorHandling(async () => {
    const { publicId } = await readScheduleRouteParams(context);
    const ownerKey = readAccessKey(request);
    const repository = new DrizzleScheduleRepository(getDatabase());
    const exported = await exportOwnerScheduleCsv(publicId, ownerKey, { repository });

    return new Response(exported.content, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${exported.filename}"`,
        "content-type": "text/csv; charset=utf-8"
      }
    });
  });
}
