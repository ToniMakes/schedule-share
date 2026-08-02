import { describe, expect, it } from "vitest";

import type {
  GetScheduleResponse,
  ParticipantSummary,
  TimeSlotAvailabilityDto,
  TimeSlotDto
} from "@schedule-share/api-client";

import { buildManageRankedSlotCopyText, buildManageResultSummary } from "./result-summary";

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

describe("buildManageResultSummary", () => {
  it("summarizes all-available blocks for an availability grid schedule", () => {
    const summary = buildManageResultSummary(
      buildScheduleResponse({
        results: {
          totalParticipantCount: 2,
          slotResults: [],
          everyoneAvailableSlots: [],
          everyoneAvailableBlocks: [
            {
              ...buildSlot({
                localStartTime: "09:00",
                localEndTime: "10:00",
                availableParticipantCount: 2,
                availableParticipantIds: ["participant-1", "participant-2"]
              }),
              slotCount: 2
            }
          ],
          rankedSlots: []
        },
        participants: participants.slice(0, 2)
      })
    );

    expect(summary).toContain("日程：Team dinner");
    expect(summary).toContain("状态：开放中 · 参与者：2 人");
    expect(summary).toContain("全员可用时间（前 3 段）：");
    expect(summary).toContain("1. 2026-08-01 09:00-10:00（2 个连续时间槽）");
  });

  it("falls back to ranked slots when nobody is all-available", () => {
    const summary = buildManageResultSummary(
      buildScheduleResponse({
        results: {
          totalParticipantCount: 3,
          slotResults: [],
          everyoneAvailableSlots: [],
          everyoneAvailableBlocks: [],
          rankedSlots: [
            buildSlot({
              localStartTime: "09:00",
              availableParticipantCount: 2,
              availableParticipantIds: ["participant-1", "participant-3"]
            }),
            buildSlot({
              localStartTime: "09:30",
              availableParticipantCount: 1,
              availableParticipantIds: ["participant-2"]
            })
          ]
        }
      })
    );

    expect(summary).toContain("暂时没有全员可用时间。当前较优时间（前 3 格）：");
    expect(summary).toContain("1. 2026-08-01 09:00-09:30：2/3 人可用（Ada、Lin）；未选：Grace");
    expect(summary).toContain("2. 2026-08-01 09:30-10:00：1/3 人可用（Grace）；未选：Ada、Lin");
  });

  it("summarizes candidate poll ranking and preference signals", () => {
    const summary = buildManageResultSummary(
      buildScheduleResponse({
        schedule: {
          ...buildScheduleResponse().schedule,
          scheduleMode: "candidate_poll"
        },
        results: {
          totalParticipantCount: 3,
          slotResults: [
            buildSlot({
              candidateTimeOptionId: "option-a",
              label: "Option A",
              localStartDate: "2026-08-03",
              localStartTime: "18:00",
              localEndTime: "19:00",
              availableParticipantCount: 1,
              availableParticipantIds: ["participant-1"],
              firstPreferenceParticipantCount: 1,
              firstPreferenceParticipantIds: ["participant-1"],
              maybeParticipantCount: 2,
              maybeParticipantIds: ["participant-2", "participant-3"],
              preferenceRankCount: 3,
              preferenceRankSum: 6
            }),
            buildSlot({
              candidateTimeOptionId: "option-b",
              label: "Option B",
              localStartDate: "2026-08-04",
              localStartTime: "19:00",
              localEndTime: "20:00",
              availableParticipantCount: 1,
              availableParticipantIds: ["participant-2"],
              firstPreferenceParticipantCount: 2,
              firstPreferenceParticipantIds: ["participant-2", "participant-3"],
              maybeParticipantCount: 2,
              maybeParticipantIds: ["participant-1", "participant-3"],
              preferenceRankCount: 3,
              preferenceRankSum: 4
            })
          ],
          everyoneAvailableSlots: [],
          everyoneAvailableBlocks: [],
          rankedSlots: []
        }
      })
    );

    expect(summary).toContain(
      "当前最佳候选：Option B（2026-08-04 19:00-20:00）：1/3 可用，2 也许，综合支持 67%，首选 2，平均顺位 #1.3"
    );
    expect(summary).toContain(
      "2. Option A（2026-08-03 18:00-19:00）：1/3 可用，2 也许，综合支持 67%，首选 1，平均顺位 #2"
    );
  });

  it("keeps an empty-participant summary actionable", () => {
    const summary = buildManageResultSummary(
      buildScheduleResponse({
        participants: [],
        results: {
          totalParticipantCount: 0,
          slotResults: [buildSlot({ availableParticipantCount: 0, availableParticipantIds: [] })],
          everyoneAvailableSlots: [],
          everyoneAvailableBlocks: [],
          rankedSlots: []
        }
      })
    );

    expect(summary).toContain("状态：开放中 · 参与者：0 人");
    expect(summary).toContain("开放网格：等待参与者提交可用时间。");
  });

  it("summarizes ranked slots in English", () => {
    const summary = buildManageResultSummary(
      buildScheduleResponse({
        results: {
          totalParticipantCount: 3,
          slotResults: [],
          everyoneAvailableSlots: [],
          everyoneAvailableBlocks: [],
          rankedSlots: [
            buildSlot({
              localStartTime: "09:00",
              availableParticipantCount: 2,
              availableParticipantIds: ["participant-1", "participant-3"]
            })
          ]
        }
      }),
      "en"
    );

    expect(summary).toContain("Schedule: Team dinner");
    expect(summary).toContain("Status: Open · Participants: 3");
    expect(summary).toContain("No time works for everyone yet. Stronger current slots (top 3):");
    expect(summary).toContain(
      "1. 2026-08-01 09:00-09:30: 2/3 people available (Ada, Lin); not selected: Grace"
    );
  });

  it("includes the confirmed final time when one has been selected", () => {
    const summary = buildManageResultSummary(
      buildScheduleResponse({
        schedule: {
          ...buildScheduleResponse().schedule,
          finalTime: buildSlot({
            localStartDate: "2026-08-02",
            localStartTime: "11:00",
            localEndTime: "12:00"
          })
        }
      })
    );

    expect(summary).toContain("已确认最终时间：2026-08-02 11:00-12:00");
  });
});

describe("buildManageRankedSlotCopyText", () => {
  it("builds shareable copy for a ranked availability-grid slot", () => {
    const text = buildManageRankedSlotCopyText({
      participants,
      scheduleTitle: "Team dinner",
      slot: buildSlot({
        localStartTime: "09:00",
        availableParticipantCount: 2,
        availableParticipantIds: ["participant-1", "participant-3"]
      }),
      totalParticipantCount: 3
    });

    expect(text).toBe(
      [
        "日程：Team dinner",
        "备选时间：2026-08-01 09:00-09:30",
        "可用：2/3 人",
        "方便：Ada、Lin",
        "未选此时间：Grace"
      ].join("\n")
    );
  });

  it("omits the unavailable line when everyone selected the slot", () => {
    const text = buildManageRankedSlotCopyText({
      participants: participants.slice(0, 2),
      scheduleTitle: "Team dinner",
      slot: buildSlot({
        availableParticipantCount: 2,
        availableParticipantIds: ["participant-1", "participant-2"]
      }),
      totalParticipantCount: 2
    });

    expect(text).toContain("方便：Ada、Grace");
    expect(text).not.toContain("未选此时间");
  });

  it("builds English shareable copy for a ranked availability-grid slot", () => {
    const text = buildManageRankedSlotCopyText({
      locale: "en",
      participants,
      scheduleTitle: "Team dinner",
      slot: buildSlot({
        localStartTime: "09:00",
        availableParticipantCount: 2,
        availableParticipantIds: ["participant-1", "participant-3"]
      }),
      totalParticipantCount: 3
    });

    expect(text).toBe(
      [
        "Schedule: Team dinner",
        "Candidate time: 2026-08-01 09:00-09:30",
        "Available: 2/3 people",
        "Available: Ada, Lin",
        "Not selected for this time: Grace"
      ].join("\n")
    );
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
