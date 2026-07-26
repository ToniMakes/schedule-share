import { lockScheduleRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { apiErrorResponse, unknownErrorResponse } from "@/server/errors";
import { readJson } from "@/server/request-json";
import { lockScheduleRecord } from "@/server/schedules/lock-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const body = await readJson(request);

  if (!body.success) {
    return apiErrorResponse(400, "VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = lockScheduleRequestSchema.safeParse(body.value);

  if (!parsed.success) {
    return apiErrorResponse(
      400,
      "VALIDATION_ERROR",
      "Invalid request body.",
      parsed.error.flatten()
    );
  }

  try {
    const { publicId } = await context.params;
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await lockScheduleRecord(publicId, parsed.data, { repository });

    return Response.json(response);
  } catch (error) {
    return unknownErrorResponse(error);
  }
}
