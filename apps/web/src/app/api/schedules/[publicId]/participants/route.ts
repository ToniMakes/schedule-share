import { createParticipantAvailabilityRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { withApiErrorHandling } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { readScheduleRouteParams, type ScheduleRouteContext } from "@/server/route-inputs";
import { createParticipantAvailabilityRecord } from "@/server/schedules/create-participant-availability";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";
import { getRequestBaseUrl } from "@/server/urls";

export const runtime = "nodejs";

export async function POST(request: Request, context: ScheduleRouteContext): Promise<Response> {
  const parsed = await parseJsonRequest(request, createParticipantAvailabilityRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  return withApiErrorHandling(async () => {
    const { publicId } = await readScheduleRouteParams(context);
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await createParticipantAvailabilityRecord(publicId, parsed.data, {
      baseUrl: getRequestBaseUrl(request),
      repository
    });

    return Response.json(response, { status: 201 });
  });
}
