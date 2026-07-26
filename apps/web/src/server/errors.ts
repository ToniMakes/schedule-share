import type { ApiErrorCode, ApiErrorResponse } from "@schedule-share/api-client";

export class HttpError extends Error {
  readonly code: ApiErrorCode;
  readonly details: unknown;
  readonly status: number;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apiErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown
): Response {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details })
    }
  };

  return Response.json(body, { status });
}

export function unknownErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return apiErrorResponse(error.status, error.code, error.message, error.details);
  }

  console.error(error);
  return apiErrorResponse(500, "INTERNAL_ERROR", "Unexpected server error.");
}

export async function withApiErrorHandling(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return unknownErrorResponse(error);
  }
}
