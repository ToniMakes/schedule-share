import {
  calculateAvailabilitySummary,
  CoreError,
  type AvailabilitySlot
} from "@schedule-share/core";
import type { CandidateVoteInput } from "@schedule-share/api-client";

import { HttpError } from "../errors";
import type { CandidateTimeOptionRecord, ScheduleDetailRecord } from "./repository";
import { getScheduleSlots } from "./schedule-slots";

export interface NormalizedAvailabilitySubmission {
  readonly availabilitySlots: readonly AvailabilitySlot[];
  readonly candidateVotes: readonly CandidateVoteInput[];
}

const candidateVoteResponses = new Set(["available", "maybe", "unavailable"]);

export function validateAvailabilitySlotsForSchedule(
  schedule: ScheduleDetailRecord,
  availableSlots: readonly AvailabilitySlot[],
  candidateTimeOptions: readonly CandidateTimeOptionRecord[] = []
): void {
  try {
    calculateAvailabilitySummary(getScheduleSlots(schedule, candidateTimeOptions), [
      {
        participantId: "submitted-participant",
        availableSlots
      }
    ]);
  } catch (error) {
    if (error instanceof CoreError) {
      throw new HttpError(400, coreErrorCode(error), error.message, {
        coreCode: error.code
      });
    }

    throw error;
  }
}

export function normalizeAvailabilitySubmissionForSchedule(
  schedule: ScheduleDetailRecord,
  availableSlots: readonly AvailabilitySlot[],
  candidateTimeOptions: readonly CandidateTimeOptionRecord[] = [],
  candidateVotes: readonly CandidateVoteInput[] | undefined
): NormalizedAvailabilitySubmission {
  if (schedule.scheduleMode !== "candidate_poll") {
    if (candidateVotes !== undefined && candidateVotes.length > 0) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Candidate votes can only be submitted for candidate poll schedules."
      );
    }

    validateAvailabilitySlotsForSchedule(schedule, availableSlots, candidateTimeOptions);

    return {
      availabilitySlots: availableSlots,
      candidateVotes: []
    };
  }

  if (candidateVotes === undefined) {
    validateAvailabilitySlotsForSchedule(schedule, availableSlots, candidateTimeOptions);

    return {
      availabilitySlots: availableSlots,
      candidateVotes: []
    };
  }

  const normalizedVotes = normalizeCandidateVotes(candidateVotes, candidateTimeOptions);
  const candidateOptionsById = new Map(candidateTimeOptions.map((option) => [option.id, option]));
  const availableSlotsFromVotes = normalizedVotes
    .filter((vote) => vote.response === "available")
    .map((vote) => {
      const option = candidateOptionsById.get(vote.candidateTimeOptionId);

      if (option === undefined) {
        throw new HttpError(
          400,
          "CANDIDATE_OPTION_NOT_FOUND",
          "Candidate vote references an option outside this schedule."
        );
      }

      return {
        startUtc: option.slotStartUtc.toISOString(),
        endUtc: option.slotEndUtc.toISOString()
      };
    });

  validateAvailabilitySlotsForSchedule(schedule, availableSlotsFromVotes, candidateTimeOptions);

  return {
    availabilitySlots: availableSlotsFromVotes,
    candidateVotes: normalizedVotes
  };
}

function normalizeCandidateVotes(
  candidateVotes: readonly CandidateVoteInput[],
  candidateTimeOptions: readonly CandidateTimeOptionRecord[]
): CandidateVoteInput[] {
  const candidateOptionIds = new Set(candidateTimeOptions.map((option) => option.id));
  const seenCandidateOptionIds = new Set<string>();
  const seenPreferenceRanks = new Set<number>();

  return candidateVotes.map((vote) => {
    const candidateTimeOptionId = vote.candidateTimeOptionId.trim();

    if (seenCandidateOptionIds.has(candidateTimeOptionId)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Candidate votes cannot contain the same option more than once."
      );
    }

    seenCandidateOptionIds.add(candidateTimeOptionId);

    if (!candidateOptionIds.has(candidateTimeOptionId)) {
      throw new HttpError(
        400,
        "CANDIDATE_OPTION_NOT_FOUND",
        "Candidate vote references an option outside this schedule."
      );
    }

    if (!candidateVoteResponses.has(vote.response)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Candidate vote response is invalid.");
    }

    if (vote.preferenceRank !== undefined) {
      if (vote.response === "unavailable") {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "Candidate preference ranks can only be set on available or maybe votes."
        );
      }

      if (seenPreferenceRanks.has(vote.preferenceRank)) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "Candidate preference ranks cannot contain duplicates."
        );
      }

      seenPreferenceRanks.add(vote.preferenceRank);
    }

    return {
      candidateTimeOptionId,
      ...(vote.preferenceRank === undefined ? {} : { preferenceRank: vote.preferenceRank }),
      response: vote.response
    };
  });
}

function coreErrorCode(error: CoreError): "SLOT_OUT_OF_RANGE" | "VALIDATION_ERROR" {
  return error.code === "SLOT_OUT_OF_RANGE" ? "SLOT_OUT_OF_RANGE" : "VALIDATION_ERROR";
}
