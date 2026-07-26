import { getDatabase } from "@/server/db";
import { withApiErrorHandling } from "@/server/errors";
import { readScheduleRouteParams, type ScheduleRouteContext } from "@/server/route-inputs";
import { getScheduleView } from "@/server/schedules/get-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, context: ScheduleRouteContext): Promise<Response> {
  return withApiErrorHandling(async () => {
    const { publicId } = await readScheduleRouteParams(context);
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await getScheduleView(publicId, { repository });

    return Response.json(response);
  });
}
