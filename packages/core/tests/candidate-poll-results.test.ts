import { describe, expect, it } from "vitest";

import {
  buildCandidatePollResults,
  CoreError,
  type CandidatePollParticipant,
  type TimeSlotAvailability
} from "../src";

const participants: CandidatePollParticipant[] = [
  { id: "participant-1" },
  { id: "participant-2" },
  { id: "participant-3" }
];

describe("buildCandidatePollResults", () => {
  it("ranks candidates by weighted decision score before start time", () => {
    const results = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        }),
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-2", "participant-3"]
        }),
        buildSlot({
          label: "Option C",
          startUtc: "2026-08-05T09:00:00.000Z",
          availableParticipantCount: 0,
          availableParticipantIds: [],
          maybeParticipantCount: 3,
          maybeParticipantIds: ["participant-1", "participant-2", "participant-3"]
        })
      ]
    });

    expect(results.map((result) => result.slot.label)).toEqual([
      "Option B",
      "Option C",
      "Option A"
    ]);
    expect(results[0]).toMatchObject({
      rank: 1,
      availableParticipantIds: ["participant-1"],
      maybeParticipantIds: ["participant-2", "participant-3"],
      unavailableParticipantIds: [],
      availableParticipantCount: 1,
      maybeParticipantCount: 2,
      unavailableParticipantCount: 0,
      availablePercent: 33,
      maybePercent: 67,
      decisionScore: 2,
      decisionPercent: 67,
      isBest: true
    });
  });

  it("prefers more firm availability when weighted scores tie", () => {
    const results = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-2", "participant-3"]
        }),
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 2,
          availableParticipantIds: ["participant-1", "participant-2"],
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        })
      ]
    });

    expect(results.map((result) => result.slot.label)).toEqual(["Option B", "Option A"]);
    expect(results.map((result) => result.isBest)).toEqual([true, false]);
  });

  it("uses first preference count and average rank as weighted-score tie breakers", () => {
    const results = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"],
          firstPreferenceParticipantCount: 0,
          firstPreferenceParticipantIds: [],
          preferenceRankCount: 2,
          preferenceRankSum: 5
        }),
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-2"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-3"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-3"],
          preferenceRankCount: 2,
          preferenceRankSum: 4
        })
      ]
    });

    expect(results.map((result) => result.slot.label)).toEqual(["Option B", "Option A"]);
    expect(results[0]).toMatchObject({
      firstPreferenceParticipantIds: ["participant-3"],
      firstPreferenceParticipantCount: 1,
      preferenceRankCount: 2,
      averagePreferenceRank: 2,
      isBest: true
    });
    expect(results[1]).toMatchObject({
      averagePreferenceRank: 2.5,
      isBest: false
    });
  });

  it("marks tied leaders as best", () => {
    const results = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"]
        }),
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-2"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-3"]
        })
      ]
    });

    expect(results.map((result) => result.isBest)).toEqual([true, true]);
    expect(results.map((result) => result.rank)).toEqual([1, 2]);
  });

  it("keeps candidates when there are no participants yet", () => {
    const results = buildCandidatePollResults({
      participants: [],
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 0,
          availableParticipantIds: [],
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        })
      ]
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      availableParticipantIds: [],
      maybeParticipantIds: [],
      unavailableParticipantIds: [],
      availablePercent: 0,
      maybePercent: 0,
      decisionScore: 0,
      decisionPercent: 0,
      isBest: false
    });
  });

  it("rejects duplicate participant ids", () => {
    expect(() =>
      buildCandidatePollResults({
        participants: [{ id: "participant-1" }, { id: "participant-1" }],
        slots: []
      })
    ).toThrow(CoreError);
  });
});

type BuildSlotOverrides = Pick<
  TimeSlotAvailability,
  "availableParticipantCount" | "availableParticipantIds" | "label" | "startUtc"
> &
  Partial<Pick<TimeSlotAvailability, "maybeParticipantCount" | "maybeParticipantIds">> &
  Partial<
    Pick<
      TimeSlotAvailability,
      | "firstPreferenceParticipantCount"
      | "firstPreferenceParticipantIds"
      | "preferenceRankCount"
      | "preferenceRankSum"
    >
  >;

function buildSlot(overrides: BuildSlotOverrides): TimeSlotAvailability {
  return {
    candidateTimeOptionId: overrides.label?.toLowerCase().replace(/\s+/g, "-"),
    label: overrides.label,
    startUtc: overrides.startUtc,
    endUtc: overrides.startUtc.replace(":00.000Z", ":30.000Z"),
    timezone: "Australia/Sydney",
    localStartDate: "2026-08-03",
    localEndDate: "2026-08-03",
    localStartTime: "18:00",
    localEndTime: "18:30",
    availableParticipantCount: overrides.availableParticipantCount,
    availableParticipantIds: overrides.availableParticipantIds,
    maybeParticipantCount: overrides.maybeParticipantCount ?? 0,
    maybeParticipantIds: overrides.maybeParticipantIds ?? [],
    firstPreferenceParticipantCount: overrides.firstPreferenceParticipantCount ?? 0,
    firstPreferenceParticipantIds: overrides.firstPreferenceParticipantIds ?? [],
    preferenceRankCount: overrides.preferenceRankCount ?? 0,
    preferenceRankSum: overrides.preferenceRankSum ?? 0,
    isEveryoneAvailable: false
  };
}
