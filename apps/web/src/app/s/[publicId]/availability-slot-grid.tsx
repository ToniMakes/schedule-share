"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type PointerEvent,
  type SetStateAction
} from "react";
import { CheckSquare, Eraser, MousePointerClick, Paintbrush } from "lucide-react";

import type { TimeSlotDto } from "@schedule-share/api-client";

import styles from "./page.module.css";

type PaintMode = "select" | "clear";
type InteractionMode = "tap" | "paint";

interface ActivePaintState {
  readonly mode: PaintMode;
  readonly pointerId: number;
  lastKey: string;
}

export type AvailabilityGridSlot = TimeSlotDto & {
  readonly availableParticipantCount?: number;
};

interface AvailabilitySlotGridProps {
  readonly ariaLabel?: string;
  readonly selectedSlotKeys: ReadonlySet<string>;
  readonly setSelectedSlotKeys: Dispatch<SetStateAction<Set<string>>>;
  readonly slots: readonly AvailabilityGridSlot[];
  readonly totalParticipantCount?: number;
}

const heatClasses = [
  styles.slotHeat0,
  styles.slotHeat1,
  styles.slotHeat2,
  styles.slotHeat3,
  styles.slotHeat4
] as const;

export function AvailabilitySlotGrid({
  ariaLabel = "可用时间",
  selectedSlotKeys,
  setSelectedSlotKeys,
  slots,
  totalParticipantCount
}: AvailabilitySlotGridProps) {
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("paint");
  const [paintMode, setPaintMode] = useState<PaintMode | undefined>(undefined);
  const activePaintRef = useRef<ActivePaintState | undefined>(undefined);
  const dayRefs = useRef(new Map<string, HTMLDivElement>());
  const hasInitializedInteractionMode = useRef(false);
  const slotGroups = useMemo(() => groupSlotsByDate(slots), [slots]);
  const slotSummary = summarizeSlotGroups(slotGroups, selectedSlotKeys);

  useEffect(() => {
    if (hasInitializedInteractionMode.current || typeof window === "undefined") {
      return;
    }

    hasInitializedInteractionMode.current = true;

    if (window.matchMedia("(max-width: 640px)").matches) {
      setInteractionMode("tap");
    }
  }, []);

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
    if (interactionMode !== "paint" || event.button !== 0) {
      return;
    }

    event.preventDefault();

    const nextMode = selectedSlotKeys.has(key) ? "clear" : "select";
    activePaintRef.current = {
      lastKey: key,
      mode: nextMode,
      pointerId: event.pointerId
    };
    setPaintMode(nextMode);
    applySlotPaint(key, nextMode);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded browsers do not expose pointer capture for synthetic pointers.
    }
  }

  function paintEnteredSlot(key: string) {
    if (interactionMode !== "paint") {
      return;
    }

    if (paintMode === undefined) {
      return;
    }

    applySlotPaint(key, paintMode);
  }

  function paintPointedSlot(event: PointerEvent<HTMLButtonElement>) {
    const activePaint = activePaintRef.current;

    if (
      interactionMode !== "paint" ||
      activePaint === undefined ||
      activePaint.pointerId !== event.pointerId
    ) {
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
  }

  function applySlotPaint(key: string, mode: PaintMode) {
    setSelectedSlotKeys((currentKeys) => {
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
    if (interactionMode !== "tap") {
      return;
    }

    toggleSlot(key);
  }

  function selectGroup(groupSlots: readonly AvailabilityGridSlot[]) {
    setSelectedSlotKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      for (const slot of groupSlots) {
        nextKeys.add(slotKey(slot));
      }

      return nextKeys;
    });
  }

  function clearGroup(groupSlots: readonly AvailabilityGridSlot[]) {
    setSelectedSlotKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      for (const slot of groupSlots) {
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

  return (
    <div className={styles.slotPicker} role="group" aria-label={ariaLabel}>
      <div className={styles.slotPickerControls}>
        <div className={styles.slotProgressSummary} aria-live="polite">
          <strong>
            {slotSummary.selectedSlotCount}/{slotSummary.totalSlotCount} 已选
          </strong>
          <span>
            {slotSummary.activeDayCount}/{slotSummary.dayCount} 天有选择
          </span>
        </div>
        <div className={styles.slotInteractionBar} role="group" aria-label="选择方式">
          <button
            aria-pressed={interactionMode === "tap"}
            className={`${styles.compactButton} ${
              interactionMode === "tap" ? styles.compactButtonActive : ""
            }`}
            onClick={() => setInteractionMode("tap")}
            type="button"
          >
            <MousePointerClick aria-hidden="true" size={15} />
            点按
          </button>
          <button
            aria-pressed={interactionMode === "paint"}
            className={`${styles.compactButton} ${
              interactionMode === "paint" ? styles.compactButtonActive : ""
            }`}
            onClick={() => setInteractionMode("paint")}
            type="button"
          >
            <Paintbrush aria-hidden="true" size={15} />
            涂选
          </button>
        </div>
      </div>
      <nav className={styles.slotDayNav} aria-label="日期快速跳转">
        {slotGroups.map((group) => {
          const selectedCount = countSelectedSlots(group.slots, selectedSlotKeys);

          return (
            <button
              aria-label={`${group.date}，已选 ${selectedCount}/${group.slots.length}`}
              className={[
                styles.slotDayNavButton,
                selectedCount > 0 ? styles.slotDayNavButtonSelected : undefined
              ]
                .filter(Boolean)
                .join(" ")}
              key={group.date}
              onClick={() => scrollToDay(group.date)}
              type="button"
            >
              <span>{compactDateLabel(group.date)}</span>
              <strong>
                {selectedCount}/{group.slots.length}
              </strong>
            </button>
          );
        })}
      </nav>
      {slotGroups.map((group, index) => (
        <div
          className={styles.slotDay}
          key={group.date}
          ref={(node) => {
            if (node === null) {
              dayRefs.current.delete(group.date);
              return;
            }

            dayRefs.current.set(group.date, node);
          }}
        >
          <div className={styles.slotDayHeader}>
            <div>
              <h3>{group.date}</h3>
              <span className={styles.slotDayCount}>
                第 {index + 1}/{slotGroups.length} 天 ·{" "}
                {countSelectedSlots(group.slots, selectedSlotKeys)}/{group.slots.length} 已选
              </span>
            </div>
            <div className={styles.slotDayActions}>
              <button
                className={styles.compactButton}
                onClick={() => selectGroup(group.slots)}
                type="button"
              >
                <CheckSquare aria-hidden="true" size={15} />
                全选
              </button>
              <button
                className={styles.compactButton}
                onClick={() => clearGroup(group.slots)}
                type="button"
              >
                <Eraser aria-hidden="true" size={15} />
                清空
              </button>
            </div>
          </div>
          <div className={styles.slotChoiceGrid}>
            {group.slots.map((slot) => {
              const key = slotKey(slot);
              const selected = selectedSlotKeys.has(key);

              return (
                <button
                  aria-pressed={selected}
                  className={slotChoiceClassName(
                    slot,
                    selected,
                    totalParticipantCount,
                    interactionMode
                  )}
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
                  {slot.label ? <span className={styles.slotChoiceLabel}>{slot.label}</span> : null}
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

export function groupSlotsByDate(slots: readonly AvailabilityGridSlot[]) {
  const groups = new Map<string, AvailabilityGridSlot[]>();

  for (const slot of slots) {
    groups.set(slot.localStartDate, [...(groups.get(slot.localStartDate) ?? []), slot]);
  }

  return Array.from(groups, ([date, groupSlots]) => ({
    date,
    slots: groupSlots
  }));
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

function slotChoiceClassName(
  slot: AvailabilityGridSlot,
  selected: boolean,
  totalParticipantCount: number | undefined,
  interactionMode: InteractionMode
): string {
  return [
    styles.slotChoice,
    heatClasses[slotHeatLevel(slot, totalParticipantCount)],
    interactionMode === "paint" ? styles.slotChoicePaintMode : undefined,
    selected ? styles.slotChoiceSelected : undefined
  ]
    .filter(Boolean)
    .join(" ");
}

function slotKeyFromPoint(clientX: number, clientY: number): string | undefined {
  const pointedElement = document.elementFromPoint(clientX, clientY);
  const slotElement = pointedElement?.closest("[data-slot-key]");

  if (!(slotElement instanceof HTMLElement)) {
    return undefined;
  }

  return slotElement.dataset.slotKey;
}

function slotHeatLevel(
  slot: AvailabilityGridSlot,
  totalParticipantCount: number | undefined
): 0 | 1 | 2 | 3 | 4 {
  if (
    totalParticipantCount === undefined ||
    totalParticipantCount <= 0 ||
    slot.availableParticipantCount === undefined ||
    slot.availableParticipantCount <= 0
  ) {
    return 0;
  }

  const ratio = slot.availableParticipantCount / totalParticipantCount;

  if (ratio >= 1) {
    return 4;
  }

  if (ratio >= 0.66) {
    return 3;
  }

  if (ratio >= 0.33) {
    return 2;
  }

  return 1;
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
