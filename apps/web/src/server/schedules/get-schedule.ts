import type {
  AvailabilityBlockDto,
  AvailabilityResults,
  GetScheduleResponse,
  TimeSlotAvailabilityDto
} from "@schedule-share/api-client";
import {
  calculateAvailabilitySummary,
  CoreError,
  generateTimeSlots,
  type AvailabilityBlock,
  type TimeSlotAvailability
} from "@schedule-share/core";

import { HttpError } from "../errors";
import type {
  AvailabilitySlotRecord,
  OwnerScheduleWithAvailabilityRecord,
  ReadScheduleRepository,
  ScheduleWithAvailabilityRecord
} from "./repository";
import { toScheduleDetail } from "./schedule-response";
import { toTimeSlotConfig } from "./schedule-config";

export interface GetScheduleDependencies {
  readonly repository: ReadScheduleRepository;
}

export async function getScheduleView(
  publicId: string,
  dependencies: GetScheduleDependencies
): Promise<GetScheduleResponse> {
  if (publicId.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Schedule public id is required.");
  }

  const record = await dependencies.repository.getScheduleByPublicId(publicId);

  if (record === undefined) {
    throw new HttpError(404, "SCHEDULE_NOT_FOUND", "Schedule not found.");
  }

  try {
    return toScheduleResponse(record);
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(500, "INTERNAL_ERROR", "Stored schedule configuration is invalid.", {
        coreCode: error.code
      });
    }

    throw error;
  }
}

export function toScheduleResponse(
  record: ScheduleWithAvailabilityRecord | OwnerScheduleWithAvailabilityRecord
): GetScheduleResponse {
  const schedule = record.schedule;
  const timeSlotConfig = toTimeSlotConfig(schedule);
  const slots = generateTimeSlots(timeSlotConfig);
  const results = calculateAvailabilitySummary(
    slots,
    record.participants.map((participant) => ({
      participantId: participant.id,
      availableSlots: slotsForParticipant(record.availabilitySlots, participant.id)
    }))
  );

  return {
    schedule: toScheduleDetail(schedule),
    participants: record.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName
    })),
    results: toAvailabilityResults(results)
  };
}

function slotsForParticipant(
  slots: readonly AvailabilitySlotRecord[],
  participantId: string
): Array<{ readonly startUtc: string; readonly endUtc: string }> {
  return slots
    .filter((slot) => slot.participantId === participantId)
    .map((slot) => ({
      startUtc: slot.slotStartUtc.toISOString(),
      endUtc: slot.slotEndUtc.toISOString()
    }));
}

function toAvailabilityResults(results: {
  readonly totalParticipantCount: number;
  readonly slotResults: readonly TimeSlotAvailability[];
  readonly everyoneAvailableSlots: readonly TimeSlotAvailability[];
  readonly everyoneAvailableBlocks: readonly AvailabilityBlock[];
  readonly rankedSlots: readonly TimeSlotAvailability[];
}): AvailabilityResults {
  return {
    totalParticipantCount: results.totalParticipantCount,
    slotResults: results.slotResults.map(toTimeSlotAvailability),
    everyoneAvailableSlots: results.everyoneAvailableSlots.map(toTimeSlotAvailability),
    everyoneAvailableBlocks: results.everyoneAvailableBlocks.map(toAvailabilityBlock),
    rankedSlots: results.rankedSlots.map(toTimeSlotAvailability)
  };
}

function toTimeSlotAvailability(slot: TimeSlotAvailability): TimeSlotAvailabilityDto {
  return {
    startUtc: slot.startUtc,
    endUtc: slot.endUtc,
    timezone: slot.timezone,
    localStartDate: slot.localStartDate,
    localEndDate: slot.localEndDate,
    localStartTime: slot.localStartTime,
    localEndTime: slot.localEndTime,
    availableParticipantCount: slot.availableParticipantCount,
    availableParticipantIds: [...slot.availableParticipantIds],
    isEveryoneAvailable: slot.isEveryoneAvailable
  };
}

function toAvailabilityBlock(block: AvailabilityBlock): AvailabilityBlockDto {
  return {
    startUtc: block.startUtc,
    endUtc: block.endUtc,
    timezone: block.timezone,
    localStartDate: block.localStartDate,
    localEndDate: block.localEndDate,
    localStartTime: block.localStartTime,
    localEndTime: block.localEndTime,
    slotCount: block.slotCount,
    availableParticipantCount: block.availableParticipantCount,
    availableParticipantIds: [...block.availableParticipantIds]
  };
}
