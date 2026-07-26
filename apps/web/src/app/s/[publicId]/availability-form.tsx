"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Clipboard, Loader2, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  createParticipantAvailability,
  type CreateParticipantAvailabilityResponse,
  type ScheduleDetail,
  type TimeSlotAvailabilityDto
} from "@schedule-share/api-client";

import styles from "./page.module.css";

interface AvailabilityFormProps {
  readonly publicId: string;
  readonly scheduleStatus: ScheduleDetail["status"];
  readonly slots: readonly TimeSlotAvailabilityDto[];
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "success"; readonly result: CreateParticipantAvailabilityResponse }
  | { readonly status: "error"; readonly message: string };

export function AvailabilityForm({ publicId, scheduleStatus, slots }: AvailabilityFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(() => new Set());
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const slotGroups = useMemo(() => groupSlotsByDate(slots), [slots]);
  const isClosed = scheduleStatus !== "open";
  const isSubmitting = submitState.status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    setSubmitState({ status: "submitting" });
    setCopied(false);

    try {
      const result = await createParticipantAvailability(publicId, {
        displayName,
        availableSlots: slots
          .filter((slot) => selectedSlotKeys.has(slotKey(slot)))
          .map((slot) => ({
            startUtc: slot.startUtc,
            endUtc: slot.endUtc
          }))
      });

      setSubmitState({
        status: "success",
        result
      });
      setSelectedSlotKeys(new Set());
      router.refresh();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: toErrorMessage(error)
      });
    }
  }

  function toggleSlot(key: string) {
    setSelectedSlotKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  }

  async function copyEditLink(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
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
        <h2 id="availability-heading">填写可用时间</h2>
        <span>{selectedSlotKeys.size} 个已选</span>
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

        <div className={styles.slotPicker} role="group" aria-label="可用时间">
          {slotGroups.map((group) => (
            <div className={styles.slotDay} key={group.date}>
              <h3>{group.date}</h3>
              <div className={styles.slotChoiceGrid}>
                {group.slots.map((slot) => {
                  const key = slotKey(slot);

                  return (
                    <label className={styles.slotChoice} key={key}>
                      <input
                        checked={selectedSlotKeys.has(key)}
                        onChange={() => toggleSlot(key)}
                        type="checkbox"
                      />
                      <span>
                        <strong>
                          {slot.localStartTime}-{slot.localEndTime}
                        </strong>
                        <small>{slot.availableParticipantCount} 人已选</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

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
            提交可用时间
          </button>
        </div>

        {submitState.status === "success" ? (
          <div className={styles.success} aria-live="polite">
            <strong>已提交</strong>
            <div className={styles.copyLinkRow}>
              <input readOnly value={submitState.result.editUrl} />
              <button
                className={styles.copyButton}
                onClick={() => copyEditLink(submitState.result.editUrl)}
                type="button"
              >
                <Clipboard aria-hidden="true" size={17} />
                {copied ? "已复制" : "复制"}
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}

function groupSlotsByDate(slots: readonly TimeSlotAvailabilityDto[]) {
  const groups = new Map<string, TimeSlotAvailabilityDto[]>();

  for (const slot of slots) {
    groups.set(slot.localStartDate, [...(groups.get(slot.localStartDate) ?? []), slot]);
  }

  return Array.from(groups, ([date, groupSlots]) => ({
    date,
    slots: groupSlots
  }));
}

function slotKey(slot: Pick<TimeSlotAvailabilityDto, "startUtc" | "endUtc">): string {
  return `${slot.startUtc}/${slot.endUtc}`;
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
