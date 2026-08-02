"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  updateParticipantAvailability,
  type AvailabilitySlotInput,
  type CandidateVoteInput,
  type CandidateVoteResponse,
  type ScheduleDetail,
  type TimeSlotDto
} from "@schedule-share/api-client";

import {
  AvailabilitySlotGrid,
  slotKey,
  type AvailabilityGridSlot
} from "../../availability-slot-grid";
import { AvailabilityImportPanel } from "../../availability-import-panel";
import {
  compactCandidatePreferenceRanks,
  reorderCandidatePreferenceRanks,
  selectedCandidatePreferenceKeys,
  updateCandidatePreferenceRanks
} from "../../candidate-preferences";
import {
  CandidateVoteList,
  type CandidatePreferenceMove,
  type CandidateVoteSlot
} from "../../candidate-vote-list";
import styles from "../../page.module.css";
import { rememberParticipantEditLink } from "../../participant-edit-link-memory";
import { rememberParticipantDisplayName } from "../../participant-name-memory";

interface EditAvailabilityFormProps {
  readonly editKey: string;
  readonly initialAvailableSlots: readonly AvailabilitySlotInput[];
  readonly initialCandidateVotes?: readonly CandidateVoteInput[];
  readonly initialDisplayName: string;
  readonly participantId: string;
  readonly publicId: string;
  readonly scheduleMode: ScheduleDetail["scheduleMode"];
  readonly scheduleStatus: ScheduleDetail["status"];
  readonly scheduleTimezone: string;
  readonly slots: readonly TimeSlotDto[];
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "success" }
  | { readonly status: "error"; readonly message: string };

export function EditAvailabilityForm({
  editKey,
  initialAvailableSlots,
  initialCandidateVotes = [],
  initialDisplayName,
  participantId,
  publicId,
  scheduleMode,
  scheduleStatus,
  scheduleTimezone,
  slots
}: EditAvailabilityFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(
    () => new Set(initialAvailableSlots.map(slotKey))
  );
  const [candidateResponsesBySlotKey, setCandidateResponsesBySlotKey] = useState<
    Map<string, CandidateVoteResponse>
  >(() => buildInitialCandidateResponses(slots, initialAvailableSlots, initialCandidateVotes));
  const [candidatePreferenceRanksBySlotKey, setCandidatePreferenceRanksBySlotKey] = useState<
    Map<string, number>
  >(() => buildInitialCandidatePreferenceRanks(slots, initialCandidateVotes));
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const isClosed = scheduleStatus !== "open";
  const isCandidatePoll = scheduleMode === "candidate_poll";
  const isSubmitting = submitState.status === "submitting";
  const candidateVoteCounts = countCandidateVotes(slots, candidateResponsesBySlotKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const candidateVotes = isCandidatePoll
        ? buildCandidateVotes(slots, candidateResponsesBySlotKey, candidatePreferenceRanksBySlotKey)
        : undefined;
      const result = await updateParticipantAvailability(publicId, participantId, {
        editKey,
        displayName,
        availableSlots: isCandidatePoll
          ? buildAvailableSlotsFromCandidateVotes(slots, candidateVotes ?? [])
          : slots
              .filter((slot) => selectedSlotKeys.has(slotKey(slot)))
              .map((slot) => ({
                startUtc: slot.startUtc,
                endUtc: slot.endUtc
              })),
        ...(candidateVotes === undefined ? {} : { candidateVotes })
      });

      setSubmitState({ status: "success" });
      rememberParticipantDisplayName(window.localStorage, result.participant.displayName);
      rememberParticipantEditLink(window.localStorage, {
        displayName: result.participant.displayName,
        editUrl: window.location.href,
        participantId,
        publicId
      });
      router.refresh();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: toErrorMessage(error)
      });
    }
  }

  function setCandidateResponse(slot: CandidateVoteSlot, response: CandidateVoteResponse) {
    setCandidateResponsesBySlotKey((currentResponses) => {
      const nextResponses = new Map(currentResponses);
      nextResponses.set(slotKey(slot), response);

      setCandidatePreferenceRanksBySlotKey((currentRanks) => {
        const activeKeys = selectedCandidatePreferenceKeys(slots, nextResponses);
        const compactRanks = compactCandidatePreferenceRanks(currentRanks, activeKeys);

        if (response === "unavailable" || compactRanks.has(slotKey(slot))) {
          return compactRanks;
        }

        return updateCandidatePreferenceRanks(compactRanks, slot, activeKeys, "append");
      });

      return nextResponses;
    });
  }

  function moveCandidatePreference(slot: CandidateVoteSlot, move: CandidatePreferenceMove) {
    setCandidatePreferenceRanksBySlotKey((currentRanks) =>
      updateCandidatePreferenceRanks(
        currentRanks,
        slot,
        selectedCandidatePreferenceKeys(slots, candidateResponsesBySlotKey),
        move
      )
    );
  }

  function reorderCandidatePreference(
    sourceSlot: CandidateVoteSlot,
    targetSlot: CandidateVoteSlot
  ) {
    setCandidatePreferenceRanksBySlotKey((currentRanks) =>
      reorderCandidatePreferenceRanks(
        currentRanks,
        sourceSlot,
        targetSlot,
        selectedCandidatePreferenceKeys(slots, candidateResponsesBySlotKey)
      )
    );
  }

  if (isClosed) {
    return (
      <section className={styles.formSection} aria-labelledby="edit-availability-heading">
        <div className={styles.sectionHeader}>
          <h2 id="edit-availability-heading">修改可用时间</h2>
          <span>已关闭</span>
        </div>
        <div className={styles.emptyState}>
          <strong>这个日程已经停止接收修改</strong>
          <p>组织者锁定或归档后，参与者不能再更新可用时间。</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.formSection} aria-labelledby="edit-availability-heading">
      <div className={styles.sectionHeader}>
        <h2 id="edit-availability-heading">{isCandidatePoll ? "修改候选投票" : "修改可用时间"}</h2>
        <span>
          {isCandidatePoll
            ? `${candidateVoteCounts.available} 方便 · ${candidateVoteCounts.maybe} 也许`
            : `${selectedSlotKeys.size} 个已选`}
        </span>
      </div>

      <form className={styles.availabilityForm} onSubmit={handleSubmit}>
        <label className={styles.participantField}>
          <span>你的名字</span>
          <input
            required
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
        </label>

        {!isCandidatePoll ? (
          <AvailabilityImportPanel
            onPreviewApplied={setSelectedSlotKeys}
            publicId={publicId}
            scheduleTimezone={scheduleTimezone}
          />
        ) : null}

        {isCandidatePoll ? (
          <CandidateVoteList
            onChange={setCandidateResponse}
            onPreferenceMove={moveCandidatePreference}
            onPreferenceReorder={reorderCandidatePreference}
            preferenceRanksBySlotKey={candidatePreferenceRanksBySlotKey}
            responsesBySlotKey={candidateResponsesBySlotKey}
            slots={slots}
          />
        ) : (
          <AvailabilitySlotGrid
            selectedSlotKeys={selectedSlotKeys}
            setSelectedSlotKeys={setSelectedSlotKeys}
            slots={slots as readonly AvailabilityGridSlot[]}
          />
        )}

        {submitState.status === "error" ? (
          <p className={styles.error} role="alert">
            {submitState.message}
          </p>
        ) : null}

        {submitState.status === "success" ? (
          <div className={styles.success} aria-live="polite">
            <strong>已保存修改</strong>
            <p>这条编辑链接仍然有效，可以继续用于调整可用时间。</p>
          </div>
        ) : null}

        <div className={styles.formActions}>
          <button
            className={styles.primaryButton}
            disabled={isSubmitting || slots.length === 0}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
            ) : (
              <Save aria-hidden="true" size={18} />
            )}
            保存修改
          </button>
        </div>
      </form>
    </section>
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return "数据库尚未配置。";
    }

    if (error.code === "INVALID_EDIT_KEY") {
      return "编辑链接无效或缺少密钥。";
    }

    if (error.code === "SCHEDULE_LOCKED") {
      return "这个日程已经停止接收修改。";
    }

    if (error.code === "SLOT_OUT_OF_RANGE") {
      return "提交的时间不在这个日程范围内。";
    }

    return error.message;
  }

  if (error instanceof Error && error.name === "ZodError") {
    return "请检查填写内容。";
  }

  return "保存失败。";
}

function buildInitialCandidateResponses(
  slots: readonly TimeSlotDto[],
  initialAvailableSlots: readonly AvailabilitySlotInput[],
  initialCandidateVotes: readonly CandidateVoteInput[]
): Map<string, CandidateVoteResponse> {
  const responsesBySlotKey = new Map<string, CandidateVoteResponse>();
  const slotsByCandidateOptionId = new Map(
    slots
      .filter((slot) => slot.candidateTimeOptionId !== undefined)
      .map((slot) => [slot.candidateTimeOptionId!, slot])
  );

  for (const vote of initialCandidateVotes) {
    const slot = slotsByCandidateOptionId.get(vote.candidateTimeOptionId);

    if (slot !== undefined) {
      responsesBySlotKey.set(slotKey(slot), vote.response);
    }
  }

  if (responsesBySlotKey.size > 0) {
    return responsesBySlotKey;
  }

  const availableSlotKeys = new Set(initialAvailableSlots.map(slotKey));

  for (const slot of slots) {
    if (availableSlotKeys.has(slotKey(slot))) {
      responsesBySlotKey.set(slotKey(slot), "available");
    }
  }

  return responsesBySlotKey;
}

function buildCandidateVotes(
  slots: readonly TimeSlotDto[],
  responsesBySlotKey: ReadonlyMap<string, CandidateVoteResponse>,
  preferenceRanksBySlotKey: ReadonlyMap<string, number>
): CandidateVoteInput[] {
  return slots
    .filter((slot) => slot.candidateTimeOptionId !== undefined)
    .map((slot) => {
      const key = slotKey(slot);
      const response = responsesBySlotKey.get(key) ?? "unavailable";
      const preferenceRank =
        response === "unavailable" ? undefined : preferenceRanksBySlotKey.get(key);

      return {
        candidateTimeOptionId: slot.candidateTimeOptionId!,
        ...(preferenceRank === undefined ? {} : { preferenceRank }),
        response
      };
    });
}

function buildInitialCandidatePreferenceRanks(
  slots: readonly TimeSlotDto[],
  initialCandidateVotes: readonly CandidateVoteInput[]
): Map<string, number> {
  const ranksBySlotKey = new Map<string, number>();
  const slotsByCandidateOptionId = new Map(
    slots
      .filter((slot) => slot.candidateTimeOptionId !== undefined)
      .map((slot) => [slot.candidateTimeOptionId!, slot])
  );

  for (const vote of initialCandidateVotes) {
    if (vote.preferenceRank === undefined || vote.response === "unavailable") {
      continue;
    }

    const slot = slotsByCandidateOptionId.get(vote.candidateTimeOptionId);

    if (slot !== undefined) {
      ranksBySlotKey.set(slotKey(slot), vote.preferenceRank);
    }
  }

  return compactCandidatePreferenceRanks(ranksBySlotKey, new Set(ranksBySlotKey.keys()));
}

function buildAvailableSlotsFromCandidateVotes(
  slots: readonly TimeSlotDto[],
  candidateVotes: readonly CandidateVoteInput[]
): AvailabilitySlotInput[] {
  const availableCandidateIds = new Set(
    candidateVotes
      .filter((vote) => vote.response === "available")
      .map((vote) => vote.candidateTimeOptionId)
  );

  return slots
    .filter(
      (slot) =>
        slot.candidateTimeOptionId !== undefined &&
        availableCandidateIds.has(slot.candidateTimeOptionId)
    )
    .map((slot) => ({
      startUtc: slot.startUtc,
      endUtc: slot.endUtc
    }));
}

function countCandidateVotes(
  slots: readonly TimeSlotDto[],
  responsesBySlotKey: ReadonlyMap<string, CandidateVoteResponse>
): { readonly available: number; readonly maybe: number } {
  let available = 0;
  let maybe = 0;

  for (const slot of slots) {
    const response = responsesBySlotKey.get(slotKey(slot)) ?? "unavailable";

    if (response === "available") {
      available += 1;
    }

    if (response === "maybe") {
      maybe += 1;
    }
  }

  return { available, maybe };
}
