import { healthStatusResponseSchema, type HealthStatusResponse } from "../contracts/health";
import { ApiClientError } from "./errors";

export interface HealthClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

export async function getHealthStatus(
  options: HealthClientOptions = {}
): Promise<HealthStatusResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(resolveApiUrl("/api/health", options.baseUrl));
  const payload = await readJson(response);
  const parsed = healthStatusResponseSchema.safeParse(payload);

  if (parsed.success) {
    return parsed.data;
  }

  throw new ApiClientError(response.status, "INTERNAL_ERROR", "Unexpected health check response.");
}

function resolveApiUrl(path: string, baseUrl?: string): string {
  if (baseUrl === undefined || baseUrl.trim().length === 0) {
    return path;
  }

  return new URL(path, baseUrl).toString();
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
