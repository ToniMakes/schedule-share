import { describe, expect, it } from "vitest";

import {
  PARTICIPANT_DISPLAY_NAME_STORAGE_KEY,
  normalizeRememberedParticipantDisplayName,
  readRememberedParticipantDisplayName,
  rememberParticipantDisplayName
} from "./participant-name-memory";

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

describe("participant name memory", () => {
  it("normalizes remembered participant names", () => {
    expect(normalizeRememberedParticipantDisplayName("  Aki  ")).toBe("Aki");
    expect(normalizeRememberedParticipantDisplayName("   ")).toBeUndefined();
    expect(normalizeRememberedParticipantDisplayName("a".repeat(81))).toBeUndefined();
  });

  it("reads a valid remembered participant name", () => {
    const storage = new MemoryStorage();
    storage.setItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY, "  Ada  ");

    expect(readRememberedParticipantDisplayName(storage)).toBe("Ada");
  });

  it("removes invalid remembered participant names", () => {
    const storage = new MemoryStorage();
    storage.setItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY, "a".repeat(81));

    expect(readRememberedParticipantDisplayName(storage)).toBeUndefined();
    expect(storage.getItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY)).toBeNull();
  });

  it("stores a normalized participant name after successful submission", () => {
    const storage = new MemoryStorage();

    rememberParticipantDisplayName(storage, "  Mira  ");

    expect(storage.getItem(PARTICIPANT_DISPLAY_NAME_STORAGE_KEY)).toBe("Mira");
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

    expect(readRememberedParticipantDisplayName(storage)).toBeUndefined();
    expect(() => rememberParticipantDisplayName(storage, "Aki")).not.toThrow();
  });
});
