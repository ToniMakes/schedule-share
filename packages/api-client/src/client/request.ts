import { apiErrorResponseSchema } from "../contracts/errors";
import { ApiClientError } from "./errors";

export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

interface JsonResponseSchema<TValue> {
  safeParse(value: unknown):
    | {
        readonly data: TValue;
        readonly success: true;
      }
    | {
        readonly success: false;
      };
}

interface JsonRequestOptions<TResponse> {
  readonly allowErrorStatus?: boolean;
  readonly init?: RequestInit;
  readonly options?: ApiClientOptions;
  readonly path: string;
  readonly responseSchema: JsonResponseSchema<TResponse>;
  readonly unexpectedResponseMessage?: string;
}

export async function requestJson<TResponse>({
  allowErrorStatus = false,
  init,
  options = {},
  path,
  responseSchema,
  unexpectedResponseMessage = "Unexpected API response."
}: JsonRequestOptions<TResponse>): Promise<TResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(resolveApiUrl(path, options.baseUrl), init);
  const payload = await readJson(response);

  if (!response.ok && !allowErrorStatus) {
    throw parseApiClientError(response.status, payload);
  }

  const parsed = responseSchema.safeParse(payload);

  if (parsed.success) {
    return parsed.data;
  }

  throw new ApiClientError(response.status, "INTERNAL_ERROR", unexpectedResponseMessage);
}

export function parseApiClientError(status: number, payload: unknown): ApiClientError {
  const parsedError = apiErrorResponseSchema.safeParse(payload);

  if (parsedError.success) {
    return new ApiClientError(
      status,
      parsedError.data.error.code,
      parsedError.data.error.message,
      parsedError.data.error.details
    );
  }

  return new ApiClientError(status, "INTERNAL_ERROR", "Unexpected API error.");
}

export function resolveApiUrl(path: string, baseUrl?: string): string {
  if (baseUrl === undefined || baseUrl.trim().length === 0) {
    return path;
  }

  return new URL(path, baseUrl).toString();
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
