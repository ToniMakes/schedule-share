import { apiErrorResponseSchema } from "../contracts/errors";
import {
  createParticipantAvailabilityRequestSchema,
  createParticipantAvailabilityResponseSchema,
  createScheduleRequestSchema,
  createScheduleResponseSchema,
  getParticipantAvailabilityResponseSchema,
  getScheduleResponseSchema,
  archiveScheduleRequestSchema,
  archiveScheduleResponseSchema,
  lockScheduleRequestSchema,
  lockScheduleResponseSchema,
  updateParticipantAvailabilityRequestSchema,
  updateParticipantAvailabilityResponseSchema,
  type ArchiveScheduleRequest,
  type ArchiveScheduleResponse,
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
import { ApiClientError } from "./errors";

export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

export async function createSchedule(
  input: CreateScheduleRequest,
  options: ApiClientOptions = {}
): Promise<CreateScheduleResponse> {
  const request = createScheduleRequestSchema.parse(input);
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(resolveApiUrl("/api/schedules", options.baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(request)
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw parseApiClientError(response.status, payload);
  }

  return createScheduleResponseSchema.parse(payload);
}

export async function getSchedule(
  publicId: string,
  options: ApiClientOptions = {}
): Promise<GetScheduleResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(
    resolveApiUrl(`/api/schedules/${encodeURIComponent(publicId)}`, options.baseUrl)
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw parseApiClientError(response.status, payload);
  }

  return getScheduleResponseSchema.parse(payload);
}

export async function createParticipantAvailability(
  publicId: string,
  input: CreateParticipantAvailabilityRequest,
  options: ApiClientOptions = {}
): Promise<CreateParticipantAvailabilityResponse> {
  const request = createParticipantAvailabilityRequestSchema.parse(input);
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(
    resolveApiUrl(`/api/schedules/${encodeURIComponent(publicId)}/participants`, options.baseUrl),
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw parseApiClientError(response.status, payload);
  }

  return createParticipantAvailabilityResponseSchema.parse(payload);
}

export async function getParticipantAvailability(
  publicId: string,
  participantId: string,
  editKey: string,
  options: ApiClientOptions = {}
): Promise<GetParticipantAvailabilityResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const query = new URLSearchParams({
    key: editKey
  });
  const response = await fetchImpl(
    resolveApiUrl(
      `/api/schedules/${encodeURIComponent(publicId)}/participants/${encodeURIComponent(
        participantId
      )}?${query.toString()}`,
      options.baseUrl
    )
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw parseApiClientError(response.status, payload);
  }

  return getParticipantAvailabilityResponseSchema.parse(payload);
}

export async function updateParticipantAvailability(
  publicId: string,
  participantId: string,
  input: UpdateParticipantAvailabilityRequest,
  options: ApiClientOptions = {}
): Promise<UpdateParticipantAvailabilityResponse> {
  const request = updateParticipantAvailabilityRequestSchema.parse(input);
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(
    resolveApiUrl(
      `/api/schedules/${encodeURIComponent(publicId)}/participants/${encodeURIComponent(
        participantId
      )}`,
      options.baseUrl
    ),
    {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw parseApiClientError(response.status, payload);
  }

  return updateParticipantAvailabilityResponseSchema.parse(payload);
}

export async function lockSchedule(
  publicId: string,
  input: LockScheduleRequest,
  options: ApiClientOptions = {}
): Promise<LockScheduleResponse> {
  const request = lockScheduleRequestSchema.parse(input);
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(
    resolveApiUrl(`/api/schedules/${encodeURIComponent(publicId)}/lock`, options.baseUrl),
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw parseApiClientError(response.status, payload);
  }

  return lockScheduleResponseSchema.parse(payload);
}

export async function archiveSchedule(
  publicId: string,
  input: ArchiveScheduleRequest,
  options: ApiClientOptions = {}
): Promise<ArchiveScheduleResponse> {
  const request = archiveScheduleRequestSchema.parse(input);
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(
    resolveApiUrl(`/api/schedules/${encodeURIComponent(publicId)}/archive`, options.baseUrl),
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw parseApiClientError(response.status, payload);
  }

  return archiveScheduleResponseSchema.parse(payload);
}

function parseApiClientError(status: number, payload: unknown): ApiClientError {
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
