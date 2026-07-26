import type { ApiErrorCode } from "../contracts/errors";

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly details: unknown;
  readonly status: number;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
