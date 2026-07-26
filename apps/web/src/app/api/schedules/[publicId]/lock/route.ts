import { lockScheduleRequestSchema } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { unknownErrorResponse } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { lockScheduleRecord } from "@/server/schedules/lock-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const parsed = await parseJsonRequest(request, lockScheduleRequestSchema);

  if (!parsed.success) {
    return parsed.response;
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
