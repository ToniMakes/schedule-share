import { describe, expect, it } from "vitest";

import {
  CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY,
  normalizeRememberedScheduleFormDefaults,
  readRememberedScheduleFormDefaults,
  rememberScheduleFormDefaults
} from "./schedule-form-memory";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("schedule form memory", () => {
  it("normalizes valid schedule form defaults", () => {
    expect(
      normalizeRememberedScheduleFormDefaults({
        availabilityGrid: {
          daysOfWeek: [5, 1, 1, 7, 0],
          endTime: "21:00",
          startTime: "18:00"
        },
        scheduleMode: "availability_grid",
        slotMinutes: 60,
        timezone: "  Asia/Tokyo  "
      })
    ).toEqual({
      availabilityGrid: {
        daysOfWeek: [1, 5, 0],
        endTime: "21:00",
        startTime: "18:00"
      },
      scheduleMode: "availability_grid",
      slotMinutes: 60,
      timezone: "Asia/Tokyo"
    });
  });

  it("ignores invalid default fields and keeps valid ones", () => {
    expect(
      normalizeRememberedScheduleFormDefaults({
        availabilityGrid: {
          daysOfWeek: ["Mon", 2],
          endTime: "24:00",
          startTime: "09:30"
        },
        scheduleMode: "surprise",
        slotMinutes: 45,
        timezone: ""
      })
    ).toEqual({
      availabilityGrid: {
        daysOfWeek: [2],
        startTime: "09:30"
      }
    });
  });

  it("returns undefined when no valid defaults remain", () => {
    expect(
      normalizeRememberedScheduleFormDefaults({
        availabilityGrid: {
          daysOfWeek: [],
          endTime: "nope",
          startTime: "soon"
        },
        scheduleMode: "unknown",
        slotMinutes: 10,
        timezone: "a".repeat(101)
      })
    ).toBeUndefined();
  });

  it("reads and writes remembered defaults", () => {
    const storage = new MemoryStorage();

    rememberScheduleFormDefaults(storage, {
      availabilityGrid: {
        daysOfWeek: [1, 3],
        endTime: "17:00",
        startTime: "10:00"
      },
      scheduleMode: "candidate_poll",
      slotMinutes: 15,
      timezone: "Australia/Sydney"
    });

    expect(readRememberedScheduleFormDefaults(storage)).toEqual({
      availabilityGrid: {
        daysOfWeek: [1, 3],
        endTime: "17:00",
        startTime: "10:00"
      },
      scheduleMode: "candidate_poll",
      slotMinutes: 15,
      timezone: "Australia/Sydney"
    });
  });

  it("removes invalid stored JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY, "{");

    expect(readRememberedScheduleFormDefaults(storage)).toBeUndefined();
    expect(storage.getItem(CREATE_SCHEDULE_FORM_DEFAULTS_STORAGE_KEY)).toBeNull();
  });

  it("ignores unavailable storage", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      }
    };

    expect(readRememberedScheduleFormDefaults(storage)).toBeUndefined();
    expect(() =>
      rememberScheduleFormDefaults(storage, {
        timezone: "Asia/Tokyo"
      })
    ).not.toThrow();
  });
});
