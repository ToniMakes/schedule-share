"use client";

import { useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleHelp,
  CircleSlash,
  GripVertical,
  ListPlus
} from "lucide-react";

import type { CandidateVoteResponse } from "@schedule-share/api-client";

import { slotKey } from "./availability-slot-grid";
import styles from "./page.module.css";
import { schedulePageCopy, type CandidateVoteListCopy } from "./schedule-page-copy";

export interface CandidateVoteSlot {
  readonly availableParticipantCount?: number;
  readonly candidateTimeOptionId?: string;
  readonly endUtc: string;
  readonly label?: string;
  readonly localEndDate: string;
  readonly localEndTime: string;
  readonly localStartDate: string;
  readonly localStartTime: string;
  readonly maybeParticipantCount?: number;
  readonly startUtc: string;
}

export type CandidatePreferenceMove = "append" | "down" | "up";

export function CandidateVoteList({
  ariaLabel = "候选时间投票",
  copy = schedulePageCopy["zh-CN"].candidateVoteList,
  onChange,
  onPreferenceMove,
  onPreferenceReorder,
  preferenceRanksBySlotKey,
  responsesBySlotKey,
  showIncomplete = false,
  slots,
  totalParticipantCount
}: {
  readonly ariaLabel?: string;
  readonly copy?: CandidateVoteListCopy;
  readonly onChange: (slot: CandidateVoteSlot, response: CandidateVoteResponse) => void;
  readonly onPreferenceMove?: (slot: CandidateVoteSlot, move: CandidatePreferenceMove) => void;
  readonly onPreferenceReorder?: (
    sourceSlot: CandidateVoteSlot,
    targetSlot: CandidateVoteSlot
  ) => void;
  readonly preferenceRanksBySlotKey?: ReadonlyMap<string, number>;
  readonly responsesBySlotKey: ReadonlyMap<string, CandidateVoteResponse>;
  readonly showIncomplete?: boolean;
  readonly slots: readonly CandidateVoteSlot[];
  readonly totalParticipantCount?: number;
}) {
  const [draggedPreferenceKey, setDraggedPreferenceKey] = useState<string | undefined>();
  const [pointerPreferenceKey, setPointerPreferenceKey] = useState<string | undefined>();
  const pointerPreferenceKeyRef = useRef<string | undefined>(undefined);
  const rankedPreferenceCount = preferenceRanksBySlotKey?.size ?? 0;
  const orderedSlots = slots
    .map((slot, index) => ({
      index,
      preferenceRank: preferenceRanksBySlotKey?.get(slotKey(slot)),
      slot
    }))
    .sort((a, b) => {
      if (a.preferenceRank !== undefined && b.preferenceRank !== undefined) {
        return a.preferenceRank - b.preferenceRank;
      }

      if (a.preferenceRank !== undefined) {
        return -1;
      }

      if (b.preferenceRank !== undefined) {
        return 1;
      }

      return a.index - b.index;
    });

  function handlePreferenceDragStart(
    event: DragEvent<HTMLElement>,
    isDraggablePreference: boolean,
    key: string
  ) {
    if (!isDraggablePreference) {
      event.preventDefault();
      return;
    }

    setDraggedPreferenceKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
  }

  function handlePreferenceDragOver(
    event: DragEvent<HTMLElement>,
    isDraggablePreference: boolean,
    sourceKey: string | undefined,
    targetKey: string
  ) {
    if (!isDraggablePreference || sourceKey === undefined || sourceKey === targetKey) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handlePreferenceDrop(
    event: DragEvent<HTMLElement>,
    targetSlot: CandidateVoteSlot,
    targetKey: string
  ) {
    if (onPreferenceReorder === undefined) {
      return;
    }

    event.preventDefault();

    const sourceKey = event.dataTransfer.getData("text/plain") || draggedPreferenceKey;
    const sourceSlot = slots.find((slot) => slotKey(slot) === sourceKey);
    setDraggedPreferenceKey(undefined);

    if (sourceSlot === undefined || sourceKey === targetKey) {
      return;
    }

    onPreferenceReorder(sourceSlot, targetSlot);
  }

  function handlePreferencePointerStart(
    event: PointerEvent<HTMLElement>,
    isDraggablePreference: boolean,
    key: string
  ) {
    if (!isDraggablePreference) {
      return;
    }

    event.preventDefault();
    setDraggedPreferenceKey(key);
    setPointerPreferenceKey(key);
    pointerPreferenceKeyRef.current = key;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePreferencePointerMove(event: PointerEvent<HTMLElement>) {
    const sourceKey = pointerPreferenceKeyRef.current ?? pointerPreferenceKey;

    if (onPreferenceReorder === undefined || sourceKey === undefined) {
      return;
    }

    const targetElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-candidate-slot-key]");
    const targetKey = targetElement?.dataset.candidateSlotKey;

    if (
      targetKey === undefined ||
      targetKey === sourceKey ||
      preferenceRanksBySlotKey?.has(targetKey) !== true
    ) {
      return;
    }

    const sourceSlot = slots.find((slot) => slotKey(slot) === sourceKey);
    const targetSlot = slots.find((slot) => slotKey(slot) === targetKey);

    if (sourceSlot === undefined || targetSlot === undefined) {
      return;
    }

    onPreferenceReorder(sourceSlot, targetSlot);
    clearPreferencePointerDrag(event);
  }

  function clearPreferencePointerDrag(event: PointerEvent<HTMLElement>) {
    setDraggedPreferenceKey(undefined);
    setPointerPreferenceKey(undefined);
    pointerPreferenceKeyRef.current = undefined;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div aria-label={ariaLabel} className={styles.candidateVoteList} role="group">
      {orderedSlots.map(({ index, slot }) => {
        const key = slotKey(slot);
        const response = responsesBySlotKey.get(key);
        const preferenceRank = preferenceRanksBySlotKey?.get(key);
        const maybeCount = slot.maybeParticipantCount ?? 0;
        const slotLabel = slot.label ?? copy.candidateFallback(index);
        const isDraggablePreference =
          onPreferenceReorder !== undefined &&
          response !== undefined &&
          response !== "unavailable" &&
          preferenceRank !== undefined;

        return (
          <article
            className={`${styles.candidateVoteItem} ${
              isDraggablePreference ? styles.candidateVoteItemDraggable : ""
            } ${draggedPreferenceKey === key ? styles.candidateVoteItemDragging : ""} ${
              showIncomplete && response === undefined ? styles.candidateVoteItemInvalid : ""
            }`}
            data-candidate-slot-key={key}
            draggable={isDraggablePreference}
            key={key}
            onDragEnd={() => setDraggedPreferenceKey(undefined)}
            onDragOver={(event) =>
              handlePreferenceDragOver(event, isDraggablePreference, draggedPreferenceKey, key)
            }
            onDragStart={(event) => handlePreferenceDragStart(event, isDraggablePreference, key)}
            onDrop={(event) => handlePreferenceDrop(event, slot, key)}
          >
            <div className={styles.candidateVoteInfo}>
              <strong>{slotLabel}</strong>
              <span>
                {formatLocalDateRange(slot, copy)} {slot.localStartTime}-{slot.localEndTime}
              </span>
              {totalParticipantCount === undefined ? null : (
                <p>
                  {copy.availabilitySummary(
                    slot.availableParticipantCount ?? 0,
                    totalParticipantCount,
                    maybeCount
                  )}
                </p>
              )}
            </div>
            <div
              aria-invalid={showIncomplete && response === undefined ? true : undefined}
              aria-label={copy.responseGroupAria(slotLabel)}
              className={styles.candidateVoteChoiceGroup}
              role="radiogroup"
            >
              <CandidateVoteChoice
                checked={response === "available"}
                label={copy.available}
                name={`candidate-${key}`}
                onChange={() => onChange(slot, "available")}
                value="available"
              />
              <CandidateVoteChoice
                checked={response === "maybe"}
                label={copy.maybe}
                name={`candidate-${key}`}
                onChange={() => onChange(slot, "maybe")}
                value="maybe"
              />
              <CandidateVoteChoice
                checked={response === "unavailable"}
                label={copy.unavailable}
                name={`candidate-${key}`}
                onChange={() => onChange(slot, "unavailable")}
                value="unavailable"
              />
            </div>
            {onPreferenceMove === undefined ||
            response === undefined ||
            response === "unavailable" ? null : (
              <div className={styles.candidatePreferenceControls}>
                <span>
                  {preferenceRank === undefined
                    ? copy.noPreferenceRank
                    : copy.preferenceRank(preferenceRank)}
                </span>
                {preferenceRank === undefined ? (
                  <button
                    aria-label={copy.addPreferenceAria(slotLabel)}
                    className={styles.candidatePreferenceButton}
                    onClick={() => onPreferenceMove(slot, "append")}
                    title={copy.addPreferenceTitle}
                    type="button"
                  >
                    <ListPlus aria-hidden="true" size={15} />
                  </button>
                ) : (
                  <>
                    {onPreferenceReorder === undefined ? null : (
                      <span
                        aria-label={copy.dragPreferenceAria(slotLabel)}
                        className={styles.candidatePreferenceDragHandle}
                        onPointerCancel={clearPreferencePointerDrag}
                        onPointerDown={(event) =>
                          handlePreferencePointerStart(event, isDraggablePreference, key)
                        }
                        onPointerMove={handlePreferencePointerMove}
                        onPointerUp={clearPreferencePointerDrag}
                        title={copy.dragPreferenceTitle}
                      >
                        <GripVertical aria-hidden="true" size={15} />
                      </span>
                    )}
                    <button
                      aria-label={copy.increasePreferenceAria(slotLabel)}
                      className={styles.candidatePreferenceButton}
                      disabled={preferenceRank <= 1}
                      onClick={() => onPreferenceMove(slot, "up")}
                      title={copy.increasePreferenceTitle}
                      type="button"
                    >
                      <ArrowUp aria-hidden="true" size={15} />
                    </button>
                    <button
                      aria-label={copy.decreasePreferenceAria(slotLabel)}
                      className={styles.candidatePreferenceButton}
                      disabled={preferenceRank >= rankedPreferenceCount}
                      onClick={() => onPreferenceMove(slot, "down")}
                      title={copy.decreasePreferenceTitle}
                      type="button"
                    >
                      <ArrowDown aria-hidden="true" size={15} />
                    </button>
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function CandidateVoteChoice({
  checked,
  label,
  name,
  onChange,
  value
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly name: string;
  readonly onChange: () => void;
  readonly value: CandidateVoteResponse;
}) {
  return (
    <label
      className={`${styles.candidateVoteChoice} ${
        checked ? styles.candidateVoteChoiceSelected : ""
      }`}
    >
      <input checked={checked} name={name} onChange={onChange} type="radio" value={value} />
      {value === "available" ? <CheckCircle2 aria-hidden="true" size={16} /> : null}
      {value === "maybe" ? <CircleHelp aria-hidden="true" size={16} /> : null}
      {value === "unavailable" ? <CircleSlash aria-hidden="true" size={16} /> : null}
      <span>{label}</span>
    </label>
  );
}

function formatLocalDateRange(
  value: {
    readonly localEndDate: string;
    readonly localStartDate: string;
  },
  copy: CandidateVoteListCopy
): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return `${value.localStartDate}${copy.rangeSeparator}${value.localEndDate}`;
}
