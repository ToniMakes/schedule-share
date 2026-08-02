import { describe, expect, it } from "vitest";

import {
  MAX_SAVED_PARTICIPANT_TEMPLATES,
  PARTICIPANT_TEMPLATE_STORAGE_KEY,
  SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY,
  deleteSavedParticipantTemplate,
  normalizeRememberedParticipantTemplate,
  normalizeSavedParticipantTemplate,
  readRememberedParticipantTemplate,
  readSavedParticipantTemplates,
  rememberParticipantTemplate,
  saveParticipantTemplate
} from "./participant-template-memory";

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

describe("participant template memory", () => {
  it("normalizes a valid remembered weekly template", () => {
    expect(
      normalizeRememberedParticipantTemplate({
        daysOfWeek: [0, 2, 1, 2],
        endTime: " 20:30 ",
        startTime: " 18:00 "
      })
    ).toEqual({
      daysOfWeek: [1, 2, 0],
      endTime: "20:30",
      startTime: "18:00"
    });
  });

  it("rejects invalid remembered weekly templates", () => {
    expect(
      normalizeRememberedParticipantTemplate({
        daysOfWeek: [],
        endTime: "20:30",
        startTime: "18:00"
      })
    ).toBeUndefined();
    expect(
      normalizeRememberedParticipantTemplate({
        daysOfWeek: [1, 2],
        endTime: "18:00",
        startTime: "18:00"
      })
    ).toBeUndefined();
    expect(
      normalizeRememberedParticipantTemplate({
        daysOfWeek: [1, 2],
        endTime: "25:00",
        startTime: "18:00"
      })
    ).toBeUndefined();
  });

  it("stores and reads a remembered weekly template", () => {
    const storage = new MemoryStorage();

    rememberParticipantTemplate(storage, {
      daysOfWeek: [6, 0],
      endTime: "17:00",
      startTime: "13:00"
    });

    expect(readRememberedParticipantTemplate(storage)).toEqual({
      daysOfWeek: [6, 0],
      endTime: "17:00",
      startTime: "13:00"
    });
  });

  it("cleans invalid stored json", () => {
    const storage = new MemoryStorage();
    storage.setItem(PARTICIPANT_TEMPLATE_STORAGE_KEY, "{bad");

    expect(readRememberedParticipantTemplate(storage)).toBeUndefined();
    expect(storage.getItem(PARTICIPANT_TEMPLATE_STORAGE_KEY)).toBeNull();
  });

  it("removes invalid stored templates", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PARTICIPANT_TEMPLATE_STORAGE_KEY,
      JSON.stringify({
        daysOfWeek: [1, 2],
        endTime: "18:00",
        startTime: "18:00"
      })
    );

    expect(readRememberedParticipantTemplate(storage)).toBeUndefined();
    expect(storage.getItem(PARTICIPANT_TEMPLATE_STORAGE_KEY)).toBeNull();
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

    expect(readRememberedParticipantTemplate(storage)).toBeUndefined();
    expect(() =>
      rememberParticipantTemplate(storage, {
        daysOfWeek: [1, 2],
        endTime: "20:00",
        startTime: "18:00"
      })
    ).not.toThrow();
  });

  it("normalizes a saved weekly template", () => {
    expect(
      normalizeSavedParticipantTemplate({
        daysOfWeek: [0, 2, 1, 2],
        endTime: " 20:30 ",
        id: " saved-template ",
        name: "  工作日   晚上  ",
        startTime: " 18:00 "
      })
    ).toEqual({
      daysOfWeek: [1, 2, 0],
      endTime: "20:30",
      id: "saved-template",
      name: "工作日 晚上",
      startTime: "18:00"
    });
  });

  it("rejects invalid saved weekly templates", () => {
    expect(
      normalizeSavedParticipantTemplate({
        daysOfWeek: [1],
        endTime: "20:30",
        id: "",
        name: "工作日晚上",
        startTime: "18:00"
      })
    ).toBeUndefined();
    expect(
      normalizeSavedParticipantTemplate({
        daysOfWeek: [1],
        endTime: "20:30",
        id: "weekday",
        name: " ",
        startTime: "18:00"
      })
    ).toBeUndefined();
  });

  it("stores saved templates with newest first and updates by id", () => {
    const storage = new MemoryStorage();

    expect(
      saveParticipantTemplate(storage, {
        daysOfWeek: [1, 2, 3, 4, 5],
        endTime: "21:00",
        id: "weekday",
        name: "工作日晚上",
        startTime: "18:00"
      })
    ).toEqual([
      {
        daysOfWeek: [1, 2, 3, 4, 5],
        endTime: "21:00",
        id: "weekday",
        name: "工作日晚上",
        startTime: "18:00"
      }
    ]);

    expect(
      saveParticipantTemplate(storage, {
        daysOfWeek: [6, 0],
        endTime: "17:00",
        id: "weekend",
        name: "周末下午",
        startTime: "13:00"
      })
    ).toEqual([
      {
        daysOfWeek: [6, 0],
        endTime: "17:00",
        id: "weekend",
        name: "周末下午",
        startTime: "13:00"
      },
      {
        daysOfWeek: [1, 2, 3, 4, 5],
        endTime: "21:00",
        id: "weekday",
        name: "工作日晚上",
        startTime: "18:00"
      }
    ]);

    expect(
      saveParticipantTemplate(storage, {
        daysOfWeek: [2, 4],
        endTime: "20:00",
        id: "weekday",
        name: "周二周四",
        startTime: "19:00"
      })
    ).toEqual([
      {
        daysOfWeek: [2, 4],
        endTime: "20:00",
        id: "weekday",
        name: "周二周四",
        startTime: "19:00"
      },
      {
        daysOfWeek: [6, 0],
        endTime: "17:00",
        id: "weekend",
        name: "周末下午",
        startTime: "13:00"
      }
    ]);

    expect(readSavedParticipantTemplates(storage)).toEqual([
      {
        daysOfWeek: [2, 4],
        endTime: "20:00",
        id: "weekday",
        name: "周二周四",
        startTime: "19:00"
      },
      {
        daysOfWeek: [6, 0],
        endTime: "17:00",
        id: "weekend",
        name: "周末下午",
        startTime: "13:00"
      }
    ]);
  });

  it("limits saved templates and cleans invalid saved data", () => {
    const storage = new MemoryStorage();

    storage.setItem(
      SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY,
      JSON.stringify([
        {
          daysOfWeek: [1],
          endTime: "12:00",
          id: "keep",
          name: "保留",
          startTime: "10:00"
        },
        {
          daysOfWeek: [2],
          endTime: "12:00",
          id: "keep",
          name: "重复",
          startTime: "10:00"
        },
        {
          daysOfWeek: [],
          endTime: "12:00",
          id: "bad",
          name: "无效",
          startTime: "10:00"
        },
        ...Array.from({ length: MAX_SAVED_PARTICIPANT_TEMPLATES + 2 }, (_, index) => ({
          daysOfWeek: [1],
          endTime: "12:00",
          id: `template-${index}`,
          name: `模板 ${index}`,
          startTime: "10:00"
        }))
      ])
    );

    const savedTemplates = readSavedParticipantTemplates(storage);

    expect(savedTemplates).toHaveLength(MAX_SAVED_PARTICIPANT_TEMPLATES);
    expect(savedTemplates.map(({ id }) => id)).toEqual([
      "keep",
      ...Array.from(
        { length: MAX_SAVED_PARTICIPANT_TEMPLATES - 1 },
        (_, index) => `template-${index}`
      )
    ]);
  });

  it("removes invalid saved json", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY, "{bad");

    expect(readSavedParticipantTemplates(storage)).toEqual([]);
    expect(storage.getItem(SAVED_PARTICIPANT_TEMPLATES_STORAGE_KEY)).toBeNull();
  });

  it("deletes saved templates", () => {
    const storage = new MemoryStorage();

    saveParticipantTemplate(storage, {
      daysOfWeek: [1],
      endTime: "12:00",
      id: "morning",
      name: "上午",
      startTime: "09:00"
    });
    saveParticipantTemplate(storage, {
      daysOfWeek: [6],
      endTime: "17:00",
      id: "weekend",
      name: "周末",
      startTime: "13:00"
    });

    expect(deleteSavedParticipantTemplate(storage, "weekend")).toEqual([
      {
        daysOfWeek: [1],
        endTime: "12:00",
        id: "morning",
        name: "上午",
        startTime: "09:00"
      }
    ]);
  });
});
