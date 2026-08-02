import { getAiCreditStatusRequestSchema } from "@schedule-share/api-client";

import { getAiCreditStatusView } from "@/server/ai-credit-status";
import { apiErrorResponse, withApiErrorHandling } from "@/server/errors";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const searchParams = new URL(request.url).searchParams;
  const parsed = getAiCreditStatusRequestSchema.safeParse({
    schedulePublicId: searchParams.get("schedulePublicId") ?? ""
  });

  if (!parsed.success) {
    return apiErrorResponse(
      400,
      "VALIDATION_ERROR",
      "Invalid AI credit status query.",
      parsed.error.flatten()
    );
  }

  return withApiErrorHandling(async () => {
    const response = await getAiCreditStatusView(parsed.data);

    return Response.json(response);
  });
}
