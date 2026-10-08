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
import { localizedApiErrorMessage } from "../../i18n/api-error-messages";
import {
  schedulePageCopy,
  type AvailabilityFormCopy,
  type SchedulePageLocale
} from "./schedule-page-copy";

interface AvailabilityFormProps {
  readonly imageImportVisible: boolean;
  readonly locale?: SchedulePageLocale;
  readonly publicId: string;
  readonly quickImportVisible?: boolean;
  readonly scheduleMode: ScheduleDetail["scheduleMode"];
  readonly scheduleStatus: ScheduleDetail["status"];
  readonly scheduleTimezone: string;
  readonly slots: readonly TimeSlotAvailabilityDto[];
  readonly totalParticipantCount: number;
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | {
      readonly status: "success";
      readonly editUrl: string;
      readonly result: CreateParticipantAvailabilityResponse;
    }
  | { readonly status: "error"; readonly message: string };

type CopyState = "idle" | "copied" | "failed";

export function AvailabilityForm({
  imageImportVisible,
  locale = "zh-CN",
  publicId,
  quickImportVisible = true,
  scheduleMode,
  scheduleStatus,
  scheduleTimezone,
  slots,
  totalParticipantCount
}: AvailabilityFormProps) {
  const copySet = schedulePageCopy[locale];
  const copy = copySet.availabilityForm;
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(() => new Set());
  const [candidateResponsesBySlotKey, setCandidateResponsesBySlotKey] = useState<
    Map<string, CandidateVoteResponse>
  >(() => new Map());
  const [candidatePreferenceRanksBySlotKey, setCandidatePreferenceRanksBySlotKey] = useState<
    Map<string, number>
  >(() => new Map());
  const [candidateValidationError, setCandidateValidationError] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const isClosed = scheduleStatus !== "open";
  const isCandidatePoll = scheduleMode === "candidate_poll";
  const isSubmitting = submitState.status === "submitting";
  const showQuickImport = quickImportVisible && !isCandidatePoll;
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

    if (isCandidatePoll && slots.some((slot) => !candidateResponsesBySlotKey.has(slotKey(slot)))) {
      setCandidateValidationError(true);
      setSubmitState({ status: "error", message: copy.errorCandidateResponseRequired });
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
      const editUrl = localizeEditUrl(result.editUrl, locale);

      setSubmitState({
        status: "success",
        editUrl,
        result
      });
      rememberParticipantDisplayName(window.localStorage, result.participant.displayName);
      rememberParticipantEditLink(window.localStorage, {
        displayName: result.participant.displayName,
        editUrl,
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
        message: toErrorMessage(error, copy, locale)
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
      <section className={styles.formSection} aria-labelledby="availability-heading">
        <div className={styles.sectionHeader}>
          <h2 id="availability-heading">{copy.title}</h2>
          <span>{copy.closedBadge}</span>
        </div>
        <div className={styles.emptyState}>
          <strong>{copy.closedTitle}</strong>
          <p>{copy.closedBody}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.formSection} aria-labelledby="availability-heading">
      <div className={styles.sectionHeader}>
        <h2 id="availability-heading">{isCandidatePoll ? copy.voteTitle : copy.title}</h2>
        <span>
          {isCandidatePoll
            ? copy.candidateCountSummary(candidateVoteCounts.available, candidateVoteCounts.maybe)
            : copy.selectedCountSummary(selectedSlotKeys.size)}
        </span>
      </div>

      <form className={styles.availabilityForm} onSubmit={handleSubmit}>
        <ol className={styles.availabilityFlowSteps} aria-label={copy.flowAria}>
          <li className={displayName.trim().length > 0 ? styles.availabilityFlowStepDone : ""}>
            <span>1</span>
            <strong>{copy.stepName}</strong>
          </li>
          {showQuickImport ? (
            <li>
              <span>2</span>
              <strong>{copy.stepImport}</strong>
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
            <span>{isCandidatePoll || !showQuickImport ? "2" : "3"}</span>
            <strong>{isCandidatePoll ? copy.stepVote : copy.stepManual}</strong>
          </li>
          <li>
            <span>{isCandidatePoll || !showQuickImport ? "3" : "4"}</span>
            <strong>{copy.stepSubmit}</strong>
          </li>
        </ol>

        <div className={styles.availabilityFlow}>
          <section className={styles.availabilityStepBlock} aria-labelledby="participant-step">
            <div className={styles.availabilityStepHeader}>
              <span className={styles.availabilityStepBadge}>1</span>
              <div>
                <h3 id="participant-step">{copy.nameStepTitle}</h3>
                <p>{copy.nameStepBody}</p>
              </div>
            </div>
            <label className={styles.participantField}>
              <span>{copy.displayName}</span>
              <input
                required
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={copy.displayNamePlaceholder}
                value={displayName}
              />
            </label>
          </section>

          {showQuickImport ? (
            <section className={styles.availabilityStepBlock} aria-labelledby="quick-fill-step">
              <div className={styles.availabilityStepHeader}>
                <span className={styles.availabilityStepBadgeMuted}>2</span>
                <div>
                  <h3 id="quick-fill-step">{copy.importStepTitle}</h3>
                  <p>{copy.importStepBody}</p>
                </div>
              </div>
              <AvailabilityImportPanel
                imageImportVisible={imageImportVisible}
                locale={locale}
                onPreviewApplied={setSelectedSlotKeys}
                publicId={publicId}
                scheduleTimezone={scheduleTimezone}
              />
            </section>
          ) : null}

          <section className={styles.availabilityStepBlock} aria-labelledby="manual-fill-step">
            <div className={styles.availabilityStepHeader}>
              <span className={styles.availabilityStepBadge}>
                {isCandidatePoll || !showQuickImport ? "2" : "3"}
              </span>
              <div>
                <h3 id="manual-fill-step">
                  {isCandidatePoll ? copy.manualStepCandidateTitle : copy.manualStepTitle}
                </h3>
                <p>{isCandidatePoll ? copy.manualStepCandidateBody : copy.manualStepBody}</p>
              </div>
            </div>
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
                totalParticipantCount={totalParticipantCount}
              />
            ) : (
              <AvailabilitySlotGrid
                ariaLabel={copy.availabilityAria}
                copy={copySet.availabilitySlotGrid}
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
              {isCandidatePoll ? copy.submitTitleCandidate : copy.submitTitleAvailability}
            </strong>
            <p>{isCandidatePoll ? copy.submitHintCandidate : copy.submitHintAvailability}</p>
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
            {isCandidatePoll ? copy.submitCandidate : copy.submitAvailability}
          </button>
        </div>

        {submitState.status === "success" ? (
          <div className={styles.success} aria-live="polite">
            <strong>{copy.successTitle}</strong>
            <p>{copy.successBody}</p>
            <div className={styles.copyLinkRow}>
              <input aria-label={copy.editLinkAria} readOnly value={submitState.editUrl} />
              <button
                className={styles.copyButton}
                onClick={() => copyEditLink(submitState.editUrl)}
                type="button"
              >
                <Clipboard aria-hidden="true" size={17} />
                {copyState === "copied" ? copy.copied : copy.copy}
              </button>
            </div>
            {copyState === "failed" ? (
              <p className={styles.inlineWarning}>{copy.copyFailed}</p>
            ) : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}

function toErrorMessage(
  error: unknown,
  copy: AvailabilityFormCopy,
  locale: SchedulePageLocale
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return copy.errorDatabase;
    }

    if (error.code === "SCHEDULE_LOCKED") {
      return copy.errorLocked;
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return copy.errorNotFound;
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

function localizeEditUrl(editUrl: string, locale: SchedulePageLocale): string {
  if (locale !== "zh-CN") {
    return editUrl;
  }

  try {
    const url = new URL(editUrl);

    if (url.pathname.startsWith("/s/")) {
      url.pathname = `/zh${url.pathname}`;
    }

    return url.toString();
  } catch {
    if (editUrl.startsWith("/s/")) {
      return `/zh${editUrl}`;
    }

    return editUrl;
  }
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
