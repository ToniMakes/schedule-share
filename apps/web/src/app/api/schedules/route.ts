import { createScheduleRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { apiErrorResponse, unknownErrorResponse } from "@/server/errors";
import { readJson } from "@/server/request-json";
import { createScheduleRecord } from "@/server/schedules/create-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";
import { getRequestBaseUrl } from "@/server/urls";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  if (!body.success) {
    return apiErrorResponse(400, "VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = createScheduleRequestSchema.safeParse(body.value);

  if (!parsed.success) {
    return apiErrorResponse(
      400,
      "VALIDATION_ERROR",
      "Invalid request body.",
      parsed.error.flatten()
    );
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
