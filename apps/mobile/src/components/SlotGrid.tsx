import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-worklets";
import type { TimeSlot } from "@schedule-share/core";
import { translate, type AppLanguage } from "../i18n";
import { getSlotGridMetrics, getSlotIndexAtPoint } from "../grid-geometry";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { palette } from "../theme";
import { formatLocalDate } from "../date-format";

// Tile text grows with the system font size up to this cap; tile height grows with it so the
// touch-to-slot math in grid-geometry keeps matching what is drawn.
const MAX_TILE_FONT_SCALE = 1.3;
const BASE_TILE_HEIGHT = 52;

let activePaintValue = false;

export function SlotGrid({
  slots,
  selected,
  language,
  onToggle,
  onSet
}: {
  slots: readonly TimeSlot[];
  selected: ReadonlySet<string>;
  language: AppLanguage;
  onToggle: (slot: TimeSlot) => void;
  onSet: (slot: TimeSlot, value: boolean) => void;
}) {
  const [width, setWidth] = useState(300);
  const [activeDate, setActiveDate] = useState("");
  const reduceMotion = useReducedMotion();
  const tileScale = Math.min(PixelRatio.getFontScale(), MAX_TILE_FONT_SCALE);
  const metrics = getSlotGridMetrics(width, 66, Math.round(BASE_TILE_HEIGHT * tileScale));
  const byDate = useMemo(() => {
    const groups = new Map<string, TimeSlot[]>();
    for (const slot of slots) {
      groups.set(slot.localStartDate, [...(groups.get(slot.localStartDate) ?? []), slot]);
    }
    return Array.from(groups.entries());
  }, [slots]);
  const visibleDate = byDate.find(([date]) => date === activeDate)?.[0] ?? byDate[0]?.[0] ?? "";
  const daySlots = byDate.find(([date]) => date === visibleDate)?.[1] ?? [];

  useEffect(() => {
    if (activeDate && byDate.some(([date]) => date === activeDate)) return;
    setActiveDate(byDate[0]?.[0] ?? "");
  }, [activeDate, byDate]);

  const beginPaint = (x: number, y: number) => {
    const index = getSlotIndexAtPoint(x, y, daySlots.length, metrics);
    const slot = index === null ? undefined : daySlots[index];
    if (!slot) return;
    activePaintValue = !selected.has(slot.startUtc);
    onSet(slot, activePaintValue);
  };
  const continuePaint = (x: number, y: number) => {
    const index = getSlotIndexAtPoint(x, y, daySlots.length, metrics);
    const slot = index === null ? undefined : daySlots[index];
    if (slot) onSet(slot, activePaintValue);
  };
  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart((event) => runOnJS(beginPaint)(event.x, event.y))
    .onUpdate((event) => runOnJS(continuePaint)(event.x, event.y));

  return (
    <View style={styles.grid}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
        accessibilityLabel={translate(language, "dateNavigation")}
      >
        {byDate.map(([date, dateSlots]) => {
          const daySelected = dateSlots.filter((slot) => selected.has(slot.startUtc)).length;
          const active = date === visibleDate;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${formatLocalDate(date, language)}, ${translate(language, "selectedSlots", { count: daySelected })}`}
              onPress={() => setActiveDate(date)}
              style={({ pressed }) => [
                styles.dateChip,
                active && styles.dateChipActive,
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                {formatLocalDate(date, language)}
              </Text>
              <Text style={[styles.dateChipCount, active && styles.dateChipTextActive]}>
                {daySelected}/{dateSlots.length}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {visibleDate ? (
        <View style={styles.dayGroup}>
          <Text style={styles.dayHeading}>{formatLocalDate(visibleDate, language)}</Text>
          <GestureDetector gesture={pan}>
            <View
              style={styles.slotRow}
              // Measure the touch surface itself so the column math matches what actually wraps.
              onLayout={(event) => setWidth(Math.max(66, event.nativeEvent.layout.width))}
            >
              {daySlots.map((slot) => {
                const isSelected = selected.has(slot.startUtc);
                return (
                  <Pressable
                    key={slot.startUtc}
                    onPress={() => onToggle(slot)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${formatLocalDate(slot.localStartDate, language)}, ${slot.localStartTime}–${slot.localEndTime}`}
                    style={({ pressed }) => [
                      styles.slot,
                      { width: metrics.tileWidth, height: metrics.tileHeight },
                      isSelected && styles.slotSelected,
                      pressed && !isSelected && styles.slotPressed
                    ]}
                  >
                    {isSelected ? <AnimatedCheckmark reduceMotion={reduceMotion} /> : null}
                    <Text
                      maxFontSizeMultiplier={MAX_TILE_FONT_SCALE}
                      style={[styles.slotTime, isSelected && styles.selectedText]}
                    >
                      {slot.localStartTime}
                    </Text>
                    <Text
                      maxFontSizeMultiplier={MAX_TILE_FONT_SCALE}
                      style={[styles.slotEnd, isSelected && styles.selectedText]}
                    >
                      –{slot.localEndTime}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GestureDetector>
        </View>
      ) : null}
    </View>
  );
}

function AnimatedCheckmark({ reduceMotion }: { reduceMotion: boolean }) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0.72)).current;
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    Animated.spring(progress, {
      toValue: 1,
      stiffness: 420,
      damping: 24,
      mass: 0.6,
      useNativeDriver: Platform.OS !== "web"
    }).start();
  }, [progress, reduceMotion]);
  return (
    <Animated.Text style={[styles.slotCheck, { transform: [{ scale: progress }] }]}>
      ✓
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  dateStrip: { gap: 7, paddingVertical: 2, paddingRight: 16 },
  dateChip: {
    minWidth: 74,
    minHeight: 55,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dce5ef",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  dateChipActive: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
  dateChipText: { color: "#394f69", fontWeight: "800", fontSize: 11 },
  dateChipTextActive: { color: palette.accentStrong },
  dateChipCount: { color: palette.subtle, fontSize: 10, fontWeight: "700" },
  dayGroup: {
    backgroundColor: "#fff",
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    gap: 9
  },
  dayHeading: { color: "#2f425b", fontWeight: "800", fontSize: 13 },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  slot: {
    minWidth: 66,
    minHeight: 56,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fbfd"
  },
  slotPressed: { backgroundColor: "#eef3fa" },
  slotSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  slotCheck: { color: "#fff", fontSize: 10, lineHeight: 11, fontWeight: "900", marginBottom: 1 },
  slotTime: { color: "#2d4057", fontWeight: "700", fontSize: 12 },
  slotEnd: { color: "#8795a6", fontSize: 10, marginTop: 2 },
  selectedText: { color: "#fff" },
  pressed: { opacity: 0.78 }
});
