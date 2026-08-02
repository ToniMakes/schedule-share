"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Filter, Flame, Users } from "lucide-react";

import type { GetScheduleResponse } from "@schedule-share/api-client";

import {
  buildAvailabilityHeatmap,
  filterAvailabilityHeatmapSlots,
  type AvailabilityHeatmapDensity,
  type AvailabilityHeatmapSlot
} from "./availability-heatmap";
import styles from "./page.module.css";
import {
  schedulePageCopy,
  type AvailabilityHeatmapCopy,
  type SchedulePageLocale
} from "./schedule-page-copy";

const defaultExpandedDayCount = 3;

const heatmapLevelClasses = [
  styles.heatmapLevel0,
  styles.heatmapLevel1,
  styles.heatmapLevel2,
  styles.heatmapLevel3,
  styles.heatmapLevel4
] as const;

const densityValues: readonly AvailabilityHeatmapDensity[] = ["all", "available", "peak"];

export function AvailabilityHeatmapPanel({
  locale = "zh-CN",
  slots,
  totalParticipantCount
}: {
  readonly locale?: SchedulePageLocale;
  readonly slots: GetScheduleResponse["results"]["slotResults"];
  readonly totalParticipantCount: number;
}) {
  const copy = schedulePageCopy[locale].availabilityHeatmap;
  const [density, setDensity] = useState<AvailabilityHeatmapDensity>("all");
  const days = useMemo(
    () => buildAvailabilityHeatmap({ slots, totalParticipantCount }),
    [slots, totalParticipantCount]
  );
  const [collapsedDates, setCollapsedDates] = useState<ReadonlySet<string>>(
    () => new Set(days.slice(defaultExpandedDayCount).map((day) => day.date))
  );
  const peakSlots = useMemo(
    () => days.flatMap((day) => day.slots.filter((slot) => slot.isPeak)),
    [days]
  );
  const visibleDays = useMemo(
    () =>
      days
        .map((day) => ({
          ...day,
          filteredSlots: filterAvailabilityHeatmapSlots(day.slots, density)
        }))
        .filter((day) => density === "all" || day.filteredSlots.length > 0),
    [days, density]
  );
  const visibleSlotCount = visibleDays.reduce((count, day) => count + day.filteredSlots.length, 0);

  function toggleDay(date: string) {
    setCollapsedDates((currentDates) => {
      const nextDates = new Set(currentDates);

      if (nextDates.has(date)) {
        nextDates.delete(date);
      } else {
        nextDates.add(date);
      }

      return nextDates;
    });
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{copy.title}</h2>
        <span>{copy.participantCount(totalParticipantCount)}</span>
      </div>

      {totalParticipantCount === 0 ? (
        <div className={styles.emptyState}>
          <strong>{copy.waitingTitle}</strong>
          <p>{copy.waitingBody}</p>
        </div>
      ) : (
        <div className={styles.heatmapPanel}>
          <div className={styles.heatmapSummary}>
            <div className={styles.heatmapSummaryMetrics}>
              <span>
                <Flame aria-hidden="true" size={15} />
                {copy.peakSummary(
                  peakSlots[0]?.slot.availableParticipantCount ?? 0,
                  totalParticipantCount
                )}
              </span>
              <span>
                <Filter aria-hidden="true" size={15} />
                {copy.gridCount(visibleSlotCount, slots.length, density === "all")}
              </span>
            </div>
            <div className={styles.heatmapControls}>
              <div className={styles.heatmapToggleGroup} aria-label={copy.densityAria}>
                {densityValues.map((value) => (
                  <button
                    aria-pressed={density === value}
                    className={`${styles.heatmapToggleButton} ${
                      density === value ? styles.heatmapToggleButtonActive : ""
                    }`}
                    data-testid={`heatmap-density-${value}`}
                    key={value}
                    onClick={() => {
                      setDensity(value);
                    }}
                    type="button"
                  >
                    {copy.densityLabels[value]}
                  </button>
                ))}
              </div>
              <div className={styles.heatmapLegend} aria-label={copy.legendAria}>
                {[0, 1, 2, 3, 4].map((level) => (
                  <span className={heatmapLevelClasses[level]} key={level} />
                ))}
              </div>
            </div>
          </div>

          {visibleDays.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{copy.emptyFilteredTitle}</strong>
              <p>{copy.emptyFilteredBody}</p>
            </div>
          ) : (
            <div className={styles.heatmapDays}>
              {visibleDays.map((day) => {
                const isCollapsed = density === "all" && collapsedDates.has(day.date);
                const slotCountLabel =
                  density === "all"
                    ? copy.gridCount(day.slots.length, day.slots.length, true)
                    : copy.gridCount(day.filteredSlots.length, day.slots.length, false);

                return (
                  <div className={styles.heatmapDay} key={day.date}>
                    <div className={styles.heatmapDayHeader}>
                      {density === "all" ? (
                        <h3>
                          <button
                            aria-expanded={!isCollapsed}
                            aria-label={`${isCollapsed ? copy.expand : copy.collapse} ${day.date}`}
                            className={styles.heatmapDayToggle}
                            onClick={() => {
                              toggleDay(day.date);
                            }}
                            type="button"
                          >
                            {isCollapsed ? (
                              <ChevronRight aria-hidden="true" size={16} />
                            ) : (
                              <ChevronDown aria-hidden="true" size={16} />
                            )}
                            <span>{day.date}</span>
                          </button>
                        </h3>
                      ) : (
                        <h3>{day.date}</h3>
                      )}
                      <span>{slotCountLabel}</span>
                    </div>
                    {isCollapsed ? null : (
                      <div className={styles.heatmapGrid}>
                        {day.filteredSlots.map((slot) => (
                          <HeatmapSlotItem
                            copy={copy}
                            key={`${slot.slot.startUtc}-${slot.slot.endUtc}`}
                            slot={slot}
                            totalParticipantCount={totalParticipantCount}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function HeatmapSlotItem({
  copy,
  slot,
  totalParticipantCount
}: {
  readonly copy: AvailabilityHeatmapCopy;
  readonly slot: AvailabilityHeatmapSlot;
  readonly totalParticipantCount: number;
}) {
  return (
    <div className={`${styles.heatmapSlot} ${heatmapLevelClasses[slot.heatLevel]}`}>
      <div className={styles.heatmapSlotTop}>
        <strong>
          {slot.slot.localStartTime}-{slot.slot.localEndTime}
        </strong>
        {slot.isPeak ? <span>{copy.peak}</span> : null}
      </div>
      <p>
        <Users aria-hidden="true" size={13} />
        {slot.slot.availableParticipantCount}/{totalParticipantCount} {copy.available}
      </p>
      <div className={styles.heatmapMeter} aria-hidden="true">
        <span style={{ width: `${slot.availablePercent}%` }} />
      </div>
    </div>
  );
}
