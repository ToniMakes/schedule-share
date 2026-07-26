import { getDatabase } from "@/server/db";
import { unknownErrorResponse } from "@/server/errors";
import { exportOwnerScheduleCsv } from "@/server/schedules/export-owner-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { publicId } = await context.params;
    const ownerKey = new URL(request.url).searchParams.get("key") ?? "";
    const repository = new DrizzleScheduleRepository(getDatabase());
    const exported = await exportOwnerScheduleCsv(publicId, ownerKey, { repository });

    return new Response(exported.content, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${exported.filename}"`,
        "content-type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    return unknownErrorResponse(error);
  }
}
