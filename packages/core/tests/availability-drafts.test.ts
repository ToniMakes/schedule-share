import { describe, expect, it } from "vitest";

import {
  CoreError,
  createAvailabilityDraftFromAvailableSlots,
  createAvailabilityDraftFromBusyBlocks,
  createAvailabilityDraftFromTemplate,
  generateTimeSlots
} from "../src";
import type { TimeSlotConfig } from "../src";

describe("createAvailabilityDraftFromBusyBlocks", () => {
  it("subtracts explicit busy blocks from generated schedule slots", () => {
    const config = buildConfig();
    const draft = createAvailabilityDraftFromBusyBlocks({
      config,
      entryMethod: "text_import",
      busyBlocks: [
        {
          sourceLabel: "COMP101",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.9
        }
      ],
      confidence: 0.9
    });

    expect(draft.entryMethod).toBe("text_import");
    expect(draft.confidence).toBe(0.9);
    expect(draft.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-07-31T23:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
    expect(draft.warnings).toEqual([]);
  });

  it("projects weekly busy blocks in their own timezone before subtracting schedule slots", () => {
    const draft = createAvailabilityDraftFromBusyBlocks({
      config: {
        timezone: "Australia/Sydney",
        dateRange: {
          start: "2026-08-03",
          end: "2026-08-03"
        },
        slotMinutes: 60,
        dailyWindows: [
          {
            startTime: "10:00",
            endTime: "13:00"
          }
        ]
      },
      entryMethod: "text_import",
      busyBlocks: [
        {
          sourceLabel: "Shanghai class",
          dayOfWeek: 1,
          startTime: "08:00",
          endTime: "09:00",
          timezone: "Asia/Shanghai"
        }
      ]
    });

    expect(draft.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-08-03T01:00:00.000Z",
      "2026-08-03T02:00:00.000Z"
    ]);
  });

  it("treats cross-midnight busy blocks as one real-time interval", () => {
    const draft = createAvailabilityDraftFromBusyBlocks({
      config: {
        timezone: "Australia/Sydney",
        dateRange: {
          start: "2026-08-01",
          end: "2026-08-01"
        },
        slotMinutes: 60,
        dailyWindows: [
          {
            startTime: "22:00",
            endTime: "02:00"
          }
        ]
      },
      entryMethod: "text_import",
      busyBlocks: [
        {
          sourceLabel: "Night shift",
          localDate: "2026-08-01",
          startTime: "23:00",
          endTime: "01:00",
          timezone: "Australia/Sydney"
        }
      ]
    });

    expect(draft.availableSlots.map((slot) => `${slot.startUtc}/${slot.endUtc}`)).toEqual([
      "2026-08-01T12:00:00.000Z/2026-08-01T13:00:00.000Z",
      "2026-08-01T15:00:00.000Z/2026-08-01T16:00:00.000Z"
    ]);
  });

  it("warns about imported blocks that cannot be mapped to schedule slots", () => {
    const draft = createAvailabilityDraftFromBusyBlocks({
      config: buildConfig(),
      entryMethod: "text_import",
      busyBlocks: [
        {
          sourceLabel: "No date",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney"
        },
        {
          sourceLabel: "Outside range",
          localDate: "2026-08-05",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney"
        }
      ]
    });

    expect(draft.availableSlots).toHaveLength(4);
    expect(draft.warnings).toContain(
      'Imported busy block "No date" is missing a local date or day of week.'
    );
    expect(draft.warnings).toContain(
      'Imported busy block "Outside range" did not overlap any selectable schedule slot.'
    );
  });

  it("accepts CSV imports as busy block draft sources", () => {
    const draft = createAvailabilityDraftFromBusyBlocks({
      config: buildConfig(),
      entryMethod: "csv_import",
      busyBlocks: [
        {
          sourceLabel: "CSV shift",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney"
        }
      ]
    });

    expect(draft.entryMethod).toBe("csv_import");
    expect(draft.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-07-31T23:00:00.000Z",
      "2026-08-01T00:30:00.000Z"
    ]);
  });

  it("rejects unsupported entry methods for busy block imports", () => {
    expect(() =>
      createAvailabilityDraftFromBusyBlocks({
        config: buildConfig(),
        entryMethod: "manual_grid",
        busyBlocks: []
      })
    ).toThrow(CoreError);
  });
});

describe("createAvailabilityDraftFromAvailableSlots", () => {
  it("normalizes, deduplicates, and validates selected available slots", () => {
    const slots = generateTimeSlots(buildConfig());
    const draft = createAvailabilityDraftFromAvailableSlots({
      config: buildConfig(),
      entryMethod: "manual_grid",
      availableSlots: [slots[1]!, slots[0]!, slots[1]!],
      warnings: ["Already checked"]
    });

    expect(draft.availableSlots).toEqual([
      {
        startUtc: slots[0]!.startUtc,
        endUtc: slots[0]!.endUtc
      },
      {
        startUtc: slots[1]!.startUtc,
        endUtc: slots[1]!.endUtc
      }
    ]);
    expect(draft.warnings).toEqual(["Already checked"]);
  });

  it("rejects available slots outside the schedule", () => {
    expect(() =>
      createAvailabilityDraftFromAvailableSlots({
        config: buildConfig(),
        entryMethod: "manual_grid",
        availableSlots: [
          {
            startUtc: "2026-08-01T04:00:00.000Z",
            endUtc: "2026-08-01T04:30:00.000Z"
          }
        ]
      })
    ).toThrow(CoreError);
  });
});

describe("createAvailabilityDraftFromTemplate", () => {
  it("projects weekly availability windows onto matching schedule slots", () => {
    const draft = createAvailabilityDraftFromTemplate({
      config: buildConfig(),
      template: {
        name: "Weekend mornings",
        timezone: "Australia/Sydney",
        weeklyWindows: [
          {
            dayOfWeek: 6,
            startTime: "09:30",
            endTime: "10:30"
          }
        ]
      }
    });

    expect(draft.entryMethod).toBe("template");
    expect(draft.busyBlocks).toEqual([]);
    expect(draft.availableSlots.map((slot) => slot.startUtc)).toEqual([
      "2026-07-31T23:30:00.000Z",
      "2026-08-01T00:00:00.000Z"
    ]);
    expect(draft.warnings).toEqual([]);
  });

  it("interprets weekly template windows in the template timezone", () => {
    const draft = createAvailabilityDraftFromTemplate({
      config: {
        timezone: "Australia/Sydney",
        dateRange: {
          start: "2026-08-03",
          end: "2026-08-03"
        },
        slotMinutes: 60,
        dailyWindows: [
          {
            startTime: "10:00",
            endTime: "13:00"
          }
        ]
      },
      template: {
        timezone: "Asia/Shanghai",
        weeklyWindows: [
          {
            dayOfWeek: 1,
            startTime: "08:00",
            endTime: "09:00"
          }
        ]
      }
    });

    expect(draft.availableSlots.map((slot) => `${slot.startUtc}/${slot.endUtc}`)).toEqual([
      "2026-08-03T00:00:00.000Z/2026-08-03T01:00:00.000Z"
    ]);
  });

  it("supports cross-midnight weekly template windows", () => {
    const draft = createAvailabilityDraftFromTemplate({
      config: {
        timezone: "Australia/Sydney",
        dateRange: {
          start: "2026-08-01",
          end: "2026-08-01"
        },
        slotMinutes: 60,
        dailyWindows: [
          {
            startTime: "22:00",
            endTime: "02:00"
          }
        ]
      },
      template: {
        timezone: "Australia/Sydney",
        weeklyWindows: [
          {
            dayOfWeek: 6,
            startTime: "23:00",
            endTime: "01:00"
          }
        ]
      }
    });

    expect(draft.availableSlots.map((slot) => `${slot.startUtc}/${slot.endUtc}`)).toEqual([
      "2026-08-01T13:00:00.000Z/2026-08-01T14:00:00.000Z",
      "2026-08-01T14:00:00.000Z/2026-08-01T15:00:00.000Z"
    ]);
  });

  it("requires schedule slots to fit fully inside template windows", () => {
    const draft = createAvailabilityDraftFromTemplate({
      config: buildConfig(),
      template: {
        timezone: "Australia/Sydney",
        weeklyWindows: [
          {
            dayOfWeek: 6,
            startTime: "09:15",
            endTime: "09:45"
          }
        ]
      }
    });

    expect(draft.availableSlots).toEqual([]);
    expect(draft.warnings).toContain(
      "Template window 6 09:15-09:45 did not include any selectable schedule slot."
    );
    expect(draft.warnings).toContain("Template did not match any selectable schedule slot.");
  });

  it("rejects invalid template windows", () => {
    expect(() =>
      createAvailabilityDraftFromTemplate({
        config: buildConfig(),
        template: {
          timezone: "Australia/Sydney",
          weeklyWindows: [
            {
              dayOfWeek: 6,
              startTime: "09:00",
              endTime: "09:00"
            }
          ]
        }
      })
    ).toThrow(CoreError);
  });
});

function buildConfig(): TimeSlotConfig {
  return {
    timezone: "Australia/Sydney",
    dateRange: {
      start: "2026-08-01",
      end: "2026-08-01"
    },
    slotMinutes: 30,
    dailyWindows: [
      {
        startTime: "09:00",
        endTime: "11:00"
      }
    ]
  };
}
