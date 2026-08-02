import { availabilityPreviewRequestSchema } from "@schedule-share/api-client";

import { HttpError, withApiErrorHandling } from "@/server/errors";
import { parseJsonRequest } from "@/server/request-json";
import { readScheduleRouteParams, type ScheduleRouteContext } from "@/server/route-inputs";
import { createAiRecognitionCreditLedger } from "@/server/ai-credits";
import { parseCsvImportFormDataFields } from "@/server/schedules/csv-import";
import {
  createConfiguredImageImportProvider,
  parseImageImportFormDataFields,
  readImageImportRuntimeConfig
} from "@/server/schedules/image-import";
import { parseIcsImportFormDataFields } from "@/server/schedules/ics-import";
import { readImportFormData, readRequiredFormString } from "@/server/schedules/import-form-data";
import {
  previewAvailabilityDraft,
  previewAvailabilityDraftFromCsv,
  previewAvailabilityDraftFromIcs,
  previewAvailabilityDraftFromImage
} from "@/server/schedules/preview-availability";
import { createScheduleRepository } from "@/server/schedules/repository-factory";

export const runtime = "nodejs";

export async function POST(request: Request, context: ScheduleRouteContext): Promise<Response> {
  if (isMultipartRequest(request)) {
    return withApiErrorHandling(async () => {
      const formData = await readImportFormData(request);
      const method = readRequiredFormString(formData, "method");
      const { publicId } = await readScheduleRouteParams(context);
      const repository = createScheduleRepository();

      if (method === "image_import") {
        const imageImportConfig = readImageImportRuntimeConfig();
        const input = await parseImageImportFormDataFields(formData, {
          maxBytes: imageImportConfig.maxBytes
        });
        const response = await previewAvailabilityDraftFromImage(publicId, input, {
          imageCreditLedger: imageImportConfig.creditsEnforced
            ? createAiRecognitionCreditLedger()
            : undefined,
          imageImportConfig,
          imageImportProvider: createConfiguredImageImportProvider(
            process.env,
            fetch,
            request.headers.get("x-ai-image-import-test-token") ?? undefined
          ),
          repository
        });

        return Response.json(response);
      }

      if (method === "ics_import") {
        const input = await parseIcsImportFormDataFields(formData);
        const response = await previewAvailabilityDraftFromIcs(publicId, input, {
          repository
        });

        return Response.json(response);
      }

      if (method === "csv_import") {
        const input = await parseCsvImportFormDataFields(formData);
        const response = await previewAvailabilityDraftFromCsv(publicId, input, {
          repository
        });

        return Response.json(response);
      }

      throw new HttpError(
        400,
        "UNSUPPORTED_ENTRY_METHOD",
        "Multipart availability preview supports image_import, ics_import, and csv_import."
      );
    });
  }

  const parsed = await parseJsonRequest(request, availabilityPreviewRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  return withApiErrorHandling(async () => {
    const { publicId } = await readScheduleRouteParams(context);
    const repository = createScheduleRepository();
    const response = await previewAvailabilityDraft(publicId, parsed.data, {
      repository
    });

    return Response.json(response);
  });
}

function isMultipartRequest(request: Request): boolean {
  return (
    request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data") ?? false
  );
}
