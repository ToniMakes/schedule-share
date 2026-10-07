export interface SlotGridMetrics {
  readonly columns: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly gap: number;
}

export function getSlotGridMetrics(
  width: number,
  minTileWidth = 66,
  tileHeight = 52,
  gap = 7
): SlotGridMetrics {
  const safeWidth = Math.max(minTileWidth, width);
  const columns = Math.max(1, Math.floor((safeWidth + gap) / (minTileWidth + gap)));
  return {
    columns,
    tileWidth: (safeWidth - gap * (columns - 1)) / columns,
    tileHeight,
    gap
  };
}

export function getSlotIndexAtPoint(
  x: number,
  y: number,
  slotCount: number,
  metrics: SlotGridMetrics
): number | null {
  if (x < 0 || y < 0 || slotCount <= 0) return null;
  const columnStride = metrics.tileWidth + metrics.gap;
  const rowStride = metrics.tileHeight + metrics.gap;
  const column = Math.floor(x / columnStride);
  const row = Math.floor(y / rowStride);
  if (
    column >= metrics.columns ||
    x - column * columnStride >= metrics.tileWidth ||
    y - row * rowStride >= metrics.tileHeight
  ) {
    return null;
  }
  const index = row * metrics.columns + column;
  return index < slotCount ? index : null;
}
