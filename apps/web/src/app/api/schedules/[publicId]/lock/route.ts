import { lockScheduleRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { withApiErrorHandling } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { readScheduleRouteParams, type ScheduleRouteContext } from "@/server/route-inputs";
import { lockScheduleRecord } from "@/server/schedules/lock-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

export async function POST(request: Request, context: ScheduleRouteContext): Promise<Response> {
  const parsed = await parseJsonRequest(request, lockScheduleRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  return withApiErrorHandling(async () => {
    const { publicId } = await readScheduleRouteParams(context);
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await lockScheduleRecord(publicId, parsed.data, { repository });

    return Response.json(response);
  });
}
