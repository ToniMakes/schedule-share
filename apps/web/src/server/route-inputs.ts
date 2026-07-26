export interface ScheduleRouteContext {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export interface ParticipantRouteContext {
  readonly params: Promise<{
    readonly participantId: string;
    readonly publicId: string;
  }>;
}

export async function readScheduleRouteParams(
  context: ScheduleRouteContext
): Promise<{ readonly publicId: string }> {
  return context.params;
}

export async function readParticipantRouteParams(
  context: ParticipantRouteContext
): Promise<{ readonly participantId: string; readonly publicId: string }> {
  return context.params;
}

export function readAccessKey(request: Request): string {
  return new URL(request.url).searchParams.get("key") ?? "";
}
