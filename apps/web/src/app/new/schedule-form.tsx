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
import {
  dayValues,
  newScheduleFormCopy,
  type NewScheduleFormCopy,
  type NewScheduleFormLocale
} from "./schedule-form-copy";
import { DisplayAd } from "../ads/display-ad";
import styles from "./page.module.css";

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

export function NewScheduleForm({ locale = "zh-CN" }: { readonly locale?: NewScheduleFormLocale }) {
  const copy = newScheduleFormCopy[locale];
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
  const [selectedDays, setSelectedDays] = useState<Set<number>>(() => new Set<number>(dayValues));
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
    () => dayValues.filter((day) => selectedDays.has(day)),
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
          title: copy.selectDateErrorTitle,
          detail: copy.selectDateErrorBody
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
                    sortedSelectedDays.length === dayValues.length ? undefined : sortedSelectedDays,
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
        error: toFormError(error, copy)
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
      <ReadinessNotice copy={copy} saveReadiness={saveReadiness} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy.basicInfo}</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>{copy.title}</span>
            <input
              required
              maxLength={120}
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder={copy.titlePlaceholder}
              value={title}
            />
          </label>
          <label className={styles.field}>
            <span>{copy.timezone}</span>
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
            <span>{copy.description}</span>
            <textarea
              maxLength={1000}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy.descriptionPlaceholder}
              rows={3}
              value={description}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy.creationMethod}</h2>
        <div className={styles.modeGrid} role="radiogroup" aria-label={copy.creationMethodAria}>
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
              {copy.gridMode}
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
              {copy.candidatePoll}
            </span>
          </label>
        </div>
      </section>

      {scheduleMode === "availability_grid" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{copy.timeRange}</h2>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{copy.startDate}</span>
                <input
                  required
                  name="dateStart"
                  onChange={(event) => setDateStart(event.target.value)}
                  type="date"
                  value={dateStart}
                />
              </label>
              <label className={styles.field}>
                <span>{copy.endDate}</span>
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
                <span>{copy.startTime}</span>
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
                <span>{copy.endTime}</span>
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
            <h2 className={styles.sectionTitle}>{copy.availableDays}</h2>
            <div className={styles.dayGrid} role="group" aria-label={copy.availableDaysAria}>
              {dayValues.map((day) => (
                <label className={styles.dayToggle} key={day}>
                  <input
                    checked={selectedDays.has(day)}
                    onChange={() => toggleDay(day)}
                    type="checkbox"
                  />
                  <span>{copy.dayLabels[day]}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{copy.slotMinutes}</h2>
            <div className={styles.segmented} role="radiogroup" aria-label={copy.slotMinutesAria}>
              {([15, 30, 60] as const).map((minutes) => (
                <label className={styles.segment} key={minutes}>
                  <input
                    checked={slotMinutes === minutes}
                    name="slotMinutes"
                    onChange={() => setSlotMinutes(minutes)}
                    type="radio"
                    value={minutes}
                  />
                  <span>{copy.minuteLabel(minutes)}</span>
                </label>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>{copy.candidates}</h2>
            <button className={styles.inlineButton} onClick={addCandidateRow} type="button">
              <Plus aria-hidden="true" size={16} />
              {copy.addCandidate}
            </button>
          </div>
          <div className={styles.candidateList}>
            {candidateRows.map((row, index) => (
              <div className={styles.candidateRow} key={row.id}>
                <label className={styles.field}>
                  <span>{copy.candidateLabel}</span>
                  <input
                    maxLength={120}
                    onChange={(event) => updateCandidateRow(row.id, { label: event.target.value })}
                    placeholder={copy.candidatePlaceholder(index)}
                    value={row.label}
                  />
                </label>
                <label className={styles.field}>
                  <span>{copy.candidateDate}</span>
                  <input
                    required
                    onChange={(event) => updateCandidateRow(row.id, { date: event.target.value })}
                    type="date"
                    value={row.date}
                  />
                </label>
                <label className={styles.field}>
                  <span>{copy.startTime}</span>
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
                  <span>{copy.candidateEnd}</span>
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
                  aria-label={copy.deleteCandidateAria(index)}
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
          {copy.create}
        </button>
      </div>

      {submitState.status === "success" ? (
        <section className={styles.result} aria-live="polite">
          <h2 className={styles.sectionTitle}>{copy.created}</h2>
          <LinkRow
            copied={copiedTarget === "share"}
            copy={copy.copy}
            copiedLabel={copy.copied}
            label={copy.shareLink}
            onCopy={() => copyLink("share", toLocalizedShareUrl(submitState.result.shareUrl, copy))}
            value={toLocalizedShareUrl(submitState.result.shareUrl, copy)}
          />
          <LinkRow
            copied={copiedTarget === "owner"}
            copy={copy.copy}
            copiedLabel={copy.copied}
            label={copy.managerLink}
            onCopy={() => copyLink("owner", toLocalizedOwnerUrl(submitState.result.ownerUrl, copy))}
            value={toLocalizedOwnerUrl(submitState.result.ownerUrl, copy)}
          />
          <DisplayAd pageContext="create" placement="post-submit" />
        </section>
      ) : null}
    </form>
  );
}

function ReadinessNotice({
  copy,
  saveReadiness
}: {
  readonly copy: NewScheduleFormCopy;
  readonly saveReadiness: SaveReadiness;
}) {
  if (saveReadiness.status === "checking" || saveReadiness.status === "available") {
    return null;
  }

  if (saveReadiness.status === "unknown") {
    return (
      <section className={styles.notice} aria-live="polite">
        <h2>{copy.saveUnknownTitle}</h2>
        <p>{copy.saveUnknownBody}</p>
      </section>
    );
  }

  return (
    <section className={styles.notice} aria-live="polite">
      <h2>{copy.saveUnavailableTitle}</h2>
      <p>{copy.saveUnavailableBody}</p>
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
  copiedLabel,
  copy,
  label,
  onCopy,
  value
}: {
  readonly copied: boolean;
  readonly copiedLabel: string;
  readonly copy: string;
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
        {copied ? copiedLabel : copy}
      </button>
    </div>
  );
}

function toFormError(error: unknown, copy: NewScheduleFormCopy): FormError {
  if (error instanceof CoreError) {
    return {
      title: copy.coreErrorTitle,
      detail: error.message
    };
  }

  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return {
        title: copy.databaseErrorTitle,
        detail: copy.databaseErrorBody
      };
    }

    if (error.code === "VALIDATION_ERROR") {
      return {
        title: copy.submitValidationTitle,
        detail: copy.submitValidationBody
      };
    }

    return {
      title: copy.createFailedTitle,
      detail: error.message
    };
  }

  if (error instanceof Error) {
    if (error.name === "ZodError") {
      return {
        title: copy.submitValidationTitle,
        detail: copy.submitValidationBody
      };
    }

    return {
      title: copy.createFailedTitle,
      detail: error.message
    };
  }

  return {
    title: copy.createFailedTitle,
    detail: copy.createFailedBody
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

function toLocalizedShareUrl(shareUrl: string, copy: NewScheduleFormCopy): string {
  try {
    const parsedUrl = new URL(shareUrl);
    const publicId = parsedUrl.pathname.match(/^\/s\/([^/]+)$/)?.[1];

    if (publicId === undefined) {
      return shareUrl;
    }

    parsedUrl.pathname = `${copy.publicSchedulePathPrefix}${publicId}`;
    return parsedUrl.toString();
  } catch {
    return shareUrl;
  }
}

function toLocalizedOwnerUrl(ownerUrl: string, copy: NewScheduleFormCopy): string {
  try {
    const parsedUrl = new URL(ownerUrl);
    const match = parsedUrl.pathname.match(/^\/s\/([^/]+)\/manage$/);
    const publicId = match?.[1];

    if (publicId === undefined) {
      return ownerUrl;
    }

    parsedUrl.pathname = `${copy.managerSchedulePathPrefix}${publicId}/manage`;
    return parsedUrl.toString();
  } catch {
    return ownerUrl;
  }
}
