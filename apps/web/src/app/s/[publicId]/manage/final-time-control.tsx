"use client";

import { useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ApiClientError, confirmFinalTime, type ScheduleDetail } from "@schedule-share/api-client";

import styles from "../page.module.css";

export interface ConfirmableFinalTime {
  readonly endUtc: string;
  readonly startUtc: string;
}

interface ConfirmFinalTimeButtonProps {
  readonly isSelected: boolean;
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
  isSelected,
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
        message: toErrorMessage(error)
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
        {isSelected ? "已设为最终" : "设为最终"}
      </button>
      {submitState.status === "error" ? (
        <span className={styles.inlineActionError} role="alert">
          {submitState.message}
        </span>
      ) : null}
    </div>
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "INVALID_OWNER_KEY") {
      return "管理密钥无效。";
    }

    if (error.code === "VALIDATION_ERROR") {
      return "只能选择当前可确认的时间。";
    }

    if (error.code === "SCHEDULE_LOCKED") {
      return "归档后不能再设置。";
    }

    return error.message;
  }

  return "设置失败。";
}
