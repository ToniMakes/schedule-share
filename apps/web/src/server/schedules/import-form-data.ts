import { HttpError } from "../errors";

export async function readImportFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid multipart form data.");
  }
}

export function readRequiredFormString(formData: FormData, key: string): string {
  const value = readOptionalFormString(formData, key);

  if (value === undefined || value.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${key} is required.`);
  }

  return value;
}

export function readOptionalFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : undefined;
}

export function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}
