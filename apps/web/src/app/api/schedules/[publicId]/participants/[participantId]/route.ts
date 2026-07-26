import { updateParticipantAvailabilityRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { withApiErrorHandling } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import {
  readAccessKey,
  readParticipantRouteParams,
  type ParticipantRouteContext
} from "@/server/route-inputs";
import { getParticipantAvailabilityView } from "@/server/schedules/get-participant-availability";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";
import { updateParticipantAvailabilityRecord } from "@/server/schedules/update-participant-availability";

export const runtime = "nodejs";

export async function GET(request: Request, context: ParticipantRouteContext): Promise<Response> {
  return withApiErrorHandling(async () => {
    const { publicId, participantId } = await readParticipantRouteParams(context);
    const editKey = readAccessKey(request);
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await getParticipantAvailabilityView(publicId, participantId, editKey, {
      repository
    });

    return Response.json(response);
  });
}

export async function PUT(request: Request, context: ParticipantRouteContext): Promise<Response> {
  const parsed = await parseJsonRequest(request, updateParticipantAvailabilityRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  return withApiErrorHandling(async () => {
    const { publicId, participantId } = await readParticipantRouteParams(context);
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await updateParticipantAvailabilityRecord(
      publicId,
      participantId,
      parsed.data,
      {
        repository
      }
    );

    return Response.json(response);
  });
}
