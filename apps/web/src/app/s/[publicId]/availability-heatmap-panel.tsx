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

const defaultExpandedDayCount = 3;

const heatmapLevelClasses = [
  styles.heatmapLevel0,
  styles.heatmapLevel1,
  styles.heatmapLevel2,
  styles.heatmapLevel3,
  styles.heatmapLevel4
] as const;

const densityOptions: ReadonlyArray<{ label: string; value: AvailabilityHeatmapDensity }> = [
  { label: "全部", value: "all" },
  { label: "有人可用", value: "available" },
  { label: "只看峰值", value: "peak" }
];

export function AvailabilityHeatmapPanel({
  slots,
  totalParticipantCount
}: {
  readonly slots: GetScheduleResponse["results"]["slotResults"];
  readonly totalParticipantCount: number;
}) {
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
        <h2>结果热力图</h2>
        <span>{totalParticipantCount} 人参与</span>
      </div>

      {totalParticipantCount === 0 ? (
        <div className={styles.emptyState}>
          <strong>等待参与者提交</strong>
          <p>有人填写后，这里会按人数深浅显示每个时间格的重合程度。</p>
        </div>
      ) : (
        <div className={styles.heatmapPanel}>
          <div className={styles.heatmapSummary}>
            <div className={styles.heatmapSummaryMetrics}>
              <span>
                <Flame aria-hidden="true" size={15} />
                峰值 {peakSlots[0]?.slot.availableParticipantCount ?? 0}/{totalParticipantCount}
              </span>
              <span>
                <Filter aria-hidden="true" size={15} />
                {density === "all"
                  ? `${slots.length} 格`
                  : `${visibleSlotCount}/${slots.length} 格`}
              </span>
            </div>
            <div className={styles.heatmapControls}>
              <div className={styles.heatmapToggleGroup} aria-label="热力图筛选">
                {densityOptions.map((option) => (
                  <button
                    aria-pressed={density === option.value}
                    className={`${styles.heatmapToggleButton} ${
                      density === option.value ? styles.heatmapToggleButtonActive : ""
                    }`}
                    data-testid={`heatmap-density-${option.value}`}
                    key={option.value}
                    onClick={() => {
                      setDensity(option.value);
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className={styles.heatmapLegend} aria-label="热力图图例">
                {[0, 1, 2, 3, 4].map((level) => (
                  <span className={heatmapLevelClasses[level]} key={level} />
                ))}
              </div>
            </div>
          </div>

          {visibleDays.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>当前筛选没有时间格</strong>
              <p>切回全部可以查看所有候选时间格。</p>
            </div>
          ) : (
            <div className={styles.heatmapDays}>
              {visibleDays.map((day) => {
                const isCollapsed = density === "all" && collapsedDates.has(day.date);
                const slotCountLabel =
                  density === "all"
                    ? `${day.slots.length} 格`
                    : `${day.filteredSlots.length}/${day.slots.length} 格`;

                return (
                  <div className={styles.heatmapDay} key={day.date}>
                    <div className={styles.heatmapDayHeader}>
                      {density === "all" ? (
                        <h3>
                          <button
                            aria-expanded={!isCollapsed}
                            aria-label={`${isCollapsed ? "展开" : "收起"} ${day.date}`}
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
  slot,
  totalParticipantCount
}: {
  readonly slot: AvailabilityHeatmapSlot;
  readonly totalParticipantCount: number;
}) {
  return (
    <div className={`${styles.heatmapSlot} ${heatmapLevelClasses[slot.heatLevel]}`}>
      <div className={styles.heatmapSlotTop}>
        <strong>
          {slot.slot.localStartTime}-{slot.slot.localEndTime}
        </strong>
        {slot.isPeak ? <span>峰值</span> : null}
      </div>
      <p>
        <Users aria-hidden="true" size={13} />
        {slot.slot.availableParticipantCount}/{totalParticipantCount} 可用
      </p>
      <div className={styles.heatmapMeter} aria-hidden="true">
        <span style={{ width: `${slot.availablePercent}%` }} />
      </div>
    </div>
  );
}
