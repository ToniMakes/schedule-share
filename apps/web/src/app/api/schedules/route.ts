import { createScheduleRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { unknownErrorResponse } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { createScheduleRecord } from "@/server/schedules/create-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";
import { getRequestBaseUrl } from "@/server/urls";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonRequest(request, createScheduleRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await createScheduleRecord(parsed.data, {
      baseUrl: getRequestBaseUrl(request),
      repository
    });

    return Response.json(response, { status: 201 });
  } catch (error) {
    return unknownErrorResponse(error);
  }
}
