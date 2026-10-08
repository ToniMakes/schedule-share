import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text } from "react-native";
import { translate, type AppLanguage } from "../i18n";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { palette } from "../theme";
import { Surface } from "./ui";

export function FeedbackNotice({
  language,
  message,
  tone,
  onRetry
}: {
  language: AppLanguage;
  message: string;
  tone: "success" | "error";
  onRetry?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: Platform.OS !== "web"
    }).start();
  }, [progress, reduceMotion]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }
        ]
      }}
    >
      <Surface style={[styles.card, tone === "success" && styles.successCard]}>
        <Text
          accessibilityRole={tone === "error" ? "alert" : "text"}
          style={[styles.title, tone === "success" && styles.successTitle]}
        >
          {translate(language, tone === "success" ? "successHeading" : "errorHeading")}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {tone === "error" && onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <Text style={styles.retry}>{translate(language, "tryAgain")}</Text>
          </Pressable>
        ) : null}
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft, gap: 4 },
  successCard: { borderColor: palette.successBorder, backgroundColor: palette.successSoft },
  title: { color: palette.danger, fontWeight: "800", fontSize: 14 },
  successTitle: { color: palette.success },
  message: { color: "#a43b34", fontSize: 13, lineHeight: 20 },
  retry: { color: palette.accentStrong, fontSize: 13, fontWeight: "800", marginTop: 6 }
});
