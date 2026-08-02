import {
  aiCreditStatusResponseSchema,
  getAiCreditStatusRequestSchema,
  type AiCreditStatusResponse,
  type GetAiCreditStatusRequest
} from "../contracts/ai-credits";
import { requestJson, type ApiClientOptions } from "./request";

export type { ApiClientOptions } from "./request";

export async function getAiCreditStatus(
  input: GetAiCreditStatusRequest,
  options: ApiClientOptions = {}
): Promise<AiCreditStatusResponse> {
  const request = getAiCreditStatusRequestSchema.parse(input);
  const query = new URLSearchParams({
    schedulePublicId: request.schedulePublicId
  });

  return requestJson({
    options,
    path: `/api/ai-credits/status?${query.toString()}`,
    responseSchema: aiCreditStatusResponseSchema
  });
}
