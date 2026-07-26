import { archiveScheduleRequestSchema } from "@schedule-share/api-client";

import { withApiErrorHandling } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { readScheduleRouteParams, type ScheduleRouteContext } from "@/server/route-inputs";
import { archiveScheduleRecord } from "@/server/schedules/archive-schedule";
import { createScheduleRepository } from "@/server/schedules/repository-factory";

export const runtime = "nodejs";

export async function POST(request: Request, context: ScheduleRouteContext): Promise<Response> {
  const parsed = await parseJsonRequest(request, archiveScheduleRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  return withApiErrorHandling(async () => {
    const { publicId } = await readScheduleRouteParams(context);
    const repository = createScheduleRepository();
    const response = await archiveScheduleRecord(publicId, parsed.data, { repository });

    return Response.json(response);
  });
}
