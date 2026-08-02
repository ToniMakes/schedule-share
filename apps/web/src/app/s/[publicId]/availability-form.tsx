"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Clipboard, Loader2, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  createParticipantAvailability,
  type CandidateVoteInput,
  type CandidateVoteResponse,
  type CreateParticipantAvailabilityResponse,
  type ScheduleDetail,
  type TimeSlotAvailabilityDto
} from "@schedule-share/api-client";

import { AvailabilityImportPanel } from "./availability-import-panel";
import { AvailabilitySlotGrid, slotKey, type AvailabilityGridSlot } from "./availability-slot-grid";
import {
  compactCandidatePreferenceRanks,
  reorderCandidatePreferenceRanks,
  selectedCandidatePreferenceKeys,
  updateCandidatePreferenceRanks
} from "./candidate-preferences";
import {
  CandidateVoteList,
  type CandidatePreferenceMove,
  type CandidateVoteSlot
} from "./candidate-vote-list";
import {
  readRememberedParticipantDisplayName,
  rememberParticipantDisplayName
} from "./participant-name-memory";
import { rememberParticipantEditLink } from "./participant-edit-link-memory";
import styles from "./page.module.css";

interface AvailabilityFormProps {
  readonly publicId: string;
  readonly scheduleMode: ScheduleDetail["scheduleMode"];
  readonly scheduleStatus: ScheduleDetail["status"];
  readonly scheduleTimezone: string;
  readonly slots: readonly TimeSlotAvailabilityDto[];
  readonly totalParticipantCount: number;
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "success"; readonly result: CreateParticipantAvailabilityResponse }
  | { readonly status: "error"; readonly message: string };

type CopyState = "idle" | "copied" | "failed";

export function AvailabilityForm({
  publicId,
  scheduleMode,
  scheduleStatus,
  scheduleTimezone,
  slots,
  totalParticipantCount
}: AvailabilityFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(() => new Set());
  const [candidateResponsesBySlotKey, setCandidateResponsesBySlotKey] = useState<
    Map<string, CandidateVoteResponse>
  >(() => new Map());
  const [candidatePreferenceRanksBySlotKey, setCandidatePreferenceRanksBySlotKey] = useState<
    Map<string, number>
  >(() => new Map());
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const isClosed = scheduleStatus !== "open";
  const isCandidatePoll = scheduleMode === "candidate_poll";
  const isSubmitting = submitState.status === "submitting";
  const candidateVoteCounts = countCandidateVotes(slots, candidateResponsesBySlotKey);

  useEffect(() => {
    const rememberedName = readRememberedParticipantDisplayName(window.localStorage);

    if (rememberedName !== undefined) {
      setDisplayName((currentName) =>
        currentName.trim().length > 0 ? currentName : rememberedName
      );
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    setSubmitState({ status: "submitting" });
    setCopyState("idle");

    try {
      const candidateVotes = isCandidatePoll
        ? buildCandidateVotes(slots, candidateResponsesBySlotKey, candidatePreferenceRanksBySlotKey)
        : undefined;
      const result = await createParticipantAvailability(publicId, {
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

      setSubmitState({
        status: "success",
        result
      });
      rememberParticipantDisplayName(window.localStorage, result.participant.displayName);
      rememberParticipantEditLink(window.localStorage, {
        displayName: result.participant.displayName,
        editUrl: result.editUrl,
        participantId: result.participant.id,
        publicId
      });
      setSelectedSlotKeys(new Set());
      setCandidateResponsesBySlotKey(new Map());
      setCandidatePreferenceRanksBySlotKey(new Map());
      router.refresh();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: toErrorMessage(error)
      });
    }
  }

  async function copyEditLink(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
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
      <section className={styles.formSection} aria-labelledby="availability-heading">
        <div className={styles.sectionHeader}>
          <h2 id="availability-heading">填写可用时间</h2>
          <span>已关闭</span>
        </div>
        <div className={styles.emptyState}>
          <strong>这个日程已经停止接收提交</strong>
          <p>组织者锁定或归档后，参与者不能再更新可用时间。</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.formSection} aria-labelledby="availability-heading">
      <div className={styles.sectionHeader}>
        <h2 id="availability-heading">{isCandidatePoll ? "候选时间投票" : "填写可用时间"}</h2>
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
            placeholder="Aki"
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
            totalParticipantCount={totalParticipantCount}
          />
        ) : (
          <AvailabilitySlotGrid
            ariaLabel="可用时间"
            selectedSlotKeys={selectedSlotKeys}
            setSelectedSlotKeys={setSelectedSlotKeys}
            slots={slots as readonly AvailabilityGridSlot[]}
            totalParticipantCount={totalParticipantCount}
          />
        )}

        {submitState.status === "error" ? (
          <p className={styles.error} role="alert">
            {submitState.message}
          </p>
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
              <SendHorizontal aria-hidden="true" size={18} />
            )}
            {isCandidatePoll ? "提交投票" : "提交可用时间"}
          </button>
        </div>

        {submitState.status === "success" ? (
          <div className={styles.success} aria-live="polite">
            <strong>已提交，请保存编辑链接</strong>
            <p>之后修改可用时间需要这个链接；这台浏览器也会记住这个编辑入口。</p>
            <div className={styles.copyLinkRow}>
              <input aria-label="编辑链接" readOnly value={submitState.result.editUrl} />
              <button
                className={styles.copyButton}
                onClick={() => copyEditLink(submitState.result.editUrl)}
                type="button"
              >
                <Clipboard aria-hidden="true" size={17} />
                {copyState === "copied" ? "已复制" : "复制"}
              </button>
            </div>
            {copyState === "failed" ? (
              <p className={styles.inlineWarning}>无法自动复制，可以手动选中链接。</p>
            ) : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return "数据库尚未配置。";
    }

    if (error.code === "SCHEDULE_LOCKED") {
      return "这个日程已经停止接收提交。";
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return "这个日程不存在或链接有误。";
    }

    if (error.code === "SLOT_OUT_OF_RANGE") {
      return "提交的时间不在这个日程范围内。";
    }

    return error.message;
  }

  if (error instanceof Error && error.name === "ZodError") {
    return "请检查填写内容。";
  }

  return "提交失败。";
}

function buildCandidateVotes(
  slots: readonly TimeSlotAvailabilityDto[],
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

function buildAvailableSlotsFromCandidateVotes(
  slots: readonly TimeSlotAvailabilityDto[],
  candidateVotes: readonly CandidateVoteInput[]
): Array<{ readonly startUtc: string; readonly endUtc: string }> {
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
  slots: readonly TimeSlotAvailabilityDto[],
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
