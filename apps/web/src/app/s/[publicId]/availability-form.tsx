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
  readonly imageImportVisible: boolean;
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
  imageImportVisible,
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
        <ol className={styles.availabilityFlowSteps} aria-label="填写流程">
          <li className={displayName.trim().length > 0 ? styles.availabilityFlowStepDone : ""}>
            <span>1</span>
            <strong>名字</strong>
          </li>
          {!isCandidatePoll ? (
            <li>
              <span>2</span>
              <strong>可选预填</strong>
            </li>
          ) : null}
          <li
            className={
              isCandidatePoll
                ? candidateVoteCounts.available + candidateVoteCounts.maybe > 0
                  ? styles.availabilityFlowStepDone
                  : ""
                : selectedSlotKeys.size > 0
                  ? styles.availabilityFlowStepDone
                  : ""
            }
          >
            <span>{isCandidatePoll ? "2" : "3"}</span>
            <strong>{isCandidatePoll ? "投票" : "涂选"}</strong>
          </li>
          <li>
            <span>{isCandidatePoll ? "3" : "4"}</span>
            <strong>提交</strong>
          </li>
        </ol>

        <div className={styles.availabilityFlow}>
          <section className={styles.availabilityStepBlock} aria-labelledby="participant-step">
            <div className={styles.availabilityStepHeader}>
              <span className={styles.availabilityStepBadge}>1</span>
              <div>
                <h3 id="participant-step">先写名字</h3>
                <p>结果页会用它标记你的提交。</p>
              </div>
            </div>
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
          </section>

          {!isCandidatePoll ? (
            <section className={styles.availabilityStepBlock} aria-labelledby="quick-fill-step">
              <div className={styles.availabilityStepHeader}>
                <span className={styles.availabilityStepBadgeMuted}>2</span>
                <div>
                  <h3 id="quick-fill-step">任选一种快速预填</h3>
                  <p>有课表、日历、排班或固定作息时用；没有就跳过。</p>
                </div>
              </div>
              <AvailabilityImportPanel
                imageImportVisible={imageImportVisible}
                onPreviewApplied={setSelectedSlotKeys}
                publicId={publicId}
                scheduleTimezone={scheduleTimezone}
              />
            </section>
          ) : null}

          <section className={styles.availabilityStepBlock} aria-labelledby="manual-fill-step">
            <div className={styles.availabilityStepHeader}>
              <span className={styles.availabilityStepBadge}>{isCandidatePoll ? "2" : "3"}</span>
              <div>
                <h3 id="manual-fill-step">{isCandidatePoll ? "选择你的偏好" : "检查并涂选时间"}</h3>
                <p>
                  {isCandidatePoll
                    ? "对候选时间标记方便程度，想优先安排的时间可以排在前面。"
                    : "预填结果会落在这里，也可以直接手动填写。"}
                </p>
              </div>
            </div>
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
          </section>
        </div>

        {submitState.status === "error" ? (
          <p className={styles.error} role="alert">
            {submitState.message}
          </p>
        ) : null}

        <div className={styles.formActions}>
          <div>
            <strong>
              {isCandidatePoll ? "提交后会更新投票结果" : "提交后会更新大家的重叠时间"}
            </strong>
            <p>
              {isCandidatePoll
                ? "之后可以用编辑链接修改投票。"
                : "之后可以用编辑链接修改可用时间。"}
            </p>
          </div>
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
