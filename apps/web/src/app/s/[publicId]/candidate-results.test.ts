import { describe, expect, it } from "vitest";

import type { ParticipantSummary, TimeSlotAvailabilityDto } from "@schedule-share/api-client";

import {
  buildCandidateResultComparisonDetails,
  buildCandidateResultDetails,
  describeCandidateLeadReason,
  describeCandidateResultInsight
} from "./candidate-result-reasons";
import { buildCandidatePollResultCopyText, buildCandidatePollResults } from "./candidate-results";

const participants: ParticipantSummary[] = [
  {
    id: "participant-1",
    displayName: "Ada"
  },
  {
    id: "participant-2",
    displayName: "Grace"
  },
  {
    id: "participant-3",
    displayName: "Lin"
  }
];

describe("buildCandidatePollResults", () => {
  it("maps core-ranked candidates to participant names", () => {
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
          availableParticipantCount: 2,
          availableParticipantIds: ["participant-1", "participant-3"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-3"],
          preferenceRankCount: 2,
          preferenceRankSum: 3,
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        }),
        buildSlot({
          label: "Option C",
          startUtc: "2026-08-05T09:00:00.000Z",
          availableParticipantCount: 0,
          availableParticipantIds: [],
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        })
      ]
    });

    expect(results.map((result) => result.slot.label)).toEqual([
      "Option B",
      "Option A",
      "Option C"
    ]);
    expect(results[0]).toMatchObject({
      rank: 1,
      availableNames: ["Ada", "Lin"],
      maybeNames: [],
      firstPreferenceNames: ["Lin"],
      firstPreferenceParticipantCount: 1,
      preferenceRankCount: 2,
      averagePreferenceRank: 1.5,
      unavailableNames: ["Grace"],
      availablePercent: 67,
      maybePercent: 0,
      decisionScore: 2,
      decisionPercent: 67,
      isBest: true
    });
    expect(results[1]).toMatchObject({
      rank: 2,
      availableNames: ["Ada"],
      maybeNames: ["Grace"],
      unavailableNames: ["Lin"],
      availablePercent: 33,
      maybePercent: 33,
      decisionScore: 1.5,
      decisionPercent: 50,
      isBest: false
    });
    expect(results[2]).toMatchObject({
      rank: 3,
      availableNames: [],
      maybeNames: [],
      unavailableNames: ["Ada", "Grace", "Lin"],
      availablePercent: 0,
      maybePercent: 0,
      decisionScore: 0,
      decisionPercent: 0,
      isBest: false
    });
  });

  it("uses maybe counts in the weighted decision score", () => {
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
          availableParticipantIds: ["participant-2"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-3"]
        })
      ]
    });

    expect(results.map((result) => result.slot.label)).toEqual(["Option B", "Option A"]);
    expect(results.map((result) => result.isBest)).toEqual([true, false]);
  });

  it("keeps tied leaders marked as best", () => {
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
          availableParticipantIds: ["participant-2"],
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        })
      ]
    });

    expect(results.map((result) => result.isBest)).toEqual([true, true]);
    expect(results.map((result) => result.rank)).toEqual([1, 2]);
  });

  it("keeps all candidates when there are no participants yet", () => {
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
      availableNames: [],
      maybeNames: [],
      unavailableNames: [],
      availablePercent: 0,
      maybePercent: 0,
      isBest: false
    });
  });
});

describe("buildCandidatePollResultCopyText", () => {
  it("builds shareable copy for a ranked candidate with preference signals", () => {
    const [result] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-1"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"],
          preferenceRankCount: 2,
          preferenceRankSum: 3
        })
      ]
    });

    expect(
      buildCandidatePollResultCopyText({
        result: result!,
        scheduleTitle: "Team dinner",
        totalParticipantCount: participants.length
      })
    ).toBe(
      [
        "日程：Team dinner",
        "候选：Option B",
        "时间：2026-08-03 18:00-18:30",
        "投票：1/3 方便 · 1 必要时可以，综合支持 50%",
        "偏好：首选 1，平均顺位 #1.5",
        "缺口：1 人不方便或未回应；还需要 2 人方便；1 人必要时可以；1 人首选",
        "方便：Ada",
        "首选：Ada",
        "必要时可以：Grace",
        "不方便或未回应：Lin"
      ].join("\n")
    );
  });

  it("omits empty candidate name groups from copy text", () => {
    const [result] = buildCandidatePollResults({
      participants: [],
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 0,
          availableParticipantIds: []
        })
      ]
    });

    const text = buildCandidatePollResultCopyText({
      result: result!,
      scheduleTitle: "Team dinner",
      totalParticipantCount: 0
    });

    expect(text).toContain("投票：等待参与者，综合支持 0%");
    expect(text).not.toContain("方便：");
    expect(text).not.toContain("不方便/未选：");
  });

  it("builds English shareable copy for organizer pages", () => {
    const [result] = buildCandidatePollResults({
      locale: "en",
      participants,
      slots: [
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-1"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"],
          preferenceRankCount: 2,
          preferenceRankSum: 3
        })
      ]
    });

    const text = buildCandidatePollResultCopyText({
      locale: "en",
      result: result!,
      scheduleTitle: "Team dinner",
      totalParticipantCount: participants.length
    });

    expect(text).toContain("Schedule: Team dinner");
    expect(text).toContain("Responses: 1/3 available · 1 if needed, Weighted support score 50%");
    expect(text).toContain("Preference: 1 first-choice, avg rank #1.5");
    expect(text).toContain(
      "Gaps: 1 unavailable or unanswered; 2 more available needed; 1 if needed; 1 first-choice"
    );
    expect(text).toContain("Not available or unanswered: Lin");
  });

  it("includes comparison details when a lead candidate is provided", () => {
    const results = buildComparisonResults();
    const leadResult = results[0]!;
    const comparedResult = results.find((result) => result.slot.label === "Option A")!;

    expect(
      buildCandidatePollResultCopyText({
        leadResult,
        result: comparedResult,
        scheduleTitle: "Team dinner",
        totalParticipantCount: participants.length
      })
    ).toContain(
      "对比最佳：综合支持少 16 个百分点；新增方便：Lin；此候选不方便：Grace；首选转入：Ada；首选落后：Grace"
    );
  });
});

describe("describeCandidateLeadReason", () => {
  it("explains a lead by weighted support", () => {
    const results = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 2,
          availableParticipantIds: ["participant-1", "participant-2"],
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        }),
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"]
        })
      ]
    });

    expect(describeCandidateLeadReason(results, participants.length)).toBe(
      "排序依据：综合支持领先（67% 对 50%）"
    );
  });

  it("explains a lead by first-preference count", () => {
    const results = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-2"],
          preferenceRankCount: 3,
          preferenceRankSum: 5,
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-2", "participant-3"]
        }),
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-2"],
          firstPreferenceParticipantCount: 2,
          firstPreferenceParticipantIds: ["participant-1", "participant-3"],
          preferenceRankCount: 3,
          preferenceRankSum: 4,
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-1", "participant-3"]
        })
      ]
    });

    expect(results[0]?.slot.label).toBe("Option B");
    expect(describeCandidateLeadReason(results, participants.length)).toBe(
      "排序依据：首选人数领先（2 对 1）"
    );
  });

  it("explains a lead by average preference rank", () => {
    const results = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-1"],
          preferenceRankCount: 3,
          preferenceRankSum: 6,
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-2", "participant-3"]
        }),
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T09:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-2"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-2"],
          preferenceRankCount: 3,
          preferenceRankSum: 5,
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-1", "participant-3"]
        })
      ]
    });

    expect(results[0]?.slot.label).toBe("Option B");
    expect(describeCandidateLeadReason(results, participants.length)).toBe(
      "排序依据：平均顺位更靠前（#1.7 对 #2）"
    );
  });

  it("explains tied best candidates", () => {
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
          availableParticipantIds: ["participant-2"],
          maybeParticipantCount: 0,
          maybeParticipantIds: []
        })
      ]
    });

    expect(describeCandidateLeadReason(results, participants.length)).toBe(
      "排序依据：2 个候选并列最佳"
    );
  });
});

describe("buildCandidateResultDetails", () => {
  it("summarizes candidate gaps for organizer decisions", () => {
    const [result] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          firstPreferenceParticipantCount: 1,
          firstPreferenceParticipantIds: ["participant-1"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"],
          preferenceRankCount: 1,
          preferenceRankSum: 1
        })
      ]
    });

    expect(buildCandidateResultDetails(result!, participants.length)).toEqual([
      { label: "1 人不方便或未回应", tone: "warning" },
      { label: "还需要 2 人方便", tone: "neutral" },
      { label: "1 人必要时可以", tone: "neutral" },
      { label: "1 人首选", tone: "success" }
    ]);
  });

  it("summarizes all-accepted and all-available candidates", () => {
    const [allAvailable] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 3,
          availableParticipantIds: ["participant-1", "participant-2", "participant-3"]
        })
      ]
    });
    const [allAccepted] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option B",
          startUtc: "2026-08-04T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-2", "participant-3"]
        })
      ]
    });

    expect(buildCandidateResultDetails(allAvailable!, participants.length)).toEqual([
      { label: "全员方便", tone: "success" }
    ]);
    expect(buildCandidateResultDetails(allAccepted!, participants.length)).toEqual([
      { label: "全员至少可接受", tone: "success" },
      { label: "还需要 2 人方便", tone: "neutral" },
      { label: "2 人必要时可以", tone: "neutral" }
    ]);
  });
});

describe("buildCandidateResultComparisonDetails", () => {
  it("summarizes support, availability, and first-preference differences against the lead", () => {
    const results = buildComparisonResults();
    const leadResult = results[0]!;
    const comparedResult = results.find((result) => result.slot.label === "Option A")!;

    expect(buildCandidateResultComparisonDetails(comparedResult, leadResult)).toEqual([
      { label: "综合支持少 16 个百分点", tone: "warning" },
      { label: "新增方便：Lin", tone: "success" },
      { label: "此候选不方便：Grace", tone: "warning" },
      { label: "首选转入：Ada", tone: "success" },
      { label: "首选落后：Grace", tone: "warning" }
    ]);
  });

  it("omits comparison details for the lead candidate itself", () => {
    const [leadResult] = buildComparisonResults();

    expect(buildCandidateResultComparisonDetails(leadResult!, leadResult)).toEqual([]);
  });
});

describe("describeCandidateResultInsight", () => {
  it("highlights when everyone is available", () => {
    const [result] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 3,
          availableParticipantIds: ["participant-1", "participant-2", "participant-3"]
        })
      ]
    });

    expect(describeCandidateResultInsight(result!, participants.length)).toBe(
      "结果：所有参与者都方便"
    );
  });

  it("highlights candidates accepted by everyone with maybe votes", () => {
    const [result] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          maybeParticipantCount: 2,
          maybeParticipantIds: ["participant-2", "participant-3"]
        })
      ]
    });

    expect(describeCandidateResultInsight(result!, participants.length)).toBe(
      "结果：所有参与者都能接受（1 人方便 · 2 人必要时可以）"
    );
  });

  it("calls out first preferences with remaining unavailable participants", () => {
    const [result] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 1,
          availableParticipantIds: ["participant-1"],
          firstPreferenceParticipantCount: 2,
          firstPreferenceParticipantIds: ["participant-1", "participant-2"],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"]
        })
      ]
    });

    expect(describeCandidateResultInsight(result!, participants.length)).toBe(
      "回应：2 人将此项列为首选；另有 1 人不方便或未回应"
    );
  });

  it("calls out candidates that only have maybe support", () => {
    const [result] = buildCandidatePollResults({
      participants,
      slots: [
        buildSlot({
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          availableParticipantCount: 0,
          availableParticipantIds: [],
          maybeParticipantCount: 1,
          maybeParticipantIds: ["participant-2"]
        })
      ]
    });

    expect(describeCandidateResultInsight(result!, participants.length)).toBe(
      "回应：暂时没有人选择方便，1 人必要时可以，2 人不方便或未回应"
    );
  });
});

type BuildSlotOverrides = Pick<
  TimeSlotAvailabilityDto,
  "availableParticipantCount" | "availableParticipantIds" | "label" | "startUtc"
> &
  Partial<Pick<TimeSlotAvailabilityDto, "maybeParticipantCount" | "maybeParticipantIds">> &
  Partial<
    Pick<
      TimeSlotAvailabilityDto,
      | "firstPreferenceParticipantCount"
      | "firstPreferenceParticipantIds"
      | "preferenceRankCount"
      | "preferenceRankSum"
    >
  >;

function buildSlot(overrides: BuildSlotOverrides): TimeSlotAvailabilityDto {
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

function buildComparisonResults() {
  return buildCandidatePollResults({
    participants,
    slots: [
      buildSlot({
        label: "Option A",
        startUtc: "2026-08-03T08:00:00.000Z",
        availableParticipantCount: 2,
        availableParticipantIds: ["participant-1", "participant-3"],
        firstPreferenceParticipantCount: 1,
        firstPreferenceParticipantIds: ["participant-1"],
        maybeParticipantCount: 0,
        maybeParticipantIds: [],
        preferenceRankCount: 2,
        preferenceRankSum: 3
      }),
      buildSlot({
        label: "Option B",
        startUtc: "2026-08-04T08:00:00.000Z",
        availableParticipantCount: 2,
        availableParticipantIds: ["participant-1", "participant-2"],
        firstPreferenceParticipantCount: 1,
        firstPreferenceParticipantIds: ["participant-2"],
        maybeParticipantCount: 1,
        maybeParticipantIds: ["participant-3"],
        preferenceRankCount: 3,
        preferenceRankSum: 4
      })
    ]
  });
}
