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
import { localizedApiErrorMessage } from "../../../../i18n/api-error-messages";
import { rememberParticipantEditLink } from "../../participant-edit-link-memory";
import { rememberParticipantDisplayName } from "../../participant-name-memory";
import {
  schedulePageCopy,
  type AvailabilityFormCopy,
  type SchedulePageLocale
} from "../../schedule-page-copy";

interface EditAvailabilityFormProps {
  readonly editKey: string;
  readonly imageImportVisible: boolean;
  readonly initialAvailableSlots: readonly AvailabilitySlotInput[];
  readonly initialCandidateVotes?: readonly CandidateVoteInput[];
  readonly initialDisplayName: string;
  readonly locale?: SchedulePageLocale;
  readonly participantId: string;
  readonly publicId: string;
  readonly quickImportVisible?: boolean;
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

interface EditAvailabilityFormCopy {
  readonly closedBody: string;
  readonly closedTitle: string;
  readonly errorInvalidEditKey: string;
  readonly saveChanges: string;
  readonly savedBody: string;
  readonly savedTitle: string;
  readonly titleAvailability: string;
  readonly titleCandidate: string;
}

const editAvailabilityFormCopy: Record<SchedulePageLocale, EditAvailabilityFormCopy> = {
  "zh-CN": {
    closedBody: "组织者锁定或归档后，参与者不能再更新可用时间。",
    closedTitle: "这个日程已经停止接收修改",
    errorInvalidEditKey: "编辑链接无效或缺少密钥。",
    saveChanges: "保存修改",
    savedBody: "这条编辑链接仍然有效，可以继续用于调整可用时间。",
    savedTitle: "已保存修改",
    titleAvailability: "修改可用时间",
    titleCandidate: "修改候选投票"
  },
  en: {
    closedBody:
      "After the organizer locks or archives the schedule, participants can no longer update availability.",
    closedTitle: "This schedule is no longer accepting edits",
    errorInvalidEditKey: "The edit link is invalid or missing its key.",
    saveChanges: "Save Changes",
    savedBody: "This edit link is still valid if you need to adjust your response again.",
    savedTitle: "Changes Saved",
    titleAvailability: "Edit Availability",
    titleCandidate: "Edit Candidate Vote"
  }
};

export function EditAvailabilityForm({
  editKey,
  imageImportVisible,
  initialAvailableSlots,
  initialCandidateVotes = [],
  initialDisplayName,
  locale = "zh-CN",
  participantId,
  publicId,
  quickImportVisible = true,
  scheduleMode,
  scheduleStatus,
  scheduleTimezone,
  slots
}: EditAvailabilityFormProps) {
  const copySet = schedulePageCopy[locale];
  const copy = copySet.availabilityForm;
  const editCopy = editAvailabilityFormCopy[locale];
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
  const [candidateValidationError, setCandidateValidationError] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const isClosed = scheduleStatus !== "open";
  const isCandidatePoll = scheduleMode === "candidate_poll";
  const isSubmitting = submitState.status === "submitting";
  const showQuickImport = quickImportVisible && !isCandidatePoll;
  const candidateVoteCounts = countCandidateVotes(slots, candidateResponsesBySlotKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    if (isCandidatePoll && slots.some((slot) => !candidateResponsesBySlotKey.has(slotKey(slot)))) {
      setCandidateValidationError(true);
      setSubmitState({ status: "error", message: copy.errorCandidateResponseRequired });
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
        message: toErrorMessage(error, copy, editCopy, locale)
      });
    }
  }

  function setCandidateResponse(slot: CandidateVoteSlot, response: CandidateVoteResponse) {
    const nextResponses = new Map(candidateResponsesBySlotKey);
    nextResponses.set(slotKey(slot), response);
    setCandidateResponsesBySlotKey(nextResponses);

    if (slots.every((candidateSlot) => nextResponses.has(slotKey(candidateSlot)))) {
      setCandidateValidationError(false);
      if (
        submitState.status === "error" &&
        submitState.message === copy.errorCandidateResponseRequired
      ) {
        setSubmitState({ status: "idle" });
      }
    }

    setCandidatePreferenceRanksBySlotKey((currentRanks) => {
      const activeKeys = selectedCandidatePreferenceKeys(slots, nextResponses);
      const compactRanks = compactCandidatePreferenceRanks(currentRanks, activeKeys);

      if (response === "unavailable" || compactRanks.has(slotKey(slot))) {
        return compactRanks;
      }

      return updateCandidatePreferenceRanks(compactRanks, slot, activeKeys, "append");
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
          <h2 id="edit-availability-heading">
            {isCandidatePoll ? editCopy.titleCandidate : editCopy.titleAvailability}
          </h2>
          <span>{copy.closedBadge}</span>
        </div>
        <div className={styles.emptyState}>
          <strong>{editCopy.closedTitle}</strong>
          <p>{editCopy.closedBody}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.formSection} aria-labelledby="edit-availability-heading">
      <div className={styles.sectionHeader}>
        <h2 id="edit-availability-heading">
          {isCandidatePoll ? editCopy.titleCandidate : editCopy.titleAvailability}
        </h2>
        <span>
          {isCandidatePoll
            ? copy.candidateCountSummary(candidateVoteCounts.available, candidateVoteCounts.maybe)
            : copy.selectedCountSummary(selectedSlotKeys.size)}
        </span>
      </div>

      <form className={styles.availabilityForm} onSubmit={handleSubmit}>
        <label className={styles.participantField}>
          <span>{copy.displayName}</span>
          <input
            required
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
        </label>

        {showQuickImport ? (
          <AvailabilityImportPanel
            imageImportVisible={imageImportVisible}
            locale={locale}
            onPreviewApplied={setSelectedSlotKeys}
            publicId={publicId}
            scheduleTimezone={scheduleTimezone}
          />
        ) : null}

        {isCandidatePoll ? (
          <CandidateVoteList
            ariaLabel={copy.candidateHeading}
            copy={copySet.candidateVoteList}
            onChange={setCandidateResponse}
            onPreferenceMove={moveCandidatePreference}
            onPreferenceReorder={reorderCandidatePreference}
            preferenceRanksBySlotKey={candidatePreferenceRanksBySlotKey}
            responsesBySlotKey={candidateResponsesBySlotKey}
            showIncomplete={candidateValidationError}
            slots={slots}
          />
        ) : (
          <AvailabilitySlotGrid
            ariaLabel={copy.availabilityAria}
            copy={copySet.availabilitySlotGrid}
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
            <strong>{editCopy.savedTitle}</strong>
            <p>{editCopy.savedBody}</p>
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
            {editCopy.saveChanges}
          </button>
        </div>
      </form>
    </section>
  );
}

function toErrorMessage(
  error: unknown,
  copy: AvailabilityFormCopy,
  editCopy: EditAvailabilityFormCopy,
  locale: SchedulePageLocale
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return copy.errorDatabase;
    }

    if (error.code === "INVALID_EDIT_KEY") {
      return editCopy.errorInvalidEditKey;
    }

    if (error.code === "SCHEDULE_LOCKED") {
      return copy.errorLocked;
    }

    if (error.code === "SLOT_OUT_OF_RANGE") {
      return copy.errorSlotOutOfRange;
    }

    return localizedApiErrorMessage(error.code, locale);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return copy.errorValidation;
  }

  return copy.errorDefault;
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
