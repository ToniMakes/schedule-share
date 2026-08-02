import { HttpError, withApiErrorHandling } from "@/server/errors";
import {
  readAccessKey,
  readScheduleRouteParams,
  type ScheduleRouteContext
} from "@/server/route-inputs";
import {
  exportOwnerScheduleCsv,
  exportOwnerScheduleIcs
} from "@/server/schedules/export-owner-schedule";
import { createScheduleRepository } from "@/server/schedules/repository-factory";

export const runtime = "nodejs";

export async function GET(request: Request, context: ScheduleRouteContext): Promise<Response> {
  return withApiErrorHandling(async () => {
    const { publicId } = await readScheduleRouteParams(context);
    const ownerKey = readAccessKey(request);
    const repository = createScheduleRepository();
    const searchParams = new URL(request.url).searchParams;
    const format = searchParams.get("format")?.trim().toLowerCase() ?? "csv";

    if (format === "ics") {
      const exported = await exportOwnerScheduleIcs(
        publicId,
        ownerKey,
        { repository },
        {
          endUtc: searchParams.get("endUtc") ?? undefined,
          startUtc: searchParams.get("startUtc") ?? undefined,
          target: searchParams.get("target") ?? undefined
        }
      );

      return new Response(exported.content, {
        headers: {
          "cache-control": "no-store",
          "content-disposition": `attachment; filename="${exported.filename}"`,
          "content-type": "text/calendar; charset=utf-8"
        }
      });
    }

    if (format !== "csv") {
      throw new HttpError(400, "VALIDATION_ERROR", "Unsupported export format.");
    }

    const exported = await exportOwnerScheduleCsv(publicId, ownerKey, { repository });

    return new Response(exported.content, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${exported.filename}"`,
        "content-type": "text/csv; charset=utf-8"
      }
    });
  });
}
