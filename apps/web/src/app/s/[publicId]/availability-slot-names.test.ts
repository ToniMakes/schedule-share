import { describe, expect, it } from "vitest";

import type { ParticipantSummary } from "@schedule-share/api-client";

import {
  formatAvailableParticipantNames,
  formatUnavailableParticipantNames
} from "./availability-slot-names";

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

describe("formatAvailableParticipantNames", () => {
  it("formats available participant ids in slot order", () => {
    expect(formatAvailableParticipantNames(["participant-3", "participant-1"], participants)).toBe(
      "Lin、Ada"
    );
  });

  it("keeps unknown participant ids visible", () => {
    expect(formatAvailableParticipantNames(["missing"], participants)).toBe("未知参与者");
  });

  it("returns empty text when nobody selected the slot", () => {
    expect(formatAvailableParticipantNames([], participants)).toBe("");
  });
});

describe("formatUnavailableParticipantNames", () => {
  it("lists participants who did not select the slot", () => {
    expect(formatUnavailableParticipantNames(["participant-1"], participants)).toBe("Grace、Lin");
  });

  it("returns empty text when everyone selected the slot", () => {
    expect(
      formatUnavailableParticipantNames(
        ["participant-1", "participant-2", "participant-3"],
        participants
      )
    ).toBe("");
  });
});
