"use client";

import { useState } from "react";
import { Archive, Calendar, Download, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  archiveSchedule,
  lockSchedule,
  type ScheduleDetail
} from "@schedule-share/api-client";

import { lockScheduleControlCopy, type LockScheduleControlCopy } from "./manage-copy";
import type { SchedulePageLocale } from "../schedule-page-copy";
import styles from "../page.module.css";

interface LockScheduleControlProps {
  readonly locale?: SchedulePageLocale;
  readonly ownerKey: string;
  readonly publicId: string;
  readonly status: ScheduleDetail["status"];
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "success" }
  | { readonly status: "error"; readonly message: string };

export function LockScheduleControl({
  locale = "zh-CN",
  ownerKey,
  publicId,
  status
}: LockScheduleControlProps) {
  const copy = lockScheduleControlCopy[locale];
  const router = useRouter();
  const [lockState, setLockState] = useState<SubmitState>({ status: "idle" });
  const [archiveState, setArchiveState] = useState<SubmitState>({ status: "idle" });
  const isArchived = status === "archived";
  const isLockDisabled = status !== "open";
  const isArchiveDisabled = isArchived;
  const isLockSubmitting = lockState.status === "submitting";
  const isArchiveSubmitting = archiveState.status === "submitting";
  const exportCsvUrl = `/api/schedules/${encodeURIComponent(publicId)}/export?${new URLSearchParams(
    {
      key: ownerKey
    }
  ).toString()}`;
  const exportIcsUrl = `/api/schedules/${encodeURIComponent(publicId)}/export?${new URLSearchParams(
    {
      format: "ics",
      key: ownerKey
    }
  ).toString()}`;

  async function handleLock() {
    setLockState({ status: "submitting" });

    try {
      await lockSchedule(publicId, { ownerKey });
      setLockState({ status: "success" });
      router.refresh();
    } catch (error) {
      setLockState({
        status: "error",
        message: toErrorMessage(error, copy)
      });
    }
  }

  async function handleArchive() {
    setArchiveState({ status: "submitting" });

    try {
      await archiveSchedule(publicId, { ownerKey });
      setArchiveState({ status: "success" });
      router.refresh();
    } catch (error) {
      setArchiveState({
        status: "error",
        message: toErrorMessage(error, copy)
      });
    }
  }

  return (
    <section className={styles.formSection} aria-labelledby="manage-actions-heading">
      <div className={styles.sectionHeader}>
        <h2 id="manage-actions-heading">{copy.heading}</h2>
        <span>{copy.statusLabel(status)}</span>
      </div>
      <div className={styles.actionPanel}>
        <div>
          <strong>{copy.actionTitle(status)}</strong>
          <p>{copy.actionDescription(status)}</p>
        </div>
        <div className={styles.managementActions}>
          <a className={styles.secondaryButton} href={exportCsvUrl}>
            <Download aria-hidden="true" size={18} />
            {copy.exportCsv}
          </a>
          <a className={styles.secondaryButton} href={exportIcsUrl}>
            <Calendar aria-hidden="true" size={18} />
            {copy.exportCalendar}
          </a>
          <button
            className={styles.dangerButton}
            disabled={isLockDisabled || isLockSubmitting}
            onClick={handleLock}
            type="button"
          >
            {isLockSubmitting ? (
              <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
            ) : (
              <Lock aria-hidden="true" size={18} />
            )}
            {copy.lock}
          </button>
          <button
            className={styles.secondaryButton}
            disabled={isArchiveDisabled || isArchiveSubmitting}
            onClick={handleArchive}
            type="button"
          >
            {isArchiveSubmitting ? (
              <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
            ) : (
              <Archive aria-hidden="true" size={18} />
            )}
            {copy.archive}
          </button>
        </div>
      </div>
      {lockState.status === "error" ? (
        <p className={styles.error} role="alert">
          {lockState.message}
        </p>
      ) : null}
      {archiveState.status === "error" ? (
        <p className={styles.error} role="alert">
          {archiveState.message}
        </p>
      ) : null}
      {lockState.status === "success" ? (
        <div className={styles.success} aria-live="polite">
          <strong>{copy.lockedSuccess}</strong>
        </div>
      ) : null}
      {archiveState.status === "success" ? (
        <div className={styles.success} aria-live="polite">
          <strong>{copy.archivedSuccess}</strong>
        </div>
      ) : null}
    </section>
  );
}

function toErrorMessage(error: unknown, copy: LockScheduleControlCopy): string {
  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return copy.errorDatabase;
    }

    if (error.code === "INVALID_OWNER_KEY") {
      return copy.errorInvalidOwnerKey;
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return copy.errorNotFound;
    }

    return error.message;
  }

  if (error instanceof Error && error.name === "ZodError") {
    return copy.errorValidation;
  }

  return copy.errorDefault;
}
