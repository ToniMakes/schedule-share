import { describe, expect, it } from "vitest";

import {
  compactCandidatePreferenceRanks,
  reorderCandidatePreferenceRanks,
  selectedCandidatePreferenceKeys,
  updateCandidatePreferenceRanks
} from "./candidate-preferences";

const slots = [
  {
    startUtc: "2026-08-03T08:00:00.000Z",
    endUtc: "2026-08-03T09:00:00.000Z"
  },
  {
    startUtc: "2026-08-04T09:00:00.000Z",
    endUtc: "2026-08-04T10:00:00.000Z"
  },
  {
    startUtc: "2026-08-05T09:00:00.000Z",
    endUtc: "2026-08-05T10:00:00.000Z"
  }
];

describe("candidate preference helpers", () => {
  it("tracks selected available and maybe candidates as preference targets", () => {
    const selected = selectedCandidatePreferenceKeys(
      slots,
      new Map([
        [slotKey(0), "available"],
        [slotKey(1), "maybe"],
        [slotKey(2), "unavailable"]
      ])
    );

    expect([...selected]).toEqual([slotKey(0), slotKey(1)]);
  });

  it("appends candidates to the end of the compact preference order", () => {
    const activeKeys = new Set([slotKey(0), slotKey(1)]);
    const ranks = updateCandidatePreferenceRanks(
      new Map([[slotKey(0), 1]]),
      slots[1]!,
      activeKeys,
      "append"
    );

    expect([...ranks.entries()]).toEqual([
      [slotKey(0), 1],
      [slotKey(1), 2]
    ]);
  });

  it("moves candidates up and down without duplicate ranks", () => {
    const activeKeys = new Set([slotKey(0), slotKey(1), slotKey(2)]);
    const ranks = new Map([
      [slotKey(0), 1],
      [slotKey(1), 2],
      [slotKey(2), 3]
    ]);

    const movedUp = updateCandidatePreferenceRanks(ranks, slots[2]!, activeKeys, "up");
    const movedDown = updateCandidatePreferenceRanks(movedUp, slots[2]!, activeKeys, "down");

    expect([...movedUp.entries()]).toEqual([
      [slotKey(0), 1],
      [slotKey(2), 2],
      [slotKey(1), 3]
    ]);
    expect([...movedDown.entries()]).toEqual([
      [slotKey(0), 1],
      [slotKey(1), 2],
      [slotKey(2), 3]
    ]);
  });

  it("compacts preference ranks after a candidate becomes unavailable", () => {
    const ranks = compactCandidatePreferenceRanks(
      new Map([
        [slotKey(0), 1],
        [slotKey(1), 2],
        [slotKey(2), 3]
      ]),
      new Set([slotKey(0), slotKey(2)])
    );

    expect([...ranks.entries()]).toEqual([
      [slotKey(0), 1],
      [slotKey(2), 2]
    ]);
  });

  it("reorders ranked candidates by drag source and target", () => {
    const activeKeys = new Set([slotKey(0), slotKey(1), slotKey(2)]);
    const ranks = new Map([
      [slotKey(0), 1],
      [slotKey(1), 2],
      [slotKey(2), 3]
    ]);

    const movedToFront = reorderCandidatePreferenceRanks(ranks, slots[2]!, slots[0]!, activeKeys);
    const movedToEnd = reorderCandidatePreferenceRanks(
      movedToFront,
      slots[2]!,
      slots[1]!,
      activeKeys
    );

    expect([...movedToFront.entries()]).toEqual([
      [slotKey(2), 1],
      [slotKey(0), 2],
      [slotKey(1), 3]
    ]);
    expect([...movedToEnd.entries()]).toEqual([
      [slotKey(0), 1],
      [slotKey(1), 2],
      [slotKey(2), 3]
    ]);
  });

  it("ignores drag reorders for inactive candidates", () => {
    const ranks = new Map([
      [slotKey(0), 1],
      [slotKey(1), 2],
      [slotKey(2), 3]
    ]);

    const reordered = reorderCandidatePreferenceRanks(
      ranks,
      slots[2]!,
      slots[0]!,
      new Set([slotKey(0), slotKey(1)])
    );

    expect([...reordered.entries()]).toEqual([
      [slotKey(0), 1],
      [slotKey(1), 2]
    ]);
  });
});

function slotKey(index: number): string {
  return `${slots[index]!.startUtc}/${slots[index]!.endUtc}`;
}
