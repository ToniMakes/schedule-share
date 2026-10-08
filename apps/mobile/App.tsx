import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createAvailabilityDraftFromAvailableSlots,
  generateTimeSlots,
  type AvailabilitySlot,
  type LocalDate,
  type LocalTime,
  type TimeSlot,
  type TimeSlotConfig
} from "@schedule-share/core";
import {
  createParticipantAvailability,
  getSchedule,
  getParticipantAvailability,
  updateParticipantAvailability,
  type CandidateVoteInput,
  type CandidateVoteResponse,
  type GetScheduleResponse
} from "@schedule-share/api-client";
import {
  clearDraft,
  loadLanguage,
  loadDraft,
  loadProfile,
  loadRooms,
  saveDraft,
  saveLanguage,
  saveProfile,
  saveRoom,
  type SavedRoom
} from "./src/storage";
import { translate, type AppLanguage } from "./src/i18n";
import { userDataStore } from "./src/user-data-store";
import { restoreCloudData } from "./src/user-data-store";
import { LanguageSwitch, SectionHeading, StatusBadge, Surface } from "./src/components/ui";
import { JoinDashboard } from "./src/components/JoinDashboard";
import { SlotGrid } from "./src/components/SlotGrid";
import { formatLocalDate } from "./src/date-format";
import { palette } from "./src/theme";
import { FeedbackNotice } from "./src/components/FeedbackNotice";
import { CandidateOption } from "./src/components/CandidateOption";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
interface LoadedSchedule {
  readonly response: GetScheduleResponse;
  readonly slots: readonly TimeSlot[];
  readonly initialSelection: readonly AvailabilitySlot[];
  readonly initialCandidateResponses: Readonly<Record<string, CandidateVoteResponse>>;
}

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [shareInput, setShareInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [rooms, setRooms] = useState<readonly SavedRoom[]>([]);
  const [loaded, setLoaded] = useState<LoadedSchedule | null>(null);
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [candidateResponses, setCandidateResponses] = useState<
    Readonly<Record<string, CandidateVoteResponse>>
  >({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const [candidateValidationError, setCandidateValidationError] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [editCredential, setEditCredential] = useState<SavedRoom | null>(null);
  useEffect(() => {
    void Promise.all([loadProfile(), loadRooms(), loadLanguage()]).then(
      ([profile, savedRooms, savedLanguage]) => {
        setLanguage(savedLanguage);
        if (profile) {
          setDisplayName(profile.displayName);
          setTimezone(profile.timezone);
        }
        setRooms(savedRooms);
        void restoreCloudData()
          .then(async (cloud) => {
            if (cloud.profile) {
              setDisplayName(cloud.profile.displayName);
              setTimezone(cloud.profile.timezone);
              await saveProfile(cloud.profile);
            }
            if (cloud.rooms.length) {
              for (const room of cloud.rooms) await saveRoom(room);
              setRooms(await loadRooms());
            }
          })
          .catch(() => undefined);
      }
    );
  }, []);

  const changeLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    void saveLanguage(nextLanguage).catch(() => undefined);
  }, []);

  const displayId = loaded?.response.schedule.publicId;
  const candidatePoll = loaded?.response.schedule.scheduleMode === "candidate_poll";
  const selectableSlots = loaded?.slots ?? [];
  const selectedSlots = useMemo(
    () => selectableSlots.filter((slot) => selection.has(slot.startUtc)),
    [selectableSlots, selection]
  );
  const unansweredCandidateCount =
    candidatePoll && loaded
      ? loaded.slots.filter(
          (slot) =>
            !slot.candidateTimeOptionId ||
            candidateResponses[slot.candidateTimeOptionId] === undefined
        ).length
      : 0;

  useEffect(() => {
    if (!displayId) return;
    void saveDraft(
      displayId,
      selectedSlots.map(({ startUtc, endUtc }) => ({ startUtc, endUtc })),
      candidateResponses
    );
  }, [candidateResponses, displayId, selectedSlots]);

  const rememberRoom = useCallback(async (room: SavedRoom) => {
    const next = await saveRoom(room);
    setRooms(next);
    await userDataStore.saveRoom(room).catch(() => undefined);
  }, []);

  const openRoom = useCallback(
    async (value = shareInput) => {
      if (!API_BASE_URL) {
        setMessageTone("error");
        setMessage(translate(language, "missingApi"));
        return;
      }
      const publicId = parsePublicId(value);
      if (!publicId) {
        setMessageTone("error");
        setMessage(translate(language, "invalidShare"));
        return;
      }
      setBusy(true);
      setMessage("");
      try {
        const response = await getSchedule(publicId, apiOptions());
        const slots: readonly TimeSlot[] =
          response.schedule.scheduleMode === "availability_grid"
            ? generateTimeSlots(toCoreTimeSlotConfig(response.schedule))
            : response.schedule.candidateWindows.map(toCoreTimeSlot);
        const previousRoom = rooms.find((room) => room.publicId === publicId);
        let initialSelection: readonly AvailabilitySlot[] = [];
        let initialCandidateResponses: Record<string, CandidateVoteResponse> = {};
        if (previousRoom?.participantId && previousRoom.editKey) {
          try {
            const own = await getParticipantAvailability(
              publicId,
              previousRoom.participantId,
              previousRoom.editKey,
              apiOptions()
            );
            initialSelection = own.participant.availableSlots;
            initialCandidateResponses = Object.fromEntries(
              (own.participant.candidateVotes ?? []).map((vote) => [
                vote.candidateTimeOptionId,
                vote.response
              ])
            );
          } catch {
            // The shared schedule remains readable if the saved edit key expired or was removed.
          }
        }
        const draft = await loadDraft(publicId);
        setDraftRestored(Boolean(draft));
        if (draft) {
          initialSelection = draft.availableSlots;
          initialCandidateResponses = { ...initialCandidateResponses, ...draft.candidateVotes };
        }
        setLoaded({ response, slots, initialSelection, initialCandidateResponses });
        setCandidateValidationError(false);
        setSelection(new Set(initialSelection.map((slot) => slot.startUtc)));
        setCandidateResponses(initialCandidateResponses);
        setShareInput(publicId);
        setEditCredential(
          previousRoom?.participantId && previousRoom.editKey ? previousRoom : null
        );
        setMessage("");
        await rememberRoom({
          publicId,
          title: response.schedule.title,
          alias: previousRoom?.alias ?? response.schedule.title,
          lastVisitedAt: new Date().toISOString(),
          ...(previousRoom?.participantId ? { participantId: previousRoom.participantId } : {}),
          ...(previousRoom?.editKey ? { editKey: previousRoom.editKey } : {})
        });
      } catch (error) {
        setMessageTone("error");
        setMessage(getReadableError(error, language));
      } finally {
        setBusy(false);
      }
    },
    [language, rememberRoom, rooms, shareInput]
  );

  const toggleSlot = useCallback((slot: TimeSlot) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(slot.startUtc)) next.delete(slot.startUtc);
      else next.add(slot.startUtc);
      return next;
    });
  }, []);

  const setCandidate = useCallback(
    (slot: TimeSlot, next: CandidateVoteResponse) => {
      const optionId = slot.candidateTimeOptionId;
      if (!optionId) return;
      const updatedResponses = { ...candidateResponses, [optionId]: next };
      setCandidateResponses(updatedResponses);
      if (
        loaded?.slots.every(
          (candidateSlot) =>
            candidateSlot.candidateTimeOptionId !== undefined &&
            updatedResponses[candidateSlot.candidateTimeOptionId] !== undefined
        )
      ) {
        setCandidateValidationError(false);
        setMessage("");
      }
      setSelection((current) => {
        const nextSelection = new Set(current);
        if (next === "available") nextSelection.add(slot.startUtc);
        else nextSelection.delete(slot.startUtc);
        return nextSelection;
      });
    },
    [candidateResponses, loaded]
  );

  const submit = useCallback(async () => {
    if (!loaded || !displayId) return;
    if (!displayName.trim()) {
      setMessageTone("error");
      setMessage(translate(language, "nameRequired"));
      return;
    }
    if (candidatePoll && unansweredCandidateCount > 0) {
      setCandidateValidationError(true);
      setMessageTone("error");
      setMessage(translate(language, "candidateResponseRequired"));
      return;
    }
    setCandidateValidationError(false);
    setBusy(true);
    setMessage("");
    try {
      const availableSlots: { startUtc: string; endUtc: string }[] = candidatePoll
        ? selectedSlots.map(({ startUtc, endUtc }) => ({ startUtc, endUtc }))
        : createAvailabilityDraftFromAvailableSlots({
            config: toCoreTimeSlotConfig(loaded.response.schedule),
            entryMethod: "manual_grid",
            availableSlots: selectedSlots.map(({ startUtc, endUtc }) => ({ startUtc, endUtc }))
          }).availableSlots.map(({ startUtc, endUtc }) => ({ startUtc, endUtc }));

      if (editCredential?.participantId && editCredential.editKey) {
        await updateParticipantAvailability(
          displayId,
          editCredential.participantId,
          {
            editKey: editCredential.editKey,
            displayName: displayName.trim(),
            availableSlots,
            ...(candidatePoll
              ? { candidateVotes: buildCandidateVotes(loaded.slots, candidateResponses) }
              : {})
          },
          apiOptions()
        );
        setMessageTone("success");
        setMessage(translate(language, "availabilityUpdated"));
      } else {
        const result = await createParticipantAvailability(
          displayId,
          {
            displayName: displayName.trim(),
            availableSlots,
            ...(candidatePoll
              ? { candidateVotes: buildCandidateVotes(loaded.slots, candidateResponses) }
              : {})
          },
          apiOptions()
        );
        const editUrl = new URL(result.editUrl);
        const editKey = editUrl.searchParams.get("key") ?? "";
        const room: SavedRoom = {
          publicId: displayId,
          title: loaded.response.schedule.title,
          alias: loaded.response.schedule.title,
          lastVisitedAt: new Date().toISOString(),
          participantId: result.participant.id,
          ...(editKey ? { editKey } : {})
        };
        setEditCredential(room);
        await rememberRoom(room);
        setMessageTone("success");
        setMessage(translate(language, "availabilitySubmitted"));
      }
      await saveProfile({ displayName: displayName.trim(), timezone });
      await userDataStore
        .saveProfile({ displayName: displayName.trim(), timezone })
        .catch(() => undefined);
      await clearDraft(displayId);
      setDraftRestored(false);
      const refreshed = await getSchedule(displayId, apiOptions());
      setLoaded((current) => (current ? { ...current, response: refreshed } : current));
    } catch (error) {
      setMessageTone("error");
      setMessage(getReadableError(error, language));
    } finally {
      setBusy(false);
    }
  }, [
    candidatePoll,
    unansweredCandidateCount,
    candidateResponses,
    displayId,
    displayName,
    editCredential,
    language,
    loaded,
    rememberRoom,
    selectedSlots,
    timezone
  ]);

  const startNew = () => {
    setLoaded(null);
    setSelection(new Set());
    setCandidateResponses({});
    setEditCredential(null);
    setMessage("");
    setDraftRestored(false);
  };

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.eyebrow}>SCHEDULE SHARE</Text>
                <Text style={styles.headerCaption}>{translate(language, "brandTagline")}</Text>
              </View>
              <LanguageSwitch language={language} onChange={changeLanguage} />
            </View>
            <Text style={styles.title}>
              {loaded ? loaded.response.schedule.title : translate(language, "homeTitle")}
            </Text>
            <Text style={styles.subtitle}>
              {loaded
                ? translate(language, "participants", {
                    timezone: loaded.response.schedule.timezone,
                    count: loaded.response.participants.length,
                    participantLabel:
                      loaded.response.participants.length === 1 ? "participant" : "participants"
                  })
                : translate(language, "subtitleHome")}
            </Text>

            {loaded ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={translate(language, "backToSchedules")}
                  onPress={startNew}
                  style={styles.backButton}
                >
                  <Text style={styles.link}>{translate(language, "backToSchedules")}</Text>
                </Pressable>
                <Surface style={styles.scheduleCard}>
                  <View style={styles.scheduleCardTop}>
                    <Text style={styles.eyebrow}>{translate(language, "scheduleDetails")}</Text>
                    <StatusBadge
                      tone={loaded.response.schedule.status === "open" ? "positive" : "neutral"}
                    >
                      {translate(
                        language,
                        loaded.response.schedule.status === "open" ? "statusOpen" : "statusClosed"
                      )}
                    </StatusBadge>
                  </View>
                  <Text style={styles.scheduleMeta}>
                    {translate(language, "participants", {
                      timezone: loaded.response.schedule.timezone,
                      count: loaded.response.participants.length,
                      participantLabel:
                        loaded.response.participants.length === 1 ? "participant" : "participants"
                    })}
                  </Text>
                </Surface>
                <Surface style={styles.formCard}>
                  <SectionHeading language={language} label="yourInfo" />
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={translate(language, "displayName")}
                    maxLength={80}
                    accessibilityLabel={translate(language, "displayName")}
                    returnKeyType="next"
                  />
                  <TextInput
                    style={[styles.input, styles.lastInput]}
                    value={timezone}
                    onChangeText={setTimezone}
                    placeholder={translate(language, "timezone")}
                    autoCapitalize="none"
                    accessibilityLabel={translate(language, "timezone")}
                  />
                  {draftRestored ? (
                    <Text style={styles.savedHint}>{translate(language, "draftRestored")}</Text>
                  ) : editCredential ? (
                    <Text style={styles.savedHint}>{translate(language, "responseEditing")}</Text>
                  ) : (
                    <Text style={styles.savedHint}>{translate(language, "responseSaved")}</Text>
                  )}
                </Surface>
                <Text style={styles.sectionTitle}>
                  {translate(language, candidatePoll ? "chooseCandidate" : "markAvailability")}
                </Text>
                <Text style={styles.helper}>
                  {translate(
                    language,
                    candidatePoll ? "candidateInstructions" : "gridInstructions"
                  )}{" "}
                  {translate(language, "scheduleTimezone", {
                    timezone: loaded.response.schedule.timezone
                  })}
                </Text>
                {candidatePoll ? (
                  <View style={styles.candidateList}>
                    {loaded.slots.map((slot) => {
                      const optionId = slot.candidateTimeOptionId ?? "";
                      return (
                        <CandidateOption
                          key={slot.startUtc}
                          slot={slot}
                          response={candidateResponses[optionId]}
                          language={language}
                          timezone={loaded.response.schedule.timezone}
                          invalid={candidateValidationError && !candidateResponses[optionId]}
                          onSelect={(response) => setCandidate(slot, response)}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <SlotGrid
                    slots={loaded.slots}
                    selected={selection}
                    language={language}
                    onToggle={toggleSlot}
                    onSet={(slot, value) =>
                      setSelection((current) => {
                        if (current.has(slot.startUtc) === value) return current;
                        const next = new Set(current);
                        if (value) next.add(slot.startUtc);
                        else next.delete(slot.startUtc);
                        return next;
                      })
                    }
                  />
                )}
                <Surface style={styles.selectionCard}>
                  <View style={styles.selectionHeading}>
                    <Text style={styles.selectionTitle}>
                      {translate(language, "selectionSummary")}
                    </Text>
                    <Text style={styles.selectionCount}>
                      {candidatePoll
                        ? translate(language, "candidateResponsesCount", {
                            count: Object.keys(candidateResponses).length,
                            total: loaded.slots.length
                          })
                        : translate(language, "selectedSlots", { count: selection.size })}
                    </Text>
                  </View>
                </Surface>
                <View style={styles.resultsHeader}>
                  <SectionHeading
                    language={language}
                    label="commonFree"
                    detail={translate(language, "resultCount", {
                      count: loaded.response.results.everyoneAvailableBlocks.length
                    })}
                  />
                  <Text style={styles.resultsNote}>{translate(language, "resultsPending")}</Text>
                </View>
                <Surface style={styles.results}>
                  {loaded.response.results.everyoneAvailableBlocks.length === 0 ? (
                    <Text style={styles.empty}>{translate(language, "noCommonFree")}</Text>
                  ) : (
                    loaded.response.results.everyoneAvailableBlocks.slice(0, 8).map((block) => (
                      <View key={`${block.startUtc}-${block.endUtc}`} style={styles.resultRow}>
                        <Text style={styles.resultDate}>
                          {formatLocalDate(block.localStartDate, language)}
                        </Text>
                        <Text style={styles.resultTime}>
                          {block.localStartTime}–{block.localEndTime}
                        </Text>
                        <Text style={styles.resultCount}>
                          {loaded.response.participants.length}/
                          {loaded.response.results.totalParticipantCount}
                        </Text>
                      </View>
                    ))
                  )}
                </Surface>
              </>
            ) : (
              <JoinDashboard
                language={language}
                rooms={rooms}
                shareInput={shareInput}
                busy={busy}
                onChangeShareInput={setShareInput}
                onOpenRoom={(value) => void openRoom(value)}
              />
            )}
            {message && !loaded ? (
              <FeedbackNotice
                language={language}
                message={message}
                tone={messageTone}
                onRetry={!loaded && shareInput.trim() ? () => void openRoom() : undefined}
              />
            ) : null}
            <Text style={styles.footer}>{translate(language, "footer")}</Text>
          </ScrollView>
          {loaded ? (
            <View style={styles.stickyAction}>
              {message ? (
                <FeedbackNotice language={language} message={message} tone={messageTone} />
              ) : null}
              <View style={styles.stickySummary}>
                <Text style={styles.stickySummaryTitle}>
                  {translate(language, "selectionSummary")}
                </Text>
                <Text style={styles.stickySummaryCount}>
                  {candidatePoll
                    ? translate(language, "candidateResponsesCount", {
                        count: Object.keys(candidateResponses).length,
                        total: loaded.slots.length
                      })
                    : translate(language, "selectedSlots", { count: selection.size })}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  busy && styles.disabled,
                  pressed && styles.pressed
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>
                    {translate(
                      language,
                      candidatePoll
                        ? editCredential
                          ? "updateVote"
                          : "submitVote"
                        : editCredential
                          ? "updateAvailability"
                          : "submitAvailability"
                    )}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function parsePublicId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const pathMatch = value.match(/(?:\/s\/|schedule=)([A-Za-z0-9_-]+)/i);
  const raw = pathMatch?.[1] ?? value;
  return /^[A-Za-z0-9_-]{3,120}$/.test(raw) ? raw : null;
}

function buildCandidateVotes(
  slots: readonly TimeSlot[],
  responses: Readonly<Record<string, CandidateVoteResponse>>
): CandidateVoteInput[] {
  return slots.flatMap((slot) =>
    slot.candidateTimeOptionId
      ? [
          {
            candidateTimeOptionId: slot.candidateTimeOptionId,
            response: responses[slot.candidateTimeOptionId] ?? "unavailable"
          }
        ]
      : []
  );
}

function toCoreTimeSlotConfig(schedule: GetScheduleResponse["schedule"]): TimeSlotConfig {
  return {
    timezone: schedule.timezone,
    dateRange: {
      start: schedule.dateRange.start as LocalDate,
      end: schedule.dateRange.end as LocalDate
    },
    slotMinutes: schedule.slotMinutes,
    dailyWindows: schedule.dailyWindows.map((window) => ({
      startTime: window.startTime as LocalTime,
      endTime: window.endTime as LocalTime,
      ...(window.daysOfWeek ? { daysOfWeek: window.daysOfWeek } : {})
    }))
  };
}

function toCoreTimeSlot(
  slot: GetScheduleResponse["schedule"]["candidateWindows"][number]
): TimeSlot {
  return {
    ...slot,
    localStartDate: slot.localStartDate as LocalDate,
    localEndDate: slot.localEndDate as LocalDate,
    localStartTime: slot.localStartTime as LocalTime,
    localEndTime: slot.localEndTime as LocalTime
  };
}

function getReadableError(error: unknown, language: AppLanguage): string {
  if (error instanceof Error && error.message === "Request timed out")
    return translate(language, "timedOut");
  if (error instanceof Error) return translate(language, "requestFailed");
  return translate(language, "networkFailed");
}

function apiOptions() {
  return { baseUrl: API_BASE_URL, fetch: fetchWithTimeout };
}

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.page },
  fill: { flex: 1 },
  page: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30, gap: 18 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2
  },
  eyebrow: { color: "#4b6079", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  headerCaption: {
    color: "#98a5b5",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginTop: 3
  },
  title: { color: "#13243a", fontSize: 29, lineHeight: 35, fontWeight: "800", marginTop: -8 },
  subtitle: { color: "#65758a", fontSize: 14, lineHeight: 21, marginTop: -14, marginBottom: -2 },
  sectionTitle: {
    color: "#1b2f49",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 23,
    marginBottom: 10
  },
  helper: { color: "#718198", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cardDescription: {
    color: "#718198",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 14
  },
  scheduleCard: { gap: 10, backgroundColor: palette.surfaceTint },
  scheduleCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  scheduleMeta: { color: "#596d85", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  backButton: { minHeight: 36, justifyContent: "center", alignSelf: "flex-start" },
  formCard: { gap: 10 },
  savedHint: { color: "#74859a", fontSize: 11, lineHeight: 16, marginTop: -2 },
  lastInput: { marginBottom: 0 },
  link: { color: "#2764c5", fontWeight: "700", fontSize: 13 },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d9e1eb",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    marginBottom: 2,
    color: "#1b2f49",
    fontSize: 15
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
  empty: {
    color: "#78879a",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    lineHeight: 20
  },
  stickyAction: {
    paddingHorizontal: 18,
    paddingTop: 11,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: "rgba(255,255,255,0.98)"
  },
  stickySummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 7
  },
  stickySummaryTitle: { color: palette.ink, fontWeight: "800", fontSize: 12 },
  stickySummaryCount: { color: "#647790", fontWeight: "700", fontSize: 11 },
  resultsHeader: { gap: 6, marginTop: 2 },
  resultsNote: { color: "#718198", fontSize: 12, lineHeight: 18 },
  selectionCard: { gap: 11, backgroundColor: "#fafdff" },
  selectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  selectionTitle: { color: "#243a55", fontWeight: "800", fontSize: 14 },
  selectionCount: { color: "#647790", fontWeight: "700", fontSize: 12 },
  candidateList: { gap: 8 },
  results: { marginTop: 0, paddingHorizontal: 14, paddingVertical: 6 },
  resultRow: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "#edf1f6",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10
  },
  resultDate: { color: "#61728a", width: 91, fontSize: 12 },
  resultTime: { color: "#203752", flex: 1, fontWeight: "700", fontSize: 14 },
  resultCount: { color: "#718198", fontSize: 11 },
  footer: { color: "#94a0af", fontSize: 11, lineHeight: 16, marginTop: 2, textAlign: "center" }
});
