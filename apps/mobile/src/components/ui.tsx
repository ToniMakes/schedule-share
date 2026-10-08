import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { translate, type AppLanguage, type MessageKey } from "../i18n";
import { palette, shape } from "../theme";

export function Surface({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function SectionHeading({
  language,
  label,
  detail
}: {
  language: AppLanguage;
  label: MessageKey;
  detail?: string;
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingText}>{translate(language, label)}</Text>
      {detail ? <Text style={styles.headingDetail}>{detail}</Text> : null}
    </View>
  );
}

export function LanguageSwitch({
  language,
  onChange
}: {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
}) {
  return (
    <View style={styles.languageSwitch} accessibilityRole="radiogroup">
      {(["en", "zh"] as const).map((option) => (
        <Pressable
          key={option}
          accessibilityRole="radio"
          accessibilityState={{ selected: language === option }}
          accessibilityLabel={option === "en" ? "English" : "中文"}
          onPress={() => onChange(option)}
          style={({ pressed }) => [
            styles.languageOption,
            language === option && styles.languageOptionSelected,
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.languageText, language === option && styles.languageTextSelected]}>
            {option === "en" ? "EN" : "中文"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StatusBadge({
  children,
  tone = "positive"
}: PropsWithChildren<{ tone?: "positive" | "neutral" }>) {
  return (
    <View style={[styles.badge, tone === "neutral" && styles.badgeNeutral]}>
      <View style={[styles.badgeDot, tone === "neutral" && styles.badgeDotNeutral]} />
      <Text style={[styles.badgeText, tone === "neutral" && styles.badgeTextNeutral]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: shape.cardRadius,
    padding: 18,
    shadowColor: palette.ink,
    shadowOpacity: 0.035,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  heading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8
  },
  headingText: { color: palette.ink, fontSize: 17, lineHeight: 23, fontWeight: "800" },
  headingDetail: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  languageSwitch: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    padding: 3
  },
  languageOption: {
    minWidth: 42,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 12
  },
  languageOptionSelected: { backgroundColor: palette.accentSoft },
  languageText: { color: "#607188", fontSize: 11, fontWeight: "800" },
  languageTextSelected: { color: palette.accentStrong },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#e8f5ee",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeNeutral: { backgroundColor: "#eef2f7" },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.success },
  badgeDotNeutral: { backgroundColor: palette.muted },
  badgeText: { color: palette.success, fontSize: 11, fontWeight: "800" },
  badgeTextNeutral: { color: "#53657b" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] }
});
