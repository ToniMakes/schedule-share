import { healthStatusResponseSchema, type HealthStatusResponse } from "../contracts/health";
import { requestJson, type ApiClientOptions } from "./request";

export type HealthClientOptions = ApiClientOptions;

export async function getHealthStatus(
  options: HealthClientOptions = {}
): Promise<HealthStatusResponse> {
  return requestJson({
    allowErrorStatus: true,
    options,
    path: "/api/health",
    responseSchema: healthStatusResponseSchema,
    unexpectedResponseMessage: "Unexpected health check response."
  });
}
