import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { SlotMinutes } from "@schedule-share/core";
import type { CreateScheduleRequest } from "@schedule-share/api-client";
import { translate, type AppLanguage, type MessageKey } from "../i18n";
import {
  buildCreateScheduleRequest,
  createDefaultScheduleForm,
  type CandidateRowForm,
  type ScheduleForm
} from "../schedule-form";
import { palette } from "../theme";
import { SectionHeading, Surface } from "./ui";

const SLOT_OPTIONS: readonly SlotMinutes[] = [15, 30, 60];
const MAX_CANDIDATES = 50;

export function CreateSchedule({
  language,
  defaultTimezone,
  busy,
  serverError,
  onBack,
  onSubmit
}: {
  language: AppLanguage;
  defaultTimezone: string;
  busy: boolean;
  serverError: string;
  onBack: () => void;
  onSubmit: (request: CreateScheduleRequest) => void;
}) {
  const [form, setForm] = useState<ScheduleForm>(() => createDefaultScheduleForm(defaultTimezone));
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(language, key, values);
  const update = (patch: Partial<ScheduleForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrorKey(null);
  };
  const updateCandidate = (index: number, patch: Partial<CandidateRowForm>) =>
    update({
      candidates: form.candidates.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    });

  const submit = () => {
    const result = buildCreateScheduleRequest(form);
    if (!result.ok) {
      setErrorKey(result.error);
      return;
    }
    onSubmit(result.request);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("createBack")}
        onPress={onBack}
        style={styles.back}
      >
        <Text style={styles.link}>{t("createBack")}</Text>
      </Pressable>
      <Surface style={styles.card}>
        <SectionHeading language={language} label="createSchedule" />
        <Text style={styles.hint}>{t("createDescription")}</Text>
        <Field label={t("createTitleLabel")}>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(title) => update({ title })}
            maxLength={120}
            accessibilityLabel={t("createTitleLabel")}
          />
        </Field>
        <Field label={t("createDescriptionLabel")}>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.description}
            onChangeText={(description) => update({ description })}
            maxLength={1000}
            multiline
            accessibilityLabel={t("createDescriptionLabel")}
          />
        </Field>
        <Field label={t("timezone")}>
          <TextInput
            style={styles.input}
            value={form.timezone}
            onChangeText={(timezone) => update({ timezone })}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t("timezone")}
          />
        </Field>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {(
            [
              ["availability_grid", "createModeGrid"],
              ["candidate_poll", "createModeCandidate"]
            ] as const
          ).map(([mode, label]) => (
            <Chip
              key={mode}
              label={t(label)}
              selected={form.mode === mode}
              onPress={() => update({ mode })}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          {t(form.mode === "availability_grid" ? "createModeGridHint" : "createModeCandidateHint")}
        </Text>
      </Surface>

      {form.mode === "availability_grid" ? (
        <Surface style={styles.card}>
          <Field label={t("createStartDate")}>
            <TextInput
              style={styles.input}
              value={form.startDate}
              onChangeText={(startDate) => update({ startDate })}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t("createStartDate")}
            />
          </Field>
          <Field label={t("createEndDate")}>
            <TextInput
              style={styles.input}
              value={form.endDate}
              onChangeText={(endDate) => update({ endDate })}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t("createEndDate")}
            />
          </Field>
          <Text style={styles.label}>{t("createDailyWindow")}</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              value={form.windowStart}
              onChangeText={(windowStart) => update({ windowStart })}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t("createFrom")}
              placeholder={t("createFrom")}
            />
            <TextInput
              style={[styles.input, styles.half]}
              value={form.windowEnd}
              onChangeText={(windowEnd) => update({ windowEnd })}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t("createTo")}
              placeholder={t("createTo")}
            />
          </View>
          <Text style={styles.label}>{t("createSlotLength")}</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {SLOT_OPTIONS.map((minutes) => (
              <Chip
                key={minutes}
                label={t("createMinutes", { count: minutes })}
                selected={form.slotMinutes === minutes}
                onPress={() => update({ slotMinutes: minutes })}
              />
            ))}
          </View>
        </Surface>
      ) : (
        <>
          {form.candidates.map((row, index) => (
            <Surface key={index} style={styles.card}>
              <View style={styles.candidateHeader}>
                <Text style={styles.label}>{t("createCandidateRow", { index: index + 1 })}</Text>
                {form.candidates.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("createRemoveCandidate", { index: index + 1 })}
                    onPress={() =>
                      update({ candidates: form.candidates.filter((_, i) => i !== index) })
                    }
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                style={styles.input}
                value={row.date}
                onChangeText={(date) => updateCandidate(index, { date })}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                accessibilityLabel={t("createCandidateDate")}
                placeholder={t("createCandidateDate")}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.half]}
                  value={row.startTime}
                  onChangeText={(startTime) => updateCandidate(index, { startTime })}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel={t("createFrom")}
                  placeholder={t("createFrom")}
                />
                <TextInput
                  style={[styles.input, styles.half]}
                  value={row.endTime}
                  onChangeText={(endTime) => updateCandidate(index, { endTime })}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel={t("createTo")}
                  placeholder={t("createTo")}
                />
              </View>
            </Surface>
          ))}
          {form.candidates.length < MAX_CANDIDATES ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const last = form.candidates[form.candidates.length - 1];
                update({
                  candidates: [
                    ...form.candidates,
                    last ?? { date: form.startDate, startTime: "10:00", endTime: "11:00" }
                  ]
                });
              }}
              style={styles.addButton}
            >
              <Text style={styles.link}>{t("createAddCandidate")}</Text>
            </Pressable>
          ) : null}
        </>
      )}

      {errorKey || serverError ? (
        <Text style={styles.error} accessibilityRole="alert">
          {errorKey ? t(errorKey) : serverError}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={submit}
        style={({ pressed }) => [
          styles.primaryButton,
          busy && styles.disabled,
          pressed && styles.pressed
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{t("createSubmit")}</Text>
        )}
      </Pressable>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  back: { minHeight: 36, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: palette.accent, fontWeight: "700", fontSize: 13 },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  field: { gap: 6 },
  label: { color: palette.text, fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 15
  },
  multiline: { minHeight: 84, paddingTop: 14, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  chipSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
  chipText: { color: palette.text, fontWeight: "700", fontSize: 13 },
  chipTextSelected: { color: palette.accentStrong },
  candidateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  removeButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  removeText: { color: palette.danger, fontSize: 16, fontWeight: "800" },
  addButton: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  error: {
    color: palette.danger,
    backgroundColor: palette.dangerSoft,
    borderColor: palette.dangerBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 19
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 }
});
