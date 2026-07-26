import { createParticipantAvailabilityRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { apiErrorResponse, unknownErrorResponse } from "@/server/errors";
import { readJson } from "@/server/request-json";
import { createParticipantAvailabilityRecord } from "@/server/schedules/create-participant-availability";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";
import { getRequestBaseUrl } from "@/server/urls";

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

  const parsed = createParticipantAvailabilityRequestSchema.safeParse(body.value);

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
    const response = await createParticipantAvailabilityRecord(publicId, parsed.data, {
      baseUrl: getRequestBaseUrl(request),
      repository
    });

    return Response.json(response, { status: 201 });
  } catch (error) {
    return unknownErrorResponse(error);
  }
}
