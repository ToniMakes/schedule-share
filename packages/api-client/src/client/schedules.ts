import {
  createParticipantAvailabilityRequestSchema,
  createParticipantAvailabilityResponseSchema,
  createScheduleRequestSchema,
  createScheduleResponseSchema,
  confirmFinalTimeRequestSchema,
  confirmFinalTimeResponseSchema,
  getParticipantAvailabilityResponseSchema,
  getScheduleResponseSchema,
  availabilityPreviewRequestSchema,
  availabilityPreviewResponseSchema,
  archiveScheduleRequestSchema,
  archiveScheduleResponseSchema,
  lockScheduleRequestSchema,
  lockScheduleResponseSchema,
  updateParticipantAvailabilityRequestSchema,
  updateParticipantAvailabilityResponseSchema,
  type ArchiveScheduleRequest,
  type ArchiveScheduleResponse,
  type AvailabilityPreviewRequest,
  type AvailabilityPreviewResponse,
  type ConfirmFinalTimeRequest,
  type ConfirmFinalTimeResponse,
  type CreateParticipantAvailabilityRequest,
  type CreateParticipantAvailabilityResponse,
  type CreateScheduleRequest,
  type CreateScheduleResponse,
  type GetParticipantAvailabilityResponse,
  type GetScheduleResponse,
  type LockScheduleRequest,
  type LockScheduleResponse,
  type UpdateParticipantAvailabilityRequest,
  type UpdateParticipantAvailabilityResponse
} from "../contracts/schedules";
import { requestJson, type ApiClientOptions } from "./request";

export type { ApiClientOptions } from "./request";

export interface PreviewAvailabilityImageRequest {
  readonly file: Blob;
  readonly filename?: string;
  readonly timezone: string;
  readonly interpretsAs?: "busy";
}

export interface PreviewAvailabilityIcsRequest {
  readonly file: Blob;
  readonly filename?: string;
  readonly timezone: string;
  readonly interpretsAs?: "busy";
}

export interface PreviewAvailabilityCsvRequest {
  readonly file: Blob;
  readonly filename?: string;
  readonly timezone: string;
  readonly interpretsAs?: "busy";
}

export async function createSchedule(
  input: CreateScheduleRequest,
  options: ApiClientOptions = {}
): Promise<CreateScheduleResponse> {
  const request = createScheduleRequestSchema.parse(input);

  return requestJson({
    init: jsonRequestInit("POST", request),
    options,
    path: "/api/schedules",
    responseSchema: createScheduleResponseSchema
  });
}

export async function getSchedule(
  publicId: string,
  options: ApiClientOptions = {}
): Promise<GetScheduleResponse> {
  return requestJson({
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}`,
    responseSchema: getScheduleResponseSchema
  });
}

export async function createParticipantAvailability(
  publicId: string,
  input: CreateParticipantAvailabilityRequest,
  options: ApiClientOptions = {}
): Promise<CreateParticipantAvailabilityResponse> {
  const request = createParticipantAvailabilityRequestSchema.parse(input);

  return requestJson({
    init: jsonRequestInit("POST", request),
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/participants`,
    responseSchema: createParticipantAvailabilityResponseSchema
  });
}

export async function getParticipantAvailability(
  publicId: string,
  participantId: string,
  editKey: string,
  options: ApiClientOptions = {}
): Promise<GetParticipantAvailabilityResponse> {
  const query = new URLSearchParams({
    key: editKey
  });

  return requestJson({
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/participants/${encodeURIComponent(
      participantId
    )}?${query.toString()}`,
    responseSchema: getParticipantAvailabilityResponseSchema
  });
}

export async function updateParticipantAvailability(
  publicId: string,
  participantId: string,
  input: UpdateParticipantAvailabilityRequest,
  options: ApiClientOptions = {}
): Promise<UpdateParticipantAvailabilityResponse> {
  const request = updateParticipantAvailabilityRequestSchema.parse(input);

  return requestJson({
    init: jsonRequestInit("PUT", request),
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/participants/${encodeURIComponent(
      participantId
    )}`,
    responseSchema: updateParticipantAvailabilityResponseSchema
  });
}

export async function previewAvailability(
  publicId: string,
  input: AvailabilityPreviewRequest,
  options: ApiClientOptions = {}
): Promise<AvailabilityPreviewResponse> {
  const request = availabilityPreviewRequestSchema.parse(input);

  return requestJson({
    init: jsonRequestInit("POST", request),
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/availability-preview`,
    responseSchema: availabilityPreviewResponseSchema
  });
}

export async function previewAvailabilityImage(
  publicId: string,
  input: PreviewAvailabilityImageRequest,
  options: ApiClientOptions = {}
): Promise<AvailabilityPreviewResponse> {
  const formData = new FormData();
  const trimmedTimezone = input.timezone.trim();

  formData.set("method", "image_import");
  formData.set("timezone", trimmedTimezone);
  formData.set("interpretsAs", input.interpretsAs ?? "busy");
  formData.set("file", input.file, input.filename);

  return requestJson({
    init: {
      method: "POST",
      body: formData
    },
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/availability-preview`,
    responseSchema: availabilityPreviewResponseSchema
  });
}

export async function previewAvailabilityIcs(
  publicId: string,
  input: PreviewAvailabilityIcsRequest,
  options: ApiClientOptions = {}
): Promise<AvailabilityPreviewResponse> {
  const formData = new FormData();
  const trimmedTimezone = input.timezone.trim();

  formData.set("method", "ics_import");
  formData.set("timezone", trimmedTimezone);
  formData.set("interpretsAs", input.interpretsAs ?? "busy");
  formData.set("file", input.file, input.filename);

  return requestJson({
    init: {
      method: "POST",
      body: formData
    },
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/availability-preview`,
    responseSchema: availabilityPreviewResponseSchema
  });
}

export async function previewAvailabilityCsv(
  publicId: string,
  input: PreviewAvailabilityCsvRequest,
  options: ApiClientOptions = {}
): Promise<AvailabilityPreviewResponse> {
  const formData = new FormData();
  const trimmedTimezone = input.timezone.trim();

  formData.set("method", "csv_import");
  formData.set("timezone", trimmedTimezone);
  formData.set("interpretsAs", input.interpretsAs ?? "busy");
  formData.set("file", input.file, input.filename);

  return requestJson({
    init: {
      method: "POST",
      body: formData
    },
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/availability-preview`,
    responseSchema: availabilityPreviewResponseSchema
  });
}

export async function lockSchedule(
  publicId: string,
  input: LockScheduleRequest,
  options: ApiClientOptions = {}
): Promise<LockScheduleResponse> {
  const request = lockScheduleRequestSchema.parse(input);

  return requestJson({
    init: jsonRequestInit("POST", request),
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/lock`,
    responseSchema: lockScheduleResponseSchema
  });
}

export async function confirmFinalTime(
  publicId: string,
  input: ConfirmFinalTimeRequest,
  options: ApiClientOptions = {}
): Promise<ConfirmFinalTimeResponse> {
  const request = confirmFinalTimeRequestSchema.parse(input);

  return requestJson({
    init: jsonRequestInit("POST", request),
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/final-time`,
    responseSchema: confirmFinalTimeResponseSchema
  });
}

export async function archiveSchedule(
  publicId: string,
  input: ArchiveScheduleRequest,
  options: ApiClientOptions = {}
): Promise<ArchiveScheduleResponse> {
  const request = archiveScheduleRequestSchema.parse(input);

  return requestJson({
    init: jsonRequestInit("POST", request),
    options,
    path: `/api/schedules/${encodeURIComponent(publicId)}/archive`,
    responseSchema: archiveScheduleResponseSchema
  });
}

function jsonRequestInit(method: "POST" | "PUT", body: unknown): RequestInit {
  return {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
