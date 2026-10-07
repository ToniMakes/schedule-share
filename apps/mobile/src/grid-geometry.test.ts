import { describe, expect, it } from "vitest";
import { getSlotGridMetrics, getSlotIndexAtPoint } from "./grid-geometry";

describe("slot grid geometry", () => {
  it("maps touch coordinates to slots across rows", () => {
    const metrics = getSlotGridMetrics(300);
    expect(metrics.columns).toBe(4);
    expect(getSlotIndexAtPoint(0, 0, 12, metrics)).toBe(0);
    expect(getSlotIndexAtPoint(metrics.tileWidth + metrics.gap + 1, 0, 12, metrics)).toBe(1);
    expect(getSlotIndexAtPoint(0, metrics.tileHeight + metrics.gap + 1, 12, metrics)).toBe(4);
  });

  it("ignores gaps and coordinates outside the rendered slots", () => {
    const metrics = getSlotGridMetrics(220);
    expect(getSlotIndexAtPoint(metrics.tileWidth + 1, 2, 5, metrics)).toBeNull();
    expect(getSlotIndexAtPoint(-1, 2, 5, metrics)).toBeNull();
    expect(getSlotIndexAtPoint(0, 0, 0, metrics)).toBeNull();
  });
});
