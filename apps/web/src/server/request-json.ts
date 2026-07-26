import { apiErrorResponse } from "./errors";

interface JsonSchema<TValue> {
  safeParse(value: unknown):
    | {
        readonly data: TValue;
        readonly success: true;
      }
    | {
        readonly error: {
          flatten(): unknown;
        };
        readonly success: false;
      };
}

export async function readJson(
  request: Request
): Promise<{ readonly success: true; readonly value: unknown } | { readonly success: false }> {
  try {
    return {
      success: true,
      value: await request.json()
    };
  } catch {
    return {
      success: false
    };
  }
}

export async function parseJsonRequest<TValue>(
  request: Request,
  schema: JsonSchema<TValue>
): Promise<
  | {
      readonly data: TValue;
      readonly success: true;
    }
  | {
      readonly response: Response;
      readonly success: false;
    }
> {
  const body = await readJson(request);

  if (!body.success) {
    return {
      response: apiErrorResponse(400, "VALIDATION_ERROR", "Request body must be valid JSON."),
      success: false
    };
  }

  const parsed = schema.safeParse(body.value);

  if (!parsed.success) {
    return {
      response: apiErrorResponse(
        400,
        "VALIDATION_ERROR",
        "Invalid request body.",
        parsed.error.flatten()
      ),
      success: false
    };
  }

  return {
    data: parsed.data,
    success: true
  };
}
