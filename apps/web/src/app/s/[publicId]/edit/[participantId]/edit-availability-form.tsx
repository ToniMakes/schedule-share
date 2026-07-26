"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  updateParticipantAvailability,
  type AvailabilitySlotInput,
  type ScheduleDetail,
  type TimeSlotDto
} from "@schedule-share/api-client";

import styles from "../../page.module.css";

interface EditAvailabilityFormProps {
  readonly editKey: string;
  readonly initialAvailableSlots: readonly AvailabilitySlotInput[];
  readonly initialDisplayName: string;
  readonly participantId: string;
  readonly publicId: string;
  readonly scheduleStatus: ScheduleDetail["status"];
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
  initialDisplayName,
  participantId,
  publicId,
  scheduleStatus,
  slots
}: EditAvailabilityFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(
    () => new Set(initialAvailableSlots.map(slotKey))
  );
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const slotGroups = useMemo(() => groupSlotsByDate(slots), [slots]);
  const isClosed = scheduleStatus !== "open";
  const isSubmitting = submitState.status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      await updateParticipantAvailability(publicId, participantId, {
        editKey,
        displayName,
        availableSlots: slots
          .filter((slot) => selectedSlotKeys.has(slotKey(slot)))
          .map((slot) => ({
            startUtc: slot.startUtc,
            endUtc: slot.endUtc
          }))
      });

      setSubmitState({ status: "success" });
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
        <h2 id="edit-availability-heading">修改可用时间</h2>
        <span>{selectedSlotKeys.size} 个已选</span>
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
                        <small>{slot.timezone}</small>
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

        {submitState.status === "success" ? (
          <div className={styles.success} aria-live="polite">
            <strong>已保存</strong>
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

function groupSlotsByDate(slots: readonly TimeSlotDto[]) {
  const groups = new Map<string, TimeSlotDto[]>();

  for (const slot of slots) {
    groups.set(slot.localStartDate, [...(groups.get(slot.localStartDate) ?? []), slot]);
  }

  return Array.from(groups, ([date, groupSlots]) => ({
    date,
    slots: groupSlots
  }));
}

function slotKey(slot: Pick<TimeSlotDto, "startUtc" | "endUtc">): string {
  return `${slot.startUtc}/${slot.endUtc}`;
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
