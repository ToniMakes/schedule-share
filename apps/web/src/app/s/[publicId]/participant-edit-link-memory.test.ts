import { describe, expect, it } from "vitest";

import {
  PARTICIPANT_EDIT_LINKS_STORAGE_KEY,
  normalizeRememberedParticipantEditLink,
  readRememberedParticipantEditLink,
  rememberParticipantEditLink
} from "./participant-edit-link-memory";

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

describe("participant edit link memory", () => {
  it("normalizes valid remembered edit links", () => {
    expect(
      normalizeRememberedParticipantEditLink({
        displayName: "  Ada  ",
        editUrl: "https://example.com/s/schedule-1/edit/participant-1?key=secret",
        participantId: "participant-1",
        publicId: "schedule-1",
        rememberedAt: "2026-08-01T10:20:30.000Z"
      })
    ).toEqual({
      displayName: "Ada",
      editUrl: "https://example.com/s/schedule-1/edit/participant-1?key=secret",
      participantId: "participant-1",
      publicId: "schedule-1",
      rememberedAt: "2026-08-01T10:20:30.000Z"
    });
  });

  it("normalizes valid remembered Chinese edit links", () => {
    expect(
      normalizeRememberedParticipantEditLink({
        displayName: "  Ada  ",
        editUrl: "https://example.com/zh/s/schedule-1/edit/participant-1?key=secret",
        participantId: "participant-1",
        publicId: "schedule-1",
        rememberedAt: "2026-08-01T10:20:30.000Z"
      })
    ).toEqual({
      displayName: "Ada",
      editUrl: "https://example.com/zh/s/schedule-1/edit/participant-1?key=secret",
      participantId: "participant-1",
      publicId: "schedule-1",
      rememberedAt: "2026-08-01T10:20:30.000Z"
    });
  });

  it("rejects edit links that do not match the participant path", () => {
    expect(
      normalizeRememberedParticipantEditLink({
        displayName: "Ada",
        editUrl: "https://example.com/s/schedule-1/edit/other-participant?key=secret",
        participantId: "participant-1",
        publicId: "schedule-1",
        rememberedAt: "2026-08-01T10:20:30.000Z"
      })
    ).toBeUndefined();
  });

  it("does not treat a longer participant path as a match", () => {
    expect(
      normalizeRememberedParticipantEditLink({
        displayName: "Ada",
        editUrl: "https://example.com/s/schedule-1/edit/participant-12?key=secret",
        participantId: "participant-1",
        publicId: "schedule-1",
        rememberedAt: "2026-08-01T10:20:30.000Z"
      })
    ).toBeUndefined();
  });

  it("stores and reads one edit link by schedule public id", () => {
    const storage = new MemoryStorage();

    rememberParticipantEditLink(storage, {
      displayName: "Mira",
      editUrl: "https://example.com/s/schedule-1/edit/participant-1?key=secret",
      participantId: "participant-1",
      publicId: "schedule-1",
      rememberedAt: "2026-08-01T10:20:30.000Z"
    });

    expect(readRememberedParticipantEditLink(storage, "schedule-1")).toMatchObject({
      displayName: "Mira",
      participantId: "participant-1",
      publicId: "schedule-1"
    });
    expect(readRememberedParticipantEditLink(storage, "schedule-2")).toBeUndefined();
  });

  it("cleans invalid stored json", () => {
    const storage = new MemoryStorage();
    storage.setItem(PARTICIPANT_EDIT_LINKS_STORAGE_KEY, "{bad");

    expect(readRememberedParticipantEditLink(storage, "schedule-1")).toBeUndefined();
    expect(storage.getItem(PARTICIPANT_EDIT_LINKS_STORAGE_KEY)).toBeNull();
  });

  it("drops invalid entries while keeping valid entries", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PARTICIPANT_EDIT_LINKS_STORAGE_KEY,
      JSON.stringify({
        "schedule-1": {
          displayName: "Ada",
          editUrl: "https://example.com/s/schedule-1/edit/participant-1?key=secret",
          participantId: "participant-1",
          publicId: "schedule-1",
          rememberedAt: "2026-08-01T10:20:30.000Z"
        },
        "schedule-2": {
          displayName: "Mira",
          editUrl: "not a url",
          participantId: "participant-2",
          publicId: "schedule-2",
          rememberedAt: "2026-08-01T10:20:30.000Z"
        }
      })
    );

    expect(readRememberedParticipantEditLink(storage, "schedule-1")?.displayName).toBe("Ada");
    expect(readRememberedParticipantEditLink(storage, "schedule-2")).toBeUndefined();
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

    expect(readRememberedParticipantEditLink(storage, "schedule-1")).toBeUndefined();
    expect(() =>
      rememberParticipantEditLink(storage, {
        displayName: "Aki",
        editUrl: "https://example.com/s/schedule-1/edit/participant-1?key=secret",
        participantId: "participant-1",
        publicId: "schedule-1"
      })
    ).not.toThrow();
  });
});
