import { getDatabase } from "@/server/db";
import { withApiErrorHandling } from "@/server/errors";
import { getScheduleView } from "@/server/schedules/get-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  return withApiErrorHandling(async () => {
    const { publicId } = await context.params;
    const repository = new DrizzleScheduleRepository(getDatabase());
    const response = await getScheduleView(publicId, { repository });

    return Response.json(response);
  });
}
