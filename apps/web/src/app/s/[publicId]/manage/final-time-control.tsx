"use client";

import { useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ApiClientError, confirmFinalTime, type ScheduleDetail } from "@schedule-share/api-client";

import { localizedApiErrorMessage } from "../../../i18n/api-error-messages";
import { confirmFinalTimeButtonCopy, type ConfirmFinalTimeButtonCopy } from "./manage-copy";
import type { SchedulePageLocale } from "../schedule-page-copy";
import styles from "../page.module.css";

export interface ConfirmableFinalTime {
  readonly endUtc: string;
  readonly startUtc: string;
}

interface ConfirmFinalTimeButtonProps {
  readonly copy?: ConfirmFinalTimeButtonCopy;
  readonly isSelected: boolean;
  readonly locale?: SchedulePageLocale;
  readonly ownerKey: string;
  readonly publicId: string;
  readonly status: ScheduleDetail["status"];
  readonly time: ConfirmableFinalTime;
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "error"; readonly message: string };

export function ConfirmFinalTimeButton({
  copy = confirmFinalTimeButtonCopy["zh-CN"],
  isSelected,
  locale = "zh-CN",
  ownerKey,
  publicId,
  status,
  time
}: ConfirmFinalTimeButtonProps) {
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const isArchived = status === "archived";
  const isSubmitting = submitState.status === "submitting";
  const isDisabled = isSelected || isArchived || isSubmitting;

  async function handleConfirm() {
    setSubmitState({ status: "submitting" });

    try {
      await confirmFinalTime(publicId, {
        ownerKey,
        startUtc: time.startUtc,
        endUtc: time.endUtc
      });
      setSubmitState({ status: "idle" });
      router.refresh();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: toErrorMessage(error, copy, locale)
      });
    }
  }

  return (
    <div className={styles.inlineActionStack}>
      <button
        className={`${styles.compactButton} ${isSelected ? styles.compactButtonActive : ""}`}
        disabled={isDisabled}
        onClick={handleConfirm}
        type="button"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className={styles.spinIcon} size={15} />
        ) : (
          <CalendarCheck aria-hidden="true" size={15} />
        )}
        {isSelected ? copy.selected : copy.select}
      </button>
      {submitState.status === "error" ? (
        <span className={styles.inlineActionError} role="alert">
          {submitState.message}
        </span>
      ) : null}
    </div>
  );
}

function toErrorMessage(
  error: unknown,
  copy: ConfirmFinalTimeButtonCopy,
  locale: SchedulePageLocale
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "INVALID_OWNER_KEY") {
      return copy.errorInvalidOwnerKey;
    }

    if (error.code === "VALIDATION_ERROR") {
      return copy.errorValidation;
    }

    if (error.code === "SCHEDULE_LOCKED") {
      return copy.errorArchived;
    }

    return localizedApiErrorMessage(error.code, locale);
  }

  return copy.errorDefault;
}
