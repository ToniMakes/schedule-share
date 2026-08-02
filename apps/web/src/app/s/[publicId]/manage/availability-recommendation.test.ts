import { describe, expect, it } from "vitest";

import type {
  GetScheduleResponse,
  ParticipantSummary,
  TimeSlotAvailabilityDto,
  TimeSlotDto
} from "@schedule-share/api-client";

import { buildAvailabilityRecommendation } from "./availability-recommendation";

const participants: ParticipantSummary[] = [
  { id: "participant-1", displayName: "Ada" },
  { id: "participant-2", displayName: "Grace" },
  { id: "participant-3", displayName: "Lin" }
];

describe("buildAvailabilityRecommendation", () => {
  it("prefers the longest all-available block", () => {
    const recommendation = buildAvailabilityRecommendation(
      buildScheduleResponse({
        participants: participants.slice(0, 2),
        results: {
          totalParticipantCount: 2,
          slotResults: [],
          everyoneAvailableSlots: [],
          everyoneAvailableBlocks: [
            {
              ...buildSlot({
                localStartTime: "09:00",
                localEndTime: "09:30",
                availableParticipantCount: 2,
                availableParticipantIds: ["participant-1", "participant-2"]
              }),
              slotCount: 1
            },
            {
              ...buildSlot({
                localStartTime: "10:00",
                localEndTime: "11:30",
                availableParticipantCount: 2,
                availableParticipantIds: ["participant-1", "participant-2"]
              }),
              slotCount: 3
            }
          ],
          rankedSlots: []
        }
      })
    );

    expect(recommendation).toMatchObject({
      status: "ready",
      peakAvailableCount: 2,
      primary: {
        kind: "all_available",
        localStartTime: "10:00",
        localEndTime: "11:30",
        slotCount: 3,
        availablePercent: 100
      }
    });
  });

  it("merges contiguous peak slots with the same available people", () => {
    const recommendation = buildAvailabilityRecommendation(
      buildScheduleResponse({
        results: {
          totalParticipantCount: 3,
          slotResults: [
            buildSlot({
              localStartTime: "09:00",
              localEndTime: "09:30",
              availableParticipantCount: 2,
              availableParticipantIds: ["participant-1", "participant-2"]
            }),
            buildSlot({
              localStartTime: "09:30",
              localEndTime: "10:00",
              availableParticipantCount: 2,
              availableParticipantIds: ["participant-2", "participant-1"]
            }),
            buildSlot({
              localStartTime: "10:00",
              localEndTime: "10:30",
              availableParticipantCount: 1,
              availableParticipantIds: ["participant-3"]
            })
          ],
          everyoneAvailableSlots: [],
          everyoneAvailableBlocks: [],
          rankedSlots: []
        }
      })
    );

    expect(recommendation).toMatchObject({
      status: "ready",
      peakAvailableCount: 2,
      primary: {
        kind: "peak_available",
        localStartTime: "09:00",
        localEndTime: "10:00",
        slotCount: 2,
        availablePercent: 67
      }
    });
  });

  it("waits when no participants have submitted", () => {
    expect(
      buildAvailabilityRecommendation(
        buildScheduleResponse({
          participants: [],
          results: {
            totalParticipantCount: 0,
            slotResults: [buildSlot()],
            everyoneAvailableSlots: [],
            everyoneAvailableBlocks: [],
            rankedSlots: []
          }
        })
      )
    ).toEqual({ status: "waiting" });
  });

  it("reports empty availability when participants submitted no usable slots", () => {
    expect(
      buildAvailabilityRecommendation(
        buildScheduleResponse({
          results: {
            totalParticipantCount: 3,
            slotResults: [
              buildSlot({
                availableParticipantCount: 0,
                availableParticipantIds: []
              })
            ],
            everyoneAvailableSlots: [],
            everyoneAvailableBlocks: [],
            rankedSlots: []
          }
        })
      )
    ).toEqual({ status: "empty", totalParticipantCount: 3 });
  });
});

function buildScheduleResponse(overrides: Partial<GetScheduleResponse> = {}): GetScheduleResponse {
  const base: GetScheduleResponse = {
    schedule: {
      publicId: "abc123",
      title: "Team dinner",
      description: null,
      timezone: "Australia/Sydney",
      scheduleMode: "availability_grid",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-02"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:00"
        }
      ],
      candidateWindows: [],
      finalTime: null,
      status: "open"
    },
    participants,
    results: {
      totalParticipantCount: participants.length,
      slotResults: [],
      everyoneAvailableSlots: [],
      everyoneAvailableBlocks: [],
      rankedSlots: []
    }
  };

  return {
    ...base,
    ...overrides
  };
}

function buildSlot(
  overrides: Partial<TimeSlotAvailabilityDto & TimeSlotDto> = {}
): TimeSlotAvailabilityDto {
  const localStartDate = overrides.localStartDate ?? "2026-08-01";
  const localStartTime = overrides.localStartTime ?? "09:00";
  const localEndTime = overrides.localEndTime ?? incrementTime(localStartTime);

  return {
    startUtc: overrides.startUtc ?? `${localStartDate}T${localStartTime}:00.000Z`,
    endUtc: overrides.endUtc ?? `${localStartDate}T${localEndTime}:00.000Z`,
    timezone: overrides.timezone ?? "Australia/Sydney",
    localStartDate,
    localEndDate: overrides.localEndDate ?? localStartDate,
    localStartTime,
    localEndTime,
    availableParticipantCount: overrides.availableParticipantCount ?? 0,
    availableParticipantIds: overrides.availableParticipantIds ?? [],
    maybeParticipantCount: overrides.maybeParticipantCount ?? 0,
    maybeParticipantIds: overrides.maybeParticipantIds ?? [],
    firstPreferenceParticipantCount: overrides.firstPreferenceParticipantCount ?? 0,
    firstPreferenceParticipantIds: overrides.firstPreferenceParticipantIds ?? [],
    preferenceRankCount: overrides.preferenceRankCount ?? 0,
    preferenceRankSum: overrides.preferenceRankSum ?? 0,
    isEveryoneAvailable: overrides.isEveryoneAvailable ?? false,
    ...(overrides.candidateTimeOptionId === undefined
      ? {}
      : { candidateTimeOptionId: overrides.candidateTimeOptionId }),
    ...(overrides.label === undefined ? {} : { label: overrides.label })
  };
}

function incrementTime(value: string): string {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + 30;
  const nextHour = Math.floor(totalMinutes / 60);
  const nextMinute = totalMinutes % 60;

  return `${nextHour.toString().padStart(2, "0")}:${nextMinute.toString().padStart(2, "0")}`;
}
