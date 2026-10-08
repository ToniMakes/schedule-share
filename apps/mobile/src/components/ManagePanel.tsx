import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { translate, type AppLanguage, type MessageKey } from "../i18n";
import { formatLocalDate } from "../date-format";
import { palette } from "../theme";
import { SectionHeading, Surface } from "./ui";

export interface FinalTimeOption {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly localStartDate: string;
  readonly localStartTime: string;
  readonly localEndTime: string;
  readonly label?: string | undefined;
}

type PendingAction = "lock" | "archive";

export function ManagePanel({
  language,
  status,
  finalTime,
  options,
  busy,
  onShare,
  onLock,
  onArchive,
  onConfirmFinalTime
}: {
  language: AppLanguage;
  status: "open" | "locked" | "archived";
  finalTime: FinalTimeOption | null;
  options: readonly FinalTimeOption[];
  busy: boolean;
  onShare: () => void;
  onLock: () => void;
  onArchive: () => void;
  onConfirmFinalTime: (option: FinalTimeOption) => void;
}) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const t = (key: MessageKey) => translate(language, key);
  const archived = status === "archived";
  const describe = (option: FinalTimeOption) =>
    `${formatLocalDate(option.localStartDate, language)} · ${option.localStartTime}–${option.localEndTime}`;

  return (
    <Surface style={styles.card}>
      <SectionHeading language={language} label="manageTitle" />
      <Text style={styles.hint}>{t("manageHint")}</Text>

      <ActionButton label={t("manageShare")} onPress={onShare} />

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{t("manageFinalTime")}</Text>
        <Text style={styles.finalTime}>
          {finalTime ? describe(finalTime) : t("manageFinalTimeNone")}
        </Text>
        {!archived ? (
          <>
            <Text style={styles.hint}>{t("manageFinalTimeChoose")}</Text>
            {options.length === 0 ? (
              <Text style={styles.hint}>{t("manageFinalTimeEmpty")}</Text>
            ) : (
              options.slice(0, 12).map((option) => {
                const selected =
                  finalTime?.startUtc === option.startUtc && finalTime.endUtc === option.endUtc;
                return (
                  <Pressable
                    key={`${option.startUtc}-${option.endUtc}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: busy }}
                    disabled={busy}
                    onPress={() => onConfirmFinalTime(option)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.pressed
                    ]}
                  >
                    <Text style={styles.optionText}>
                      {selected ? "✓ " : ""}
                      {option.label ? `${option.label} · ` : ""}
                      {describe(option)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </>
        ) : null}
      </View>

      {archived ? (
        <Text style={styles.hint}>{t("manageArchived")}</Text>
      ) : pending ? (
        <View style={styles.block}>
          <Text style={styles.confirmText}>
            {t(pending === "lock" ? "manageLockConfirm" : "manageArchiveConfirm")}
          </Text>
          <View style={styles.row}>
            <ActionButton
              label={t("manageConfirmYes")}
              danger
              disabled={busy}
              onPress={() => {
                setPending(null);
                if (pending === "lock") onLock();
                else onArchive();
              }}
            />
            <ActionButton label={t("manageConfirmNo")} onPress={() => setPending(null)} />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          {status === "open" ? (
            <ActionButton
              label={t("manageLock")}
              disabled={busy}
              onPress={() => setPending("lock")}
            />
          ) : null}
          <ActionButton
            label={t("manageArchive")}
            danger
            disabled={busy}
            onPress={() => setPending("archive")}
          />
        </View>
      )}
    </Surface>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  danger
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean | undefined;
  danger?: boolean | undefined;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        danger && styles.actionDanger,
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.actionText, danger && styles.actionTextDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, backgroundColor: palette.surfaceTint },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  block: { gap: 8 },
  blockTitle: { color: palette.ink, fontSize: 14, fontWeight: "800" },
  finalTime: { color: palette.accentStrong, fontSize: 15, fontWeight: "700" },
  confirmText: { color: palette.text, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  optionSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
  optionText: { color: palette.text, fontSize: 13, fontWeight: "600" },
  action: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  actionDanger: { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft },
  actionText: { color: palette.accentStrong, fontWeight: "700", fontSize: 13 },
  actionTextDanger: { color: palette.danger },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 }
});
