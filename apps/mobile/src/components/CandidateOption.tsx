import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CandidateVoteResponse } from "@schedule-share/api-client";
import type { TimeSlot } from "@schedule-share/core";
import { translate, type AppLanguage } from "../i18n";
import { palette } from "../theme";
import { Surface } from "./ui";
import { formatLocalDate } from "../date-format";

const choices = [
  ["available", "voteAvailable"],
  ["maybe", "voteMaybe"],
  ["unavailable", "voteUnavailable"]
] as const;

export function CandidateOption({
  slot,
  response,
  language,
  timezone,
  invalid = false,
  onSelect
}: {
  slot: TimeSlot;
  response?: CandidateVoteResponse;
  language: AppLanguage;
  timezone: string;
  invalid?: boolean;
  onSelect: (response: CandidateVoteResponse) => void;
}) {
  return (
    <Surface style={[styles.card, invalid && styles.cardInvalid]}>
      <Text style={styles.title}>
        {slot.label ?? `${slot.localStartDate} · ${slot.localStartTime}–${slot.localEndTime}`}
      </Text>
      <Text style={styles.time}>
        {formatLocalDate(slot.localStartDate, language)} · {slot.localStartTime}–{slot.localEndTime}{" "}
        · {timezone}
      </Text>
      <View style={styles.options}>
        {choices.map(([value, label]) => {
          const selected = response === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatLocalDate(slot.localStartDate, language)}, ${slot.localStartTime}–${slot.localEndTime}, ${timezone}: ${translate(language, label)}`}
              accessibilityHint={
                invalid ? translate(language, "candidateOptionRequired") : undefined
              }
              onPress={() => onSelect(value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {translate(language, label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {invalid ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {translate(language, "candidateOptionRequired")}
        </Text>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 3 },
  cardInvalid: { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft },
  error: { color: palette.danger, fontSize: 12, fontWeight: "700", marginTop: 4 },
  title: { color: palette.text, fontWeight: "800", fontSize: 15, lineHeight: 21 },
  time: { color: palette.muted, fontSize: 12, lineHeight: 18, marginBottom: 5 },
  options: { flexDirection: "row", gap: 6, marginTop: 2 },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: "#f8fafc"
  },
  optionSelected: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
  optionText: {
    color: "#5b6e84",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    textAlign: "center"
  },
  optionTextSelected: { color: palette.accentStrong, fontWeight: "900" },
  pressed: { opacity: 0.78 }
});
