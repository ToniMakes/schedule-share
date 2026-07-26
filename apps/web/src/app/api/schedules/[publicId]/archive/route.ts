import { archiveScheduleRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { unknownErrorResponse } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { archiveScheduleRecord } from "@/server/schedules/archive-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const parsed = await parseJsonRequest(request, archiveScheduleRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const { publicId } = await context.params;
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await archiveScheduleRecord(publicId, parsed.data, { repository });

    return Response.json(response);
  } catch (error) {
    return unknownErrorResponse(error);
  }
}
