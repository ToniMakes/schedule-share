export type CoreErrorCode =
  | "DUPLICATE_PARTICIPANT"
  | "DUPLICATE_SLOT"
  | "INVALID_DATE_RANGE"
  | "INVALID_DAILY_WINDOW"
  | "INVALID_LOCAL_DATE"
  | "INVALID_LOCAL_TIME"
  | "INVALID_TIME_RANGE"
  | "INVALID_TIMEZONE"
  | "SLOT_OUT_OF_RANGE"
  | "UNSUPPORTED_SLOT_MINUTES";

export class CoreError extends Error {
  readonly code: CoreErrorCode;

  constructor(code: CoreErrorCode, message: string) {
    super(message);
    this.name = "CoreError";
    this.code = code;
  }
}

export function fail(code: CoreErrorCode, message: string): never {
  throw new CoreError(code, message);
}
