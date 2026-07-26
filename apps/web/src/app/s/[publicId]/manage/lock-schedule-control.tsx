"use client";

import { useState } from "react";
import { Archive, Download, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  archiveSchedule,
  lockSchedule,
  type ScheduleDetail
} from "@schedule-share/api-client";

import styles from "../page.module.css";

interface LockScheduleControlProps {
  readonly ownerKey: string;
  readonly publicId: string;
  readonly status: ScheduleDetail["status"];
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "success" }
  | { readonly status: "error"; readonly message: string };

export function LockScheduleControl({ ownerKey, publicId, status }: LockScheduleControlProps) {
  const router = useRouter();
  const [lockState, setLockState] = useState<SubmitState>({ status: "idle" });
  const [archiveState, setArchiveState] = useState<SubmitState>({ status: "idle" });
  const isArchived = status === "archived";
  const isLockDisabled = status !== "open";
  const isArchiveDisabled = isArchived;
  const isLockSubmitting = lockState.status === "submitting";
  const isArchiveSubmitting = archiveState.status === "submitting";
  const exportUrl = `/api/schedules/${encodeURIComponent(publicId)}/export?${new URLSearchParams({
    key: ownerKey
  }).toString()}`;

  async function handleLock() {
    setLockState({ status: "submitting" });

    try {
      await lockSchedule(publicId, { ownerKey });
      setLockState({ status: "success" });
      router.refresh();
    } catch (error) {
      setLockState({
        status: "error",
        message: toErrorMessage(error)
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
        message: toErrorMessage(error)
      });
    }
  }

  return (
    <section className={styles.formSection} aria-labelledby="manage-actions-heading">
      <div className={styles.sectionHeader}>
        <h2 id="manage-actions-heading">管理操作</h2>
        <span>{statusLabel(status)}</span>
      </div>
      <div className={styles.actionPanel}>
        <div>
          <strong>{actionTitle(status)}</strong>
          <p>{actionDescription(status)}</p>
        </div>
        <div className={styles.managementActions}>
          <a className={styles.secondaryButton} href={exportUrl}>
            <Download aria-hidden="true" size={18} />
            导出 CSV
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
            锁定
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
            归档
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
          <strong>已锁定</strong>
        </div>
      ) : null}
      {archiveState.status === "success" ? (
        <div className={styles.success} aria-live="polite">
          <strong>已归档</strong>
        </div>
      ) : null}
    </section>
  );
}

function actionTitle(status: ScheduleDetail["status"]): string {
  if (status === "archived") {
    return "日程已经归档";
  }

  if (status === "locked") {
    return "日程已经锁定";
  }

  return "管理日程";
}

function actionDescription(status: ScheduleDetail["status"]): string {
  if (status === "archived") {
    return "归档后参与者不能再提交或修改时间。";
  }

  if (status === "locked") {
    return "参与者不能再提交或修改时间，你仍可以导出结果或归档日程。";
  }

  return "锁定会停止参与者提交；归档会把日程标记为已结束。";
}

function statusLabel(status: ScheduleDetail["status"]): string {
  if (status === "open") {
    return "开放中";
  }

  if (status === "locked") {
    return "已锁定";
  }

  return "已归档";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return "数据库尚未配置。";
    }

    if (error.code === "INVALID_OWNER_KEY") {
      return "管理链接无效或缺少密钥。";
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return "这个日程不存在或链接有误。";
    }

    return error.message;
  }

  if (error instanceof Error && error.name === "ZodError") {
    return "请检查管理密钥。";
  }

  return "锁定失败。";
}
