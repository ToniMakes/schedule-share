import { createScheduleRequestSchema } from "@schedule-share/api-client";

import { withApiErrorHandling } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { createScheduleRecord } from "@/server/schedules/create-schedule";
import { createScheduleRepository } from "@/server/schedules/repository-factory";
import { getRequestBaseUrl } from "@/server/urls";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonRequest(request, createScheduleRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  return withApiErrorHandling(async () => {
    const repository = createScheduleRepository();
    const response = await createScheduleRecord(parsed.data, {
      baseUrl: getRequestBaseUrl(request),
      repository
    });

    return Response.json(response, { status: 201 });
  });
}
