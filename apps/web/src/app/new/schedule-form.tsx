"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, Clipboard, Grid3X3, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";

import {
  ApiClientError,
  createSchedule,
  getHealthStatus,
  type CreateScheduleResponse
} from "@schedule-share/api-client";
import {
  CoreError,
  createCandidateTimeWindowFromLocal,
  type LocalDate,
  type LocalTime
} from "@schedule-share/core";

import {
  readRememberedScheduleFormDefaults,
  rememberScheduleFormDefaults
} from "./schedule-form-memory";
import { DisplayAd } from "../ads/display-ad";
import styles from "./page.module.css";

const dayOptions = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 0, label: "日" }
] as const;

const timezoneOptions = [
  "Australia/Sydney",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Europe/London",
  "America/Los_Angeles",
  "America/New_York"
];

type SlotMinutesOption = 15 | 30 | 60;
type ScheduleModeOption = "availability_grid" | "candidate_poll";
type CandidateTimeRow = {
  readonly id: string;
  readonly date: string;
  readonly endTime: string;
  readonly label: string;
  readonly startTime: string;
};
type FormError = {
  readonly detail: string;
  readonly title: string;
};
type SaveReadiness =
  | { readonly status: "checking" }
  | { readonly status: "available" }
  | { readonly status: "unavailable" }
  | { readonly status: "unknown" };
type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "success"; readonly result: CreateScheduleResponse }
  | { readonly status: "error"; readonly error: FormError };

export function NewScheduleForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [scheduleMode, setScheduleMode] = useState<ScheduleModeOption>("availability_grid");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotMinutes, setSlotMinutes] = useState<SlotMinutesOption>(30);
  const [candidateRows, setCandidateRows] = useState<readonly CandidateTimeRow[]>(() => [
    {
      id: "candidate-1",
      date: "",
      label: "",
      startTime: "09:00",
      endTime: "10:00"
    },
    {
      id: "candidate-2",
      date: "",
      label: "",
      startTime: "14:00",
      endTime: "15:00"
    }
  ]);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    () => new Set(dayOptions.map((day) => day.value))
  );
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [saveReadiness, setSaveReadiness] = useState<SaveReadiness>({ status: "checking" });
  const [copiedTarget, setCopiedTarget] = useState<"share" | "owner" | undefined>();

  useEffect(() => {
    const rememberedDefaults = readRememberedScheduleFormDefaults(window.localStorage);

    if (rememberedDefaults !== undefined) {
      if (rememberedDefaults.timezone !== undefined) {
        setTimezone(rememberedDefaults.timezone);
      }

      if (rememberedDefaults.scheduleMode !== undefined) {
        setScheduleMode(rememberedDefaults.scheduleMode);
      }

      if (rememberedDefaults.slotMinutes !== undefined) {
        setSlotMinutes(rememberedDefaults.slotMinutes);
      }

      if (rememberedDefaults.availabilityGrid?.startTime !== undefined) {
        setStartTime(rememberedDefaults.availabilityGrid.startTime);
      }

      if (rememberedDefaults.availabilityGrid?.endTime !== undefined) {
        setEndTime(rememberedDefaults.availabilityGrid.endTime);
      }

      if (rememberedDefaults.availabilityGrid?.daysOfWeek !== undefined) {
        setSelectedDays(new Set(rememberedDefaults.availabilityGrid.daysOfWeek));
      }

      return;
    }

    const resolvedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (resolvedTimezone) {
      setTimezone(resolvedTimezone);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function checkSaveReadiness() {
      try {
        const health = await getHealthStatus();

        if (!isCurrent) {
          return;
        }

        setSaveReadiness(
          health.status === "healthy" && health.checks.database === "ok"
            ? { status: "available" }
            : { status: "unavailable" }
        );
      } catch {
        if (isCurrent) {
          setSaveReadiness({ status: "unknown" });
        }
      }
    }

    void checkSaveReadiness();

    return () => {
      isCurrent = false;
    };
  }, []);

  const sortedSelectedDays = useMemo(
    () => dayOptions.map((day) => day.value).filter((day) => selectedDays.has(day)),
    [selectedDays]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    if (scheduleMode === "availability_grid" && sortedSelectedDays.length === 0) {
      setSubmitState({
        status: "error",
        error: {
          title: "请选择可选日期",
          detail: "至少需要选择一天，系统才能生成候选时间。"
        }
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    setSubmitState({ status: "submitting" });
    setCopiedTarget(undefined);

    try {
      const commonInput = {
        title: readFormString(formData, "title"),
        description: readOptionalFormString(formData, "description"),
        timezone: readFormString(formData, "timezone")
      };
      const selectedStartTime =
        scheduleMode === "availability_grid" ? readFormString(formData, "startTime") : startTime;
      const selectedEndTime =
        scheduleMode === "availability_grid" ? readFormString(formData, "endTime") : endTime;
      const result =
        scheduleMode === "candidate_poll"
          ? await createSchedule({
              ...commonInput,
              scheduleMode: "candidate_poll",
              slotMinutes,
              candidateWindows: candidateRows.map((row) =>
                createCandidateTimeWindowFromLocal({
                  ...(row.label.trim().length === 0 ? {} : { label: row.label }),
                  localDate: row.date as LocalDate,
                  startTime: row.startTime as LocalTime,
                  endTime: row.endTime as LocalTime,
                  timezone: commonInput.timezone
                })
              )
            })
          : await createSchedule({
              ...commonInput,
              scheduleMode: "availability_grid",
              dateRange: {
                start: readFormString(formData, "dateStart"),
                end: readFormString(formData, "dateEnd")
              },
              slotMinutes,
              dailyWindows: [
                {
                  daysOfWeek:
                    sortedSelectedDays.length === dayOptions.length
                      ? undefined
                      : sortedSelectedDays,
                  startTime: selectedStartTime,
                  endTime: selectedEndTime
                }
              ]
            });

      setSubmitState({
        status: "success",
        result
      });
      rememberScheduleFormDefaults(window.localStorage, {
        availabilityGrid: {
          daysOfWeek: sortedSelectedDays,
          endTime: selectedEndTime,
          startTime: selectedStartTime
        },
        scheduleMode,
        slotMinutes,
        timezone: commonInput.timezone
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        error: toFormError(error)
      });
    }
  }

  function toggleDay(day: number) {
    setSelectedDays((currentDays) => {
      const nextDays = new Set(currentDays);

      if (nextDays.has(day)) {
        nextDays.delete(day);
      } else {
        nextDays.add(day);
      }

      return nextDays;
    });
  }

  function addCandidateRow() {
    setCandidateRows((currentRows) => [
      ...currentRows,
      {
        id: `candidate-${Date.now()}`,
        date: "",
        label: "",
        startTime: "09:00",
        endTime: "10:00"
      }
    ]);
  }

  function removeCandidateRow(id: string) {
    setCandidateRows((currentRows) =>
      currentRows.length <= 1 ? currentRows : currentRows.filter((row) => row.id !== id)
    );
  }

  function updateCandidateRow(id: string, updates: Partial<Omit<CandidateTimeRow, "id">>) {
    setCandidateRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  }

  async function copyLink(target: "share" | "owner", value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedTarget(target);
  }

  const isSubmitting = submitState.status === "submitting";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <ReadinessNotice saveReadiness={saveReadiness} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>基本信息</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>标题</span>
            <input
              required
              maxLength={120}
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="周末聚餐"
              value={title}
            />
          </label>
          <label className={styles.field}>
            <span>时区</span>
            <input
              required
              list="timezone-options"
              name="timezone"
              onChange={(event) => setTimezone(event.target.value)}
              value={timezone}
            />
            <datalist id="timezone-options">
              {timezoneOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>说明</span>
            <textarea
              maxLength={1000}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="可选"
              rows={3}
              value={description}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>创建方式</h2>
        <div className={styles.modeGrid} role="radiogroup" aria-label="创建方式">
          <label className={styles.modeChoice}>
            <input
              checked={scheduleMode === "availability_grid"}
              name="scheduleMode"
              onChange={() => setScheduleMode("availability_grid")}
              type="radio"
              value="availability_grid"
            />
            <span>
              <Grid3X3 aria-hidden="true" size={18} />
              开放网格
            </span>
          </label>
          <label className={styles.modeChoice}>
            <input
              checked={scheduleMode === "candidate_poll"}
              name="scheduleMode"
              onChange={() => setScheduleMode("candidate_poll")}
              type="radio"
              value="candidate_poll"
            />
            <span>
              <ListChecks aria-hidden="true" size={18} />
              候选投票
            </span>
          </label>
        </div>
      </section>

      {scheduleMode === "availability_grid" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>时间范围</h2>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>开始日期</span>
                <input
                  required
                  name="dateStart"
                  onChange={(event) => setDateStart(event.target.value)}
                  type="date"
                  value={dateStart}
                />
              </label>
              <label className={styles.field}>
                <span>结束日期</span>
                <input
                  required
                  min={dateStart}
                  name="dateEnd"
                  onChange={(event) => setDateEnd(event.target.value)}
                  type="date"
                  value={dateEnd}
                />
              </label>
              <label className={styles.field}>
                <span>开始时间</span>
                <input
                  required
                  name="startTime"
                  onChange={(event) => setStartTime(event.target.value)}
                  step={900}
                  type="time"
                  value={startTime}
                />
              </label>
              <label className={styles.field}>
                <span>结束时间</span>
                <input
                  required
                  name="endTime"
                  onChange={(event) => setEndTime(event.target.value)}
                  step={900}
                  type="time"
                  value={endTime}
                />
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>可选日期</h2>
            <div className={styles.dayGrid} role="group" aria-label="可选日期">
              {dayOptions.map((day) => (
                <label className={styles.dayToggle} key={day.value}>
                  <input
                    checked={selectedDays.has(day.value)}
                    onChange={() => toggleDay(day.value)}
                    type="checkbox"
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>时间粒度</h2>
            <div className={styles.segmented} role="radiogroup" aria-label="时间粒度">
              {([15, 30, 60] as const).map((minutes) => (
                <label className={styles.segment} key={minutes}>
                  <input
                    checked={slotMinutes === minutes}
                    name="slotMinutes"
                    onChange={() => setSlotMinutes(minutes)}
                    type="radio"
                    value={minutes}
                  />
                  <span>{minutes} 分钟</span>
                </label>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>候选时间</h2>
            <button className={styles.inlineButton} onClick={addCandidateRow} type="button">
              <Plus aria-hidden="true" size={16} />
              新增候选
            </button>
          </div>
          <div className={styles.candidateList}>
            {candidateRows.map((row, index) => (
              <div className={styles.candidateRow} key={row.id}>
                <label className={styles.field}>
                  <span>标签</span>
                  <input
                    maxLength={120}
                    onChange={(event) => updateCandidateRow(row.id, { label: event.target.value })}
                    placeholder={`候选 ${index + 1}`}
                    value={row.label}
                  />
                </label>
                <label className={styles.field}>
                  <span>日期</span>
                  <input
                    required
                    onChange={(event) => updateCandidateRow(row.id, { date: event.target.value })}
                    type="date"
                    value={row.date}
                  />
                </label>
                <label className={styles.field}>
                  <span>开始</span>
                  <input
                    required
                    onChange={(event) =>
                      updateCandidateRow(row.id, { startTime: event.target.value })
                    }
                    step={900}
                    type="time"
                    value={row.startTime}
                  />
                </label>
                <label className={styles.field}>
                  <span>结束</span>
                  <input
                    required
                    onChange={(event) =>
                      updateCandidateRow(row.id, { endTime: event.target.value })
                    }
                    step={900}
                    type="time"
                    value={row.endTime}
                  />
                </label>
                <button
                  aria-label={`删除候选 ${index + 1}`}
                  className={styles.iconButton}
                  disabled={candidateRows.length <= 1}
                  onClick={() => removeCandidateRow(row.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {submitState.status === "error" ? <ErrorPanel error={submitState.error} /> : null}

      <div className={styles.actions}>
        <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
          ) : (
            <CalendarPlus aria-hidden="true" size={18} />
          )}
          创建日程
        </button>
      </div>

      {submitState.status === "success" ? (
        <section className={styles.result} aria-live="polite">
          <h2 className={styles.sectionTitle}>已创建</h2>
          <LinkRow
            copied={copiedTarget === "share"}
            label="分享链接"
            onCopy={() => copyLink("share", submitState.result.shareUrl)}
            value={submitState.result.shareUrl}
          />
          <LinkRow
            copied={copiedTarget === "owner"}
            label="管理链接"
            onCopy={() => copyLink("owner", submitState.result.ownerUrl)}
            value={submitState.result.ownerUrl}
          />
          <DisplayAd pageContext="create" placement="post-submit" />
        </section>
      ) : null}
    </form>
  );
}

function ReadinessNotice({ saveReadiness }: { readonly saveReadiness: SaveReadiness }) {
  if (saveReadiness.status === "checking" || saveReadiness.status === "available") {
    return null;
  }

  if (saveReadiness.status === "unknown") {
    return (
      <section className={styles.notice} aria-live="polite">
        <h2>无法确认保存状态</h2>
        <p>服务状态检查没有返回预期结果。你仍可以填写表单，提交时会再次确认。</p>
      </section>
    );
  }

  return (
    <section className={styles.notice} aria-live="polite">
      <h2>暂时无法保存日程</h2>
      <p>当前环境还没有连接数据库。页面可以预览，接入 Postgres 后就能创建和分享真实日程。</p>
    </section>
  );
}

function ErrorPanel({ error }: { readonly error: FormError }) {
  return (
    <section className={styles.error} role="alert">
      <h2>{error.title}</h2>
      <p>{error.detail}</p>
    </section>
  );
}

function LinkRow({
  copied,
  label,
  onCopy,
  value
}: {
  readonly copied: boolean;
  readonly label: string;
  readonly onCopy: () => void;
  readonly value: string;
}) {
  return (
    <div className={styles.linkRow}>
      <label className={styles.field}>
        <span>{label}</span>
        <input readOnly value={value} />
      </label>
      <button className={styles.copyButton} onClick={onCopy} type="button">
        <Clipboard aria-hidden="true" size={17} />
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}

function toFormError(error: unknown): FormError {
  if (error instanceof CoreError) {
    return {
      title: "请检查候选时间",
      detail: error.message
    };
  }

  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return {
        title: "暂时无法保存日程",
        detail: "当前环境还没有连接数据库。接入 Postgres 后就能创建和分享真实日程。"
      };
    }

    if (error.code === "VALIDATION_ERROR") {
      return {
        title: "请检查表单内容",
        detail: "有些输入没有通过校验，请确认日期、时间和标题后再试。"
      };
    }

    return {
      title: "创建失败",
      detail: error.message
    };
  }

  if (error instanceof Error) {
    if (error.name === "ZodError") {
      return {
        title: "请检查表单内容",
        detail: "有些输入没有通过校验，请确认日期、时间和标题后再试。"
      };
    }

    return {
      title: "创建失败",
      detail: error.message
    };
  }

  return {
    title: "创建失败",
    detail: "请稍后再试。"
  };
}

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalFormString(formData: FormData, key: string): string | undefined {
  const value = readFormString(formData, key).trim();
  return value.length === 0 ? undefined : value;
}
