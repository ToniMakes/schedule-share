import { describe, expect, it } from "vitest";

import type { AvailabilityPreviewResponse } from "@schedule-share/api-client";

import {
  buildPreviewBusyBlockSummaries,
  collectPreviewWarnings,
  previewConfidenceText,
  toUserPreviewWarning
} from "./availability-import-preview";

describe("buildPreviewBusyBlockSummaries", () => {
  it("formats parsed busy blocks for review", () => {
    expect(
      buildPreviewBusyBlockSummaries(
        buildPreviewResponse({
          busyBlocks: [
            {
              sourceLabel: "高数",
              localDate: "2026-08-03",
              dayOfWeek: 1,
              startTime: "08:30",
              endTime: "10:10",
              timezone: "Asia/Shanghai",
              confidence: 0.75,
              warnings: ['Imported busy block "高数" did not overlap any selectable schedule slot.']
            }
          ]
        })
      )
    ).toEqual([
      {
        confidenceText: "置信度 75% 中",
        dateText: "2026/8/3 · 周一",
        key: "0-高数-2026-08-03-1-08:30-10:10",
        timeText: "08:30-10:10",
        title: "高数",
        warnings: ["不在当前日程可选范围内：高数"]
      }
    ]);
  });

  it("uses fallback labels when the source does not include a name or date", () => {
    expect(
      buildPreviewBusyBlockSummaries(
        buildPreviewResponse({
          busyBlocks: [
            {
              startTime: "09:00",
              endTime: "10:00",
              timezone: "Australia/Sydney"
            }
          ]
        })
      )[0]
    ).toMatchObject({
      dateText: "日期未识别",
      timeText: "09:00-10:00",
      title: "忙碌时段 1"
    });
  });

  it("formats parsed busy blocks in English", () => {
    expect(
      buildPreviewBusyBlockSummaries(
        buildPreviewResponse({
          busyBlocks: [
            {
              sourceLabel: "Algebra",
              localDate: "2026-08-03",
              dayOfWeek: 1,
              startTime: "08:30",
              endTime: "10:10",
              timezone: "Australia/Sydney",
              confidence: 0.75,
              warnings: [
                'Imported busy block "Algebra" did not overlap any selectable schedule slot.'
              ]
            }
          ]
        }),
        "en"
      )
    ).toEqual([
      {
        confidenceText: "Confidence 75% medium",
        dateText: "2026/8/3 · Mon",
        key: "0-Algebra-2026-08-03-1-08:30-10:10",
        timeText: "08:30-10:10",
        title: "Algebra",
        warnings: ["Outside this schedule's selectable range: Algebra"]
      }
    ]);
  });
});

describe("collectPreviewWarnings", () => {
  it("translates and deduplicates preview-level and block-level warnings", () => {
    const warning =
      "Class periods were interpreted using the default timetable; review if your school uses different period times.";

    expect(
      collectPreviewWarnings(
        buildPreviewResponse({
          warnings: [warning],
          busyBlocks: [
            {
              sourceLabel: "物理",
              dayOfWeek: 1,
              startTime: "10:00",
              endTime: "11:40",
              timezone: "Asia/Shanghai",
              warnings: [warning]
            }
          ]
        })
      )
    ).toEqual(["课程节次已按默认作息表换算，请确认你的学校节次时间是否一致。"]);
  });

  it("translates and deduplicates warnings in English", () => {
    const warning =
      "Class periods were interpreted using the default timetable; review if your school uses different period times.";

    expect(
      collectPreviewWarnings(
        buildPreviewResponse({
          warnings: [warning],
          busyBlocks: [
            {
              sourceLabel: "Physics",
              dayOfWeek: 1,
              startTime: "10:00",
              endTime: "11:40",
              timezone: "Australia/Sydney",
              warnings: [warning]
            }
          ]
        }),
        "en"
      )
    ).toEqual([
      "Class periods were interpreted using the default timetable. Review if your school uses different period times."
    ]);
  });
});

describe("previewConfidenceText", () => {
  it("labels confidence bands", () => {
    expect(previewConfidenceText(undefined)).toBeUndefined();
    expect(previewConfidenceText(0.91)).toBe("置信度 91% 高");
    expect(previewConfidenceText(0.72)).toBe("置信度 72% 中");
    expect(previewConfidenceText(0.42)).toBe("置信度 42% 低");
  });

  it("labels confidence bands in English", () => {
    expect(previewConfidenceText(undefined, "en")).toBeUndefined();
    expect(previewConfidenceText(0.91, "en")).toBe("Confidence 91% high");
    expect(previewConfidenceText(0.72, "en")).toBe("Confidence 72% medium");
    expect(previewConfidenceText(0.42, "en")).toBe("Confidence 42% low");
  });
});

describe("toUserPreviewWarning", () => {
  it("translates template projection warnings", () => {
    expect(
      toUserPreviewWarning(
        "Template window 2 18:00-21:00 did not include any selectable schedule slot."
      )
    ).toBe("模板窗口 周二 18:00-21:00 不在当前日程可选范围内。");
    expect(toUserPreviewWarning("Template did not match any selectable schedule slot.")).toBe(
      "模板没有匹配任何当前日程可选时间。"
    );
  });

  it("keeps unknown warnings visible", () => {
    expect(toUserPreviewWarning("Custom provider warning")).toBe("Custom provider warning");
  });

  it("translates template projection warnings in English", () => {
    expect(
      toUserPreviewWarning(
        "Template window 2 18:00-21:00 did not include any selectable schedule slot.",
        "en"
      )
    ).toBe("Template window Tue 18:00-21:00 is outside this schedule's selectable range.");
    expect(toUserPreviewWarning("Template did not match any selectable schedule slot.", "en")).toBe(
      "The template did not match any selectable schedule slot."
    );
  });
});

function buildPreviewResponse(
  overrides: Partial<AvailabilityPreviewResponse> = {}
): AvailabilityPreviewResponse {
  return {
    entryMethod: overrides.entryMethod ?? "text_import",
    busyBlocks: overrides.busyBlocks ?? [],
    availableSlots: overrides.availableSlots ?? [],
    warnings: overrides.warnings ?? [],
    ...(overrides.confidence === undefined ? {} : { confidence: overrides.confidence })
  };
}
