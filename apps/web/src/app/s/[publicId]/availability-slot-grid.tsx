"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
  type PointerEvent,
  type SetStateAction
} from "react";
import { CheckSquare, Eraser } from "lucide-react";

import type { TimeSlotDto } from "@schedule-share/api-client";

import styles from "./page.module.css";

type PaintMode = "select" | "clear";
type AvailabilityPickerView = "matrix" | "cards";

interface ActivePaintState {
  readonly mode: PaintMode;
  readonly pointerId: number;
  lastKey: string;
}

export type AvailabilityGridSlot = TimeSlotDto & {
  readonly availableParticipantCount?: number;
};

export interface AvailabilitySlotMatrixDay {
  readonly date: string;
  readonly slots: readonly AvailabilityGridSlot[];
}

export interface AvailabilitySlotMatrixRow {
  readonly endTime: string;
  readonly key: string;
  readonly label: string;
  readonly slotsByDate: ReadonlyMap<string, AvailabilityGridSlot>;
  readonly startTime: string;
}

interface AvailabilitySlotGridProps {
  readonly ariaLabel?: string;
  readonly selectedSlotKeys: ReadonlySet<string>;
  readonly setSelectedSlotKeys: Dispatch<SetStateAction<Set<string>>>;
  readonly slots: readonly AvailabilityGridSlot[];
  readonly totalParticipantCount?: number;
}

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"] as const;

export function AvailabilitySlotGrid({
  ariaLabel = "可用时间",
  selectedSlotKeys,
  setSelectedSlotKeys,
  slots,
  totalParticipantCount
}: AvailabilitySlotGridProps) {
  const [paintMode, setPaintMode] = useState<PaintMode | undefined>(undefined);
  const [pickerView, setPickerView] = useState<AvailabilityPickerView>("matrix");
  const activePaintRef = useRef<ActivePaintState | undefined>(undefined);
  const dayRefs = useRef(new Map<string, HTMLDivElement>());
  const suppressNextClickRef = useRef(false);
  const matrix = useMemo(() => buildAvailabilitySlotMatrix(slots), [slots]);
  const slotSummary = summarizeSlotGroups(matrix.days, selectedSlotKeys);
  const matrixStyle = useMemo<CSSProperties>(
    () => ({
      gridTemplateColumns: `minmax(68px, 0.72fr) repeat(${matrix.days.length}, minmax(58px, 1fr))`,
      minWidth: `${Math.max(620, 68 + matrix.days.length * 64)}px`
    }),
    [matrix.days.length]
  );

  useEffect(() => {
    if (paintMode === undefined) {
      return;
    }

    function stopPainting() {
      activePaintRef.current = undefined;
      setPaintMode(undefined);
    }

    window.addEventListener("pointerup", stopPainting);
    window.addEventListener("pointercancel", stopPainting);

    return () => {
      window.removeEventListener("pointerup", stopPainting);
      window.removeEventListener("pointercancel", stopPainting);
    };
  }, [paintMode]);

  function beginPainting(key: string, event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    const nextMode = selectedSlotKeys.has(key) ? "clear" : "select";
    activePaintRef.current = {
      lastKey: key,
      mode: nextMode,
      pointerId: event.pointerId
    };
    suppressNextClickRef.current = true;
    setPaintMode(nextMode);
    applySlotPaint(key, nextMode);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in a few embedded browser surfaces.
    }
  }

  function paintEnteredSlot(key: string) {
    if (paintMode === undefined) {
      return;
    }

    applySlotPaint(key, paintMode);
  }

  function paintPointedSlot(event: PointerEvent<HTMLButtonElement>) {
    const activePaint = activePaintRef.current;

    if (activePaint === undefined || activePaint.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const nextKey = slotKeyFromPoint(event.clientX, event.clientY);

    if (nextKey === undefined || nextKey === activePaint.lastKey) {
      return;
    }

    activePaint.lastKey = nextKey;
    applySlotPaint(nextKey, activePaint.mode);
  }

  function endPainting(event: PointerEvent<HTMLButtonElement>) {
    if (activePaintRef.current?.pointerId !== event.pointerId) {
      return;
    }

    activePaintRef.current = undefined;
    setPaintMode(undefined);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function applySlotPaint(key: string, mode: PaintMode) {
    setSelectedSlotKeys((currentKeys) => {
      if (mode === "select" && currentKeys.has(key)) {
        return currentKeys;
      }

      if (mode === "clear" && !currentKeys.has(key)) {
        return currentKeys;
      }

      const nextKeys = new Set(currentKeys);

      if (mode === "select") {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }

      return nextKeys;
    });
  }

  function toggleSlot(key: string) {
    setSelectedSlotKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  }

  function handleSlotClick(key: string) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    toggleSlot(key);
  }

  function selectSlots(targetSlots: readonly AvailabilityGridSlot[]) {
    setSelectedSlotKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      for (const slot of targetSlots) {
        nextKeys.add(slotKey(slot));
      }

      return nextKeys;
    });
  }

  function clearSlots(targetSlots: readonly AvailabilityGridSlot[]) {
    setSelectedSlotKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      for (const slot of targetSlots) {
        nextKeys.delete(slotKey(slot));
      }

      return nextKeys;
    });
  }

  function handleSlotKeyDown(key: string, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    toggleSlot(key);
  }

  function scrollToDay(date: string) {
    dayRefs.current.get(date)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (matrix.days.length === 0 || matrix.rows.length === 0) {
    return (
      <div className={styles.emptyState} role="status">
        <strong>没有可填写的时间格</strong>
        <p>创建者还没有为这个日程生成可选时间。</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.slotPicker} ${paintMode === undefined ? "" : styles.slotPickerPainting}`}
      role="group"
      aria-label={ariaLabel}
    >
      <div className={styles.slotPickerControls}>
        <div className={styles.slotProgressSummary} aria-live="polite">
          <strong>
            {slotSummary.selectedSlotCount}/{slotSummary.totalSlotCount} 已选
          </strong>
          <span>
            {slotSummary.activeDayCount}/{slotSummary.dayCount} 天有选择
          </span>
        </div>
        <div className={styles.slotPickerViewTabs} role="group" aria-label="手动填写视图">
          <button
            aria-pressed={pickerView === "matrix"}
            className={[
              styles.slotPickerViewButton,
              pickerView === "matrix" ? styles.slotPickerViewButtonActive : undefined
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setPickerView("matrix")}
            type="button"
          >
            表格涂选
          </button>
          <button
            aria-pressed={pickerView === "cards"}
            className={[
              styles.slotPickerViewButton,
              pickerView === "cards" ? styles.slotPickerViewButtonActive : undefined
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setPickerView("cards")}
            type="button"
          >
            卡片选择
          </button>
        </div>
        <div className={styles.slotPickerActions} role="group" aria-label="批量选择">
          <button className={styles.compactButton} onClick={() => selectSlots(slots)} type="button">
            <CheckSquare aria-hidden="true" size={15} />
            全选
          </button>
          <button className={styles.compactButton} onClick={() => clearSlots(slots)} type="button">
            <Eraser aria-hidden="true" size={15} />
            清空
          </button>
        </div>
      </div>

      {pickerView === "matrix" ? (
        <div className={styles.availabilityCanvas}>
          <div className={styles.availabilityCanvasHeader}>
            <h3>你的可用时间</h3>
            <div className={styles.availabilityCanvasLegend} aria-label="颜色图例">
              <span>
                未选 <i className={styles.availabilityLegendUnavailable} />
              </span>
              <span>
                已选 <i className={styles.availabilityLegendAvailable} />
              </span>
            </div>
          </div>
          <div className={styles.availabilityMatrixShell}>
            <div className={styles.availabilityMatrix} style={matrixStyle}>
              <div className={styles.availabilityMatrixCorner} />
              {matrix.days.map((day) => {
                const selectedCount = countSelectedSlots(day.slots, selectedSlotKeys);

                return (
                  <div
                    className={[
                      styles.availabilityMatrixDateHeader,
                      selectedCount > 0 ? styles.availabilityMatrixDateHeaderActive : undefined
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={day.date}
                  >
                    <span>{compactDateLabel(day.date)}</span>
                    <strong>{weekdayLabel(day.date)}</strong>
                  </div>
                );
              })}

              {matrix.rows.map((row) => {
                const isMinorBoundary = !isWholeHour(row.endTime);

                return (
                  <Fragment key={row.key}>
                    <div
                      className={[
                        styles.availabilityMatrixTimeHeader,
                        isMinorBoundary ? styles.availabilityMatrixMinorBoundary : undefined
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{timeTickLabel(row.startTime)}</span>
                    </div>
                    {matrix.days.map((day) => {
                      const slot = row.slotsByDate.get(day.date);

                      if (slot === undefined) {
                        return (
                          <div
                            aria-hidden="true"
                            className={[
                              styles.availabilityMatrixEmptyCell,
                              isMinorBoundary ? styles.availabilityMatrixMinorBoundary : undefined
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={`${day.date}-${row.key}`}
                          />
                        );
                      }

                      const key = slotKey(slot);
                      const selected = selectedSlotKeys.has(key);

                      return (
                        <button
                          aria-label={slotAriaLabel(slot, selected, totalParticipantCount)}
                          aria-pressed={selected}
                          className={[
                            styles.availabilityMatrixCell,
                            isMinorBoundary ? styles.availabilityMatrixMinorBoundary : undefined,
                            selected ? styles.availabilityMatrixCellSelected : undefined
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          data-slot-key={key}
                          key={key}
                          onClick={() => handleSlotClick(key)}
                          onKeyDown={(event) => handleSlotKeyDown(key, event)}
                          onPointerDown={(event) => beginPainting(key, event)}
                          onPointerEnter={() => paintEnteredSlot(key)}
                          onPointerMove={(event) => paintPointedSlot(event)}
                          onPointerUp={(event) => endPainting(event)}
                          title={slotTooltip(slot, selected, totalParticipantCount)}
                          type="button"
                        />
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <nav className={styles.slotDayNav} aria-label="日期快速跳转">
            {matrix.days.map((day) => {
              const selectedCount = countSelectedSlots(day.slots, selectedSlotKeys);

              return (
                <button
                  aria-label={`${day.date}，已选 ${selectedCount}/${day.slots.length}`}
                  className={[
                    styles.slotDayNavButton,
                    selectedCount > 0 ? styles.slotDayNavButtonSelected : undefined
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={day.date}
                  onClick={() => scrollToDay(day.date)}
                  type="button"
                >
                  <span>{compactDateLabel(day.date)}</span>
                  <strong>
                    {selectedCount}/{day.slots.length}
                  </strong>
                </button>
              );
            })}
          </nav>
          {matrix.days.map((day, index) => (
            <div
              className={styles.slotDay}
              key={day.date}
              ref={(node) => {
                if (node === null) {
                  dayRefs.current.delete(day.date);
                  return;
                }

                dayRefs.current.set(day.date, node);
              }}
            >
              <div className={styles.slotDayHeader}>
                <div>
                  <h3>{day.date}</h3>
                  <span className={styles.slotDayCount}>
                    第 {index + 1}/{matrix.days.length} 天 ·{" "}
                    {countSelectedSlots(day.slots, selectedSlotKeys)}/{day.slots.length} 已选
                  </span>
                </div>
                <div className={styles.slotDayActions}>
                  <button
                    className={styles.compactButton}
                    onClick={() => selectSlots(day.slots)}
                    type="button"
                  >
                    <CheckSquare aria-hidden="true" size={15} />
                    全选
                  </button>
                  <button
                    className={styles.compactButton}
                    onClick={() => clearSlots(day.slots)}
                    type="button"
                  >
                    <Eraser aria-hidden="true" size={15} />
                    清空
                  </button>
                </div>
              </div>
              <div className={styles.slotChoiceGrid}>
                {day.slots.map((slot) => {
                  const key = slotKey(slot);
                  const selected = selectedSlotKeys.has(key);

                  return (
                    <button
                      aria-pressed={selected}
                      className={[
                        styles.slotChoice,
                        selected ? styles.slotChoiceSelected : undefined
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-slot-key={key}
                      key={key}
                      onClick={() => handleSlotClick(key)}
                      onKeyDown={(event) => handleSlotKeyDown(key, event)}
                      onPointerDown={(event) => beginPainting(key, event)}
                      onPointerEnter={() => paintEnteredSlot(key)}
                      onPointerMove={(event) => paintPointedSlot(event)}
                      onPointerUp={(event) => endPainting(event)}
                      type="button"
                    >
                      {slot.label ? (
                        <span className={styles.slotChoiceLabel}>{slot.label}</span>
                      ) : null}
                      <span className={styles.slotChoiceTime}>
                        {slot.localStartTime}-{slot.localEndTime}
                      </span>
                      <span className={styles.slotChoiceMeta}>
                        {slotMetaText(slot, totalParticipantCount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function slotKey(slot: { readonly endUtc: string; readonly startUtc: string }): string {
  return `${slot.startUtc}/${slot.endUtc}`;
}

export function countSelectedSlots(
  slots: readonly { readonly endUtc: string; readonly startUtc: string }[],
  selectedSlotKeys: ReadonlySet<string>
): number {
  return slots.reduce(
    (selectedCount, slot) => selectedCount + (selectedSlotKeys.has(slotKey(slot)) ? 1 : 0),
    0
  );
}

export function groupSlotsByDate(
  slots: readonly AvailabilityGridSlot[]
): AvailabilitySlotMatrixDay[] {
  const groups = new Map<string, AvailabilityGridSlot[]>();

  for (const slot of slots) {
    groups.set(slot.localStartDate, [...(groups.get(slot.localStartDate) ?? []), slot]);
  }

  return Array.from(groups, ([date, groupSlots]) => ({
    date,
    slots: groupSlots
  }));
}

export function buildAvailabilitySlotMatrix(slots: readonly AvailabilityGridSlot[]): {
  readonly days: readonly AvailabilitySlotMatrixDay[];
  readonly rows: readonly AvailabilitySlotMatrixRow[];
} {
  const days = groupSlotsByDate(slots);
  const rowsByKey = new Map<
    string,
    {
      endTime: string;
      key: string;
      label: string;
      slotsByDate: Map<string, AvailabilityGridSlot>;
      startTime: string;
    }
  >();

  for (const day of days) {
    for (const slot of day.slots) {
      const key = slotTimeKey(slot);
      const row = rowsByKey.get(key) ?? {
        endTime: slot.localEndTime,
        key,
        label: `${slot.localStartTime}-${slot.localEndTime}`,
        slotsByDate: new Map<string, AvailabilityGridSlot>(),
        startTime: slot.localStartTime
      };

      row.slotsByDate.set(day.date, slot);
      rowsByKey.set(key, row);
    }
  }

  return {
    days,
    rows: Array.from(rowsByKey.values()).sort(compareMatrixRows)
  };
}

export function summarizeSlotGroups(
  slotGroups: readonly {
    readonly date: string;
    readonly slots: readonly { readonly endUtc: string; readonly startUtc: string }[];
  }[],
  selectedSlotKeys: ReadonlySet<string>
) {
  return slotGroups.reduce(
    (summary, group) => {
      const selectedCount = countSelectedSlots(group.slots, selectedSlotKeys);

      return {
        activeDayCount: summary.activeDayCount + (selectedCount > 0 ? 1 : 0),
        dayCount: summary.dayCount + 1,
        selectedSlotCount: summary.selectedSlotCount + selectedCount,
        totalSlotCount: summary.totalSlotCount + group.slots.length
      };
    },
    {
      activeDayCount: 0,
      dayCount: 0,
      selectedSlotCount: 0,
      totalSlotCount: 0
    }
  );
}

export function compactDateLabel(localDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);

  if (match === null) {
    return localDate;
  }

  return `${Number(match[2])}/${Number(match[3])}`;
}

export function weekdayLabel(localDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);

  if (match === null) {
    return "";
  }

  const [, year, month, day] = match;
  const dayIndex = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();

  return weekdayLabels[dayIndex] ?? "";
}

export function timeTickLabel(localTime: string): string {
  return isWholeHour(localTime) ? localTime : "";
}

export function isWholeHour(localTime: string): boolean {
  return /^\d{2}:00$/.test(localTime);
}

function compareMatrixRows(
  first: Pick<AvailabilitySlotMatrixRow, "endTime" | "startTime">,
  second: Pick<AvailabilitySlotMatrixRow, "endTime" | "startTime">
): number {
  return (
    first.startTime.localeCompare(second.startTime) || first.endTime.localeCompare(second.endTime)
  );
}

function slotTimeKey(slot: Pick<AvailabilityGridSlot, "localEndTime" | "localStartTime">): string {
  return `${slot.localStartTime}/${slot.localEndTime}`;
}

function slotKeyFromPoint(clientX: number, clientY: number): string | undefined {
  const pointedElement = document.elementFromPoint(clientX, clientY);
  const slotElement = pointedElement?.closest("[data-slot-key]");

  if (!(slotElement instanceof HTMLElement)) {
    return undefined;
  }

  return slotElement.dataset.slotKey;
}

function slotAriaLabel(
  slot: AvailabilityGridSlot,
  selected: boolean,
  totalParticipantCount: number | undefined
): string {
  return [
    `${slot.localStartDate} ${slot.localStartTime}-${slot.localEndTime}`,
    selected ? "已标记可用" : "未标记可用",
    slotMetaText(slot, totalParticipantCount)
  ].join("，");
}

function slotTooltip(
  slot: AvailabilityGridSlot,
  selected: boolean,
  totalParticipantCount: number | undefined
): string {
  return `${slot.localStartDate} ${slot.localStartTime}-${slot.localEndTime}\n${
    selected ? "已标记可用" : "未标记可用"
  }\n${slotMetaText(slot, totalParticipantCount)}`;
}

function slotMetaText(
  slot: AvailabilityGridSlot,
  totalParticipantCount: number | undefined
): string {
  if (slot.availableParticipantCount === undefined) {
    return slot.timezone;
  }

  if (totalParticipantCount !== undefined && totalParticipantCount > 0) {
    return `${slot.availableParticipantCount}/${totalParticipantCount} 人可用`;
  }

  return `${slot.availableParticipantCount} 人已选`;
}
