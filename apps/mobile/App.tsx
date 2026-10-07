import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-worklets";
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
  loadDraft,
  loadProfile,
  loadRooms,
  saveDraft,
  saveProfile,
  saveRoom,
  type SavedRoom
} from "./src/storage";
import { userDataStore } from "./src/user-data-store";
import { restoreCloudData } from "./src/user-data-store";
import { getSlotGridMetrics, getSlotIndexAtPoint } from "./src/grid-geometry";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
let activePaintValue = false;

interface LoadedSchedule {
  readonly response: GetScheduleResponse;
  readonly slots: readonly TimeSlot[];
  readonly initialSelection: readonly AvailabilitySlot[];
  readonly initialCandidateResponses: Readonly<Record<string, CandidateVoteResponse>>;
}

export default function App() {
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
  const [editCredential, setEditCredential] = useState<SavedRoom | null>(null);

  useEffect(() => {
    void Promise.all([loadProfile(), loadRooms()]).then(([profile, savedRooms]) => {
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
    });
  }, []);

  const displayId = loaded?.response.schedule.publicId;
  const candidatePoll = loaded?.response.schedule.scheduleMode === "candidate_poll";
  const selectableSlots = loaded?.slots ?? [];
  const selectedSlots = useMemo(
    () => selectableSlots.filter((slot) => selection.has(slot.startUtc)),
    [selectableSlots, selection]
  );

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
        setMessage("请先在 apps/mobile/.env 中设置 EXPO_PUBLIC_API_BASE_URL，然后重启 Expo。");
        return;
      }
      const publicId = parsePublicId(value);
      if (!publicId) {
        setMessage("请输入有效的日程分享码或 schedule-share 分享链接。");
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
        if (draft) {
          initialSelection = draft.availableSlots;
          initialCandidateResponses = { ...initialCandidateResponses, ...draft.candidateVotes };
        }
        setLoaded({ response, slots, initialSelection, initialCandidateResponses });
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
        setMessage(getReadableError(error));
      } finally {
        setBusy(false);
      }
    },
    [rememberRoom, rooms, shareInput]
  );

  const toggleSlot = useCallback((slot: TimeSlot) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(slot.startUtc)) next.delete(slot.startUtc);
      else next.add(slot.startUtc);
      return next;
    });
  }, []);

  const toggleCandidate = useCallback(
    (slot: TimeSlot) => {
      const optionId = slot.candidateTimeOptionId;
      if (!optionId) return;
      const previous = candidateResponses[optionId] ?? "unavailable";
      const next: CandidateVoteResponse =
        previous === "unavailable"
          ? "available"
          : previous === "available"
            ? "maybe"
            : "unavailable";
      setCandidateResponses((current) => ({ ...current, [optionId]: next }));
      setSelection((current) => {
        const nextSelection = new Set(current);
        if (next === "available") nextSelection.add(slot.startUtc);
        else nextSelection.delete(slot.startUtc);
        return nextSelection;
      });
    },
    [candidateResponses]
  );

  const submit = useCallback(async () => {
    if (!loaded || !displayId) return;
    if (!displayName.trim()) {
      setMessage("请填写显示名称。");
      return;
    }
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
        setMessage("已更新你的可用时间。");
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
        setMessage("提交成功。你的日程结果已更新。");
      }
      await saveProfile({ displayName: displayName.trim(), timezone });
      await userDataStore
        .saveProfile({ displayName: displayName.trim(), timezone })
        .catch(() => undefined);
      await clearDraft(displayId);
      const refreshed = await getSchedule(displayId, apiOptions());
      setLoaded((current) => (current ? { ...current, response: refreshed } : current));
    } catch (error) {
      setMessage(getReadableError(error));
    } finally {
      setBusy(false);
    }
  }, [
    candidatePoll,
    candidateResponses,
    displayId,
    displayName,
    editCredential,
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
  };

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <Text style={styles.eyebrow}>SCHEDULE SHARE · MOBILE</Text>
            <Text style={styles.title}>
              {loaded ? loaded.response.schedule.title : "Find a time that works."}
            </Text>
            <Text style={styles.subtitle}>
              {loaded
                ? `${loaded.response.schedule.timezone} · ${loaded.response.participants.length} 位参与者`
                : "加入一个日程，标记你方便的时间。"}
            </Text>

            {loaded ? (
              <>
                <View style={styles.toolbar}>
                  <Pressable onPress={startNew}>
                    <Text style={styles.link}>‹ 我的日程 / 加入其他日程</Text>
                  </Pressable>
                  <Text style={styles.mode}>
                    {loaded.response.schedule.status === "open" ? "开放中" : "已结束"}
                  </Text>
                </View>
                <Text style={styles.sectionTitle}>你的信息</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="显示名称"
                  maxLength={80}
                  accessibilityLabel="显示名称"
                />
                <TextInput
                  style={styles.input}
                  value={timezone}
                  onChangeText={setTimezone}
                  placeholder="时区，例如 Australia/Sydney"
                  autoCapitalize="none"
                  accessibilityLabel="时区"
                />
                <Text style={styles.sectionTitle}>
                  {candidatePoll ? "选择候选时间" : "标记你方便的时间"}
                </Text>
                <Text style={styles.helper}>
                  {candidatePoll
                    ? "点按候选项切换方便、也许和不方便。"
                    : "点按切换单格，长按 0.3 秒后拖动可连续涂选。"}{" "}
                  日程时区：{loaded.response.schedule.timezone}
                </Text>
                {candidatePoll ? (
                  <View style={styles.candidateList}>
                    {loaded.slots.map((slot) => (
                      <Pressable
                        key={slot.startUtc}
                        onPress={() => toggleCandidate(slot)}
                        style={[
                          styles.candidate,
                          candidateResponses[slot.candidateTimeOptionId ?? ""] === "available" &&
                            styles.selectedCandidate,
                          candidateResponses[slot.candidateTimeOptionId ?? ""] === "maybe" &&
                            styles.maybeCandidate
                        ]}
                      >
                        <Text
                          style={[
                            styles.candidateTitle,
                            candidateResponses[slot.candidateTimeOptionId ?? ""] === "available" &&
                              styles.selectedText
                          ]}
                        >
                          {slot.label ??
                            `${slot.localStartDate} · ${slot.localStartTime}–${slot.localEndTime}`}
                        </Text>
                        <Text style={styles.voteStatus}>
                          {candidateResponses[slot.candidateTimeOptionId ?? ""] === "available"
                            ? "方便"
                            : candidateResponses[slot.candidateTimeOptionId ?? ""] === "maybe"
                              ? "也许"
                              : "不方便"}
                        </Text>
                        <Text style={styles.helper}>
                          {slot.localStartDate} {slot.localStartTime}–{slot.localEndTime}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <SlotGrid
                    slots={loaded.slots}
                    selected={selection}
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
                <Text style={styles.helper}>{selection.size} 个时间格已选中</Text>
                <Pressable
                  disabled={busy}
                  onPress={() => void submit()}
                  style={[styles.primaryButton, busy && styles.disabled]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryText}>
                      {editCredential ? "更新我的时间" : "提交可用时间"}
                    </Text>
                  )}
                </Pressable>
                <Text style={styles.sectionTitle}>共同空闲</Text>
                <Text style={styles.helper}>
                  结果由 schedule-share API 汇总，和网站使用同一份数据。
                </Text>
                <View style={styles.results}>
                  {loaded.response.results.everyoneAvailableBlocks.length === 0 ? (
                    <Text style={styles.empty}>目前还没有全员都方便的连续时段。</Text>
                  ) : (
                    loaded.response.results.everyoneAvailableBlocks.slice(0, 8).map((block) => (
                      <View key={`${block.startUtc}-${block.endUtc}`} style={styles.resultRow}>
                        <Text style={styles.resultDate}>{block.localStartDate}</Text>
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
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>加入日程</Text>
                <TextInput
                  style={styles.input}
                  value={shareInput}
                  onChangeText={setShareInput}
                  placeholder="粘贴分享链接或输入分享码"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="分享链接或分享码"
                />
                <Pressable
                  disabled={busy}
                  onPress={() => void openRoom()}
                  style={[styles.primaryButton, busy && styles.disabled]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryText}>打开日程</Text>
                  )}
                </Pressable>
                <Text style={styles.sectionTitle}>我的日程</Text>
                {rooms.length === 0 ? (
                  <Text style={styles.empty}>加入的日程会出现在这里。</Text>
                ) : (
                  <FlatList
                    data={rooms}
                    scrollEnabled={false}
                    keyExtractor={(item) => item.publicId}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.roomRow}
                        onPress={() => void openRoom(item.publicId)}
                      >
                        <View style={styles.roomText}>
                          <Text style={styles.roomTitle}>{item.alias || item.title}</Text>
                          <Text style={styles.helper}>{item.publicId}</Text>
                        </View>
                        <Text style={styles.link}>打开 ›</Text>
                      </Pressable>
                    )}
                  />
                )}
              </>
            )}
            {!!message && (
              <Text accessibilityRole="alert" style={styles.message}>
                {message}
              </Text>
            )}
            <Text style={styles.footer}>
              共享日程保存在 schedule-share 服务端。Firebase 仅用于同步此设备的个人资料和日程列表。
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function SlotGrid({
  slots,
  selected,
  onToggle,
  onSet
}: {
  slots: readonly TimeSlot[];
  selected: ReadonlySet<string>;
  onToggle: (slot: TimeSlot) => void;
  onSet: (slot: TimeSlot, value: boolean) => void;
}) {
  const [width, setWidth] = useState(300);
  const metrics = getSlotGridMetrics(width);
  const byDate = useMemo(() => {
    const groups = new Map<string, TimeSlot[]>();
    for (const slot of slots)
      groups.set(slot.localStartDate, [...(groups.get(slot.localStartDate) ?? []), slot]);
    return Array.from(groups.entries());
  }, [slots]);
  return (
    <View
      style={styles.grid}
      onLayout={(event) => setWidth(Math.max(66, event.nativeEvent.layout.width - 24))}
    >
      {byDate.map(([date, daySlots]) => {
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
          <View key={date} style={styles.dayGroup}>
            <Text style={styles.dayHeading}>{formatDate(date)}</Text>
            <GestureDetector gesture={pan}>
              <View style={styles.slotRow}>
                {daySlots.map((slot) => {
                  const isSelected = selected.has(slot.startUtc);
                  return (
                    <Pressable
                      key={slot.startUtc}
                      onPress={() => onToggle(slot)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      style={[
                        styles.slot,
                        { width: metrics.tileWidth, height: metrics.tileHeight },
                        isSelected && styles.slotSelected
                      ]}
                    >
                      <Text style={[styles.slotTime, isSelected && styles.selectedText]}>
                        {slot.localStartTime}
                      </Text>
                      <Text style={[styles.slotEnd, isSelected && styles.selectedText]}>
                        –{slot.localEndTime}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </GestureDetector>
          </View>
        );
      })}
    </View>
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

function formatDate(date: string): string {
  return date;
}

function getReadableError(error: unknown): string {
  if (error instanceof Error) return `无法完成请求：${error.message}`;
  return "无法连接日程服务，请检查网络和 API 地址。";
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
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("请求超时，请检查网络后重试。");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f7fb" },
  fill: { flex: 1 },
  page: { padding: 22, paddingTop: 18, paddingBottom: 44 },
  eyebrow: { color: "#52677f", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#13243a", fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 9 },
  subtitle: { color: "#65758a", fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 22 },
  sectionTitle: {
    color: "#1b2f49",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 23,
    marginBottom: 10
  },
  helper: { color: "#718198", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e1eb",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    marginBottom: 11,
    color: "#1b2f49",
    fontSize: 15
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#2764c5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  empty: {
    color: "#78879a",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    lineHeight: 20
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 13,
    padding: 15,
    marginBottom: 9
  },
  roomText: { flex: 1 },
  roomTitle: { color: "#1b2f49", fontWeight: "700", fontSize: 15 },
  link: { color: "#2764c5", fontWeight: "700", fontSize: 13 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8
  },
  mode: {
    color: "#24764f",
    backgroundColor: "#e5f5ed",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "700"
  },
  grid: { gap: 14 },
  dayGroup: { backgroundColor: "#fff", borderRadius: 14, padding: 12 },
  dayHeading: { color: "#2f425b", fontWeight: "700", fontSize: 13, marginBottom: 9 },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  slot: {
    width: "23%",
    minWidth: 66,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#dce4ee",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fbfd"
  },
  slotSelected: { backgroundColor: "#2764c5", borderColor: "#2764c5" },
  slotTime: { color: "#2d4057", fontWeight: "700", fontSize: 12 },
  slotEnd: { color: "#8795a6", fontSize: 10, marginTop: 2 },
  selectedText: { color: "#fff" },
  candidateList: { gap: 8 },
  candidate: {
    backgroundColor: "#fff",
    borderColor: "#dce4ee",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14
  },
  selectedCandidate: { backgroundColor: "#2764c5", borderColor: "#2764c5" },
  maybeCandidate: { backgroundColor: "#fff4d6", borderColor: "#e3b341" },
  candidateTitle: { color: "#2d4057", fontWeight: "700", marginBottom: 4 },
  voteStatus: { color: "#4a5d73", fontWeight: "700", fontSize: 12, marginBottom: 4 },
  results: { backgroundColor: "#fff", borderRadius: 13, marginTop: 6, paddingHorizontal: 14 },
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
  message: { color: "#a43b34", marginTop: 16, fontSize: 13, lineHeight: 20 },
  footer: { color: "#94a0af", fontSize: 11, lineHeight: 16, marginTop: 28, textAlign: "center" }
});
