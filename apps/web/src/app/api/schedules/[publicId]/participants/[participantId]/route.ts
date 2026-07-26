import { updateParticipantAvailabilityRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { withApiErrorHandling } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { getParticipantAvailabilityView } from "@/server/schedules/get-participant-availability";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";
import { updateParticipantAvailabilityRecord } from "@/server/schedules/update-participant-availability";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{
    readonly publicId: string;
    readonly participantId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return withApiErrorHandling(async () => {
    const { publicId, participantId } = await context.params;
    const editKey = new URL(request.url).searchParams.get("key") ?? "";
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await getParticipantAvailabilityView(publicId, participantId, editKey, {
      repository
    });

    return Response.json(response);
  });
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const parsed = await parseJsonRequest(request, updateParticipantAvailabilityRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  return withApiErrorHandling(async () => {
    const { publicId, participantId } = await context.params;
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
