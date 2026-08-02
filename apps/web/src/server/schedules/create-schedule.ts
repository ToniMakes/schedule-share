import type { CreateScheduleRequest, CreateScheduleResponse } from "@schedule-share/api-client";
import type { StoredDailyWindow } from "@schedule-share/db";
import {
  CoreError,
  createCandidateTimeSlots,
  generateTimeSlots,
  type CandidateTimeSlot,
  type TimeSlotConfig
} from "@schedule-share/core";

import { hashKey, randomToken } from "../credentials";
import { HttpError } from "../errors";
import { buildAbsoluteUrl } from "../urls";
import type { CreateScheduleRepository } from "./repository";

const DEFAULT_EXPIRATION_DAYS = 90;

export interface CreateScheduleDependencies {
  readonly baseUrl: string;
  readonly now?: () => Date;
  readonly ownerKeyFactory?: () => string;
  readonly publicIdFactory?: () => string;
  readonly repository: CreateScheduleRepository;
}

export async function createScheduleRecord(
  input: CreateScheduleRequest,
  dependencies: CreateScheduleDependencies
): Promise<CreateScheduleResponse> {
  const scheduleInput = toScheduleRecordInput(input);

  const now = dependencies.now?.() ?? new Date();
  const publicId = dependencies.publicIdFactory?.() ?? randomToken(9);
  const ownerKey = dependencies.ownerKeyFactory?.() ?? randomToken(24);
  const created = await dependencies.repository.createSchedule({
    publicId,
    title: input.title,
    description:
      input.description === undefined || input.description.length === 0 ? null : input.description,
    timezone: input.timezone,
    dateRangeStart: scheduleInput.dateRangeStart,
    dateRangeEnd: scheduleInput.dateRangeEnd,
    slotMinutes: input.slotMinutes,
    dailyWindows: scheduleInput.dailyWindows,
    scheduleMode: input.scheduleMode,
    candidateTimeOptions: scheduleInput.candidateTimeOptions,
    ownerKeyHash: hashKey(ownerKey),
    status: "open",
    expiresAt: addDays(now, DEFAULT_EXPIRATION_DAYS)
  });

  return {
    schedule: created,
    shareUrl: buildAbsoluteUrl(dependencies.baseUrl, `/s/${created.publicId}`),
    ownerUrl: buildAbsoluteUrl(dependencies.baseUrl, `/s/${created.publicId}/manage`, {
      key: ownerKey
    })
  };
}

interface ScheduleRecordInput {
  readonly candidateTimeOptions: Array<{
    readonly label: string | null;
    readonly slotEndUtc: Date;
    readonly slotStartUtc: Date;
  }>;
  readonly dailyWindows: readonly StoredDailyWindow[];
  readonly dateRangeEnd: string;
  readonly dateRangeStart: string;
}

function toScheduleRecordInput(input: CreateScheduleRequest): ScheduleRecordInput {
  if (input.scheduleMode === "candidate_poll") {
    const candidateSlots = validateCandidateScheduleGeneratesSlots(input);

    return {
      candidateTimeOptions: candidateSlots.map((slot) => ({
        label: slot.label ?? null,
        slotStartUtc: new Date(slot.startUtc),
        slotEndUtc: new Date(slot.endUtc)
      })),
      dailyWindows: [],
      dateRangeStart: candidateSlots[0]!.localStartDate,
      dateRangeEnd: candidateSlots.reduce(
        (latestDate, slot) => (slot.localEndDate > latestDate ? slot.localEndDate : latestDate),
        candidateSlots[0]!.localEndDate
      )
    };
  }

  validateGridScheduleGeneratesSlots(input);

  return {
    candidateTimeOptions: [],
    dailyWindows: input.dailyWindows,
    dateRangeStart: input.dateRange.start,
    dateRangeEnd: input.dateRange.end
  };
}

function validateGridScheduleGeneratesSlots(
  input: Extract<
    CreateScheduleRequest,
    {
      readonly scheduleMode: "availability_grid";
    }
  >
): void {
  try {
    const slots = generateTimeSlots(toTimeSlotConfig(input));

    if (slots.length === 0) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Schedule configuration must generate at least one time slot."
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof CoreError) {
      throw new HttpError(400, "VALIDATION_ERROR", error.message, {
        coreCode: error.code
      });
    }

    throw error;
  }
}

function validateCandidateScheduleGeneratesSlots(
  input: Extract<CreateScheduleRequest, { readonly scheduleMode: "candidate_poll" }>
): CandidateTimeSlot[] {
  try {
    return createCandidateTimeSlots({
      timezone: input.timezone,
      candidateWindows: input.candidateWindows
    });
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(400, "VALIDATION_ERROR", error.message, {
        coreCode: error.code
      });
    }

    throw error;
  }
}

function toTimeSlotConfig(
  input: Extract<CreateScheduleRequest, { readonly scheduleMode: "availability_grid" }>
): TimeSlotConfig {
  return {
    timezone: input.timezone,
    dateRange: input.dateRange as TimeSlotConfig["dateRange"],
    slotMinutes: input.slotMinutes,
    dailyWindows: input.dailyWindows as TimeSlotConfig["dailyWindows"]
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
