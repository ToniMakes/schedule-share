"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileText,
  FileUp,
  ImagePlus,
  Loader2,
  Save,
  Trash2
} from "lucide-react";

import {
  ApiClientError,
  previewAvailability,
  previewAvailabilityCsv,
  previewAvailabilityIcs,
  previewAvailabilityImage,
  type AvailabilityPreviewResponse
} from "@schedule-share/api-client";

import {
  buildPreviewBusyBlockSummaries,
  collectPreviewWarnings,
  previewConfidenceText,
  type PreviewBusyBlockSummary
} from "./availability-import-preview";
import { slotKey } from "./availability-slot-grid";
import {
  deleteSavedParticipantTemplate,
  readRememberedParticipantTemplate,
  readSavedParticipantTemplates,
  rememberParticipantTemplate,
  saveParticipantTemplate,
  type RememberedTemplateDay,
  type SavedParticipantTemplate
} from "./participant-template-memory";
import styles from "./page.module.css";

interface AvailabilityImportPanelProps {
  readonly imageImportVisible: boolean;
  readonly onPreviewApplied: (selectedSlotKeys: Set<string>) => void;
  readonly publicId: string;
  readonly scheduleTimezone: string;
}

type PreviewMethod = "text" | "image" | "ics" | "csv" | "template";
type TemplateDay = RememberedTemplateDay;

type TemplateStorageNotice = {
  readonly message: string;
  readonly tone: "error" | "success";
};

type PreviewState =
  | { readonly status: "idle" }
  | { readonly method: PreviewMethod; readonly status: "previewing" }
  | {
      readonly availableCount: number;
      readonly busyBlocks: readonly PreviewBusyBlockSummary[];
      readonly busyBlockCount: number;
      readonly confidence?: number;
      readonly method: PreviewMethod;
      readonly status: "success";
      readonly warnings: readonly string[];
    }
  | { readonly status: "error"; readonly message: string };

const defaultTemplateDays = [1, 2, 3, 4, 5] as const satisfies readonly TemplateDay[];

const templateDayOptions = [
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
  { label: "周日", value: 0 }
] as const satisfies readonly { readonly label: string; readonly value: TemplateDay }[];

const previewMethodLabels = {
  text: "文本预填",
  image: "图片预填",
  ics: "日历预填",
  csv: "CSV 预填",
  template: "模板预填"
} as const satisfies Record<PreviewMethod, string>;

const importMethodOptions = [
  { helper: "粘贴忙碌时间", label: "文本", method: "text" },
  { helper: "课表或排班截图", label: "图片", method: "image" },
  { helper: ".ics 日历文件", label: "日历", method: "ics" },
  { helper: "CSV 排班文件", label: "CSV", method: "csv" },
  { helper: "固定每周作息", label: "模板", method: "template" }
] as const satisfies readonly {
  readonly helper: string;
  readonly label: string;
  readonly method: PreviewMethod;
}[];

export function AvailabilityImportPanel({
  imageImportVisible,
  onPreviewApplied,
  publicId,
  scheduleTimezone
}: AvailabilityImportPanelProps) {
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | undefined>(undefined);
  const [icsFile, setIcsFile] = useState<File | undefined>(undefined);
  const [csvFile, setCsvFile] = useState<File | undefined>(undefined);
  const [templateDays, setTemplateDays] = useState<Set<TemplateDay>>(
    () => new Set(defaultTemplateDays)
  );
  const [templateName, setTemplateName] = useState("工作日晚上");
  const [templateStartTime, setTemplateStartTime] = useState("18:00");
  const [templateEndTime, setTemplateEndTime] = useState("21:00");
  const [savedTemplates, setSavedTemplates] = useState<readonly SavedParticipantTemplate[]>([]);
  const [selectedSavedTemplateId, setSelectedSavedTemplateId] = useState("");
  const [templateStorageNotice, setTemplateStorageNotice] = useState<
    TemplateStorageNotice | undefined
  >(undefined);
  const [activeImportMethod, setActiveImportMethod] = useState<PreviewMethod>("text");
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "idle" });
  const isPreviewing = previewState.status === "previewing";
  const isPreviewingText = previewState.status === "previewing" && previewState.method === "text";
  const isPreviewingImage = previewState.status === "previewing" && previewState.method === "image";
  const isPreviewingIcs = previewState.status === "previewing" && previewState.method === "ics";
  const isPreviewingCsv = previewState.status === "previewing" && previewState.method === "csv";
  const isPreviewingTemplate =
    previewState.status === "previewing" && previewState.method === "template";
  const availableImportMethods = importMethodOptions.filter(
    ({ method }) => imageImportVisible || method !== "image"
  );

  useEffect(() => {
    const rememberedTemplate = readRememberedParticipantTemplate(window.localStorage);
    const storedTemplates = readSavedParticipantTemplates(window.localStorage);

    setSavedTemplates(storedTemplates);

    if (rememberedTemplate !== undefined) {
      setTemplateDays(new Set(rememberedTemplate.daysOfWeek));
      setTemplateStartTime(rememberedTemplate.startTime);
      setTemplateEndTime(rememberedTemplate.endTime);
    }
  }, []);

  async function handlePreviewAvailability() {
    const trimmedText = importText.trim();

    if (trimmedText.length === 0) {
      setPreviewState({
        status: "error",
        message: "请先粘贴一段忙碌时间。"
      });
      return;
    }

    setPreviewState({ method: "text", status: "previewing" });

    try {
      const result = await previewAvailability(publicId, {
        method: "text_import",
        interpretsAs: "busy",
        sourceText: trimmedText,
        timezone: scheduleTimezone
      });

      applyPreviewResult("text", result);
    } catch (error) {
      setPreviewState({
        status: "error",
        message: toPreviewErrorMessage(error)
      });
    }
  }

  async function handlePreviewImageAvailability() {
    if (importFile === undefined) {
      setPreviewState({
        status: "error",
        message: "请先选择一张课表或排班截图。"
      });
      return;
    }

    setPreviewState({ method: "image", status: "previewing" });

    try {
      const result = await previewAvailabilityImage(publicId, {
        file: importFile,
        filename: importFile.name,
        timezone: scheduleTimezone
      });

      applyPreviewResult("image", result);
    } catch (error) {
      setPreviewState({
        status: "error",
        message: toPreviewErrorMessage(error)
      });
    }
  }

  async function handlePreviewIcsAvailability() {
    if (icsFile === undefined) {
      setPreviewState({
        status: "error",
        message: "请先选择一个 .ics 日历文件。"
      });
      return;
    }

    setPreviewState({ method: "ics", status: "previewing" });

    try {
      const result = await previewAvailabilityIcs(publicId, {
        file: icsFile,
        filename: icsFile.name,
        timezone: scheduleTimezone
      });

      applyPreviewResult("ics", result);
    } catch (error) {
      setPreviewState({
        status: "error",
        message: toPreviewErrorMessage(error)
      });
    }
  }

  async function handlePreviewCsvAvailability() {
    if (csvFile === undefined) {
      setPreviewState({
        status: "error",
        message: "请先选择一个 CSV 文件。"
      });
      return;
    }

    setPreviewState({ method: "csv", status: "previewing" });

    try {
      const result = await previewAvailabilityCsv(publicId, {
        file: csvFile,
        filename: csvFile.name,
        timezone: scheduleTimezone
      });

      applyPreviewResult("csv", result);
    } catch (error) {
      setPreviewState({
        status: "error",
        message: toPreviewErrorMessage(error)
      });
    }
  }

  async function handlePreviewTemplateAvailability() {
    const selectedTemplateDays = selectedTemplateDayValues(templateDays);

    if (selectedTemplateDays.length === 0) {
      setPreviewState({
        status: "error",
        message: "请选择至少一天。"
      });
      return;
    }

    if (templateStartTime === templateEndTime) {
      setPreviewState({
        status: "error",
        message: "开始和结束时间不能相同。"
      });
      return;
    }

    setPreviewState({ method: "template", status: "previewing" });

    try {
      const result = await previewAvailability(publicId, {
        interpretsAs: "busy",
        method: "template",
        template: {
          name: "每周模板",
          timezone: scheduleTimezone,
          weeklyWindows: selectedTemplateDays.map((value) => ({
            dayOfWeek: value,
            endTime: templateEndTime,
            startTime: templateStartTime
          }))
        },
        timezone: scheduleTimezone
      });

      applyPreviewResult("template", result);
      rememberParticipantTemplate(window.localStorage, {
        daysOfWeek: selectedTemplateDays,
        endTime: templateEndTime,
        startTime: templateStartTime
      });
    } catch (error) {
      setPreviewState({
        status: "error",
        message: toPreviewErrorMessage(error)
      });
    }
  }

  function applyPreviewResult(method: PreviewMethod, result: AvailabilityPreviewResponse) {
    onPreviewApplied(new Set(result.availableSlots.map(slotKey)));
    setPreviewState({
      status: "success",
      availableCount: result.availableSlots.length,
      busyBlocks: buildPreviewBusyBlockSummaries(result),
      busyBlockCount: result.busyBlocks.length,
      ...(result.confidence === undefined ? {} : { confidence: result.confidence }),
      method,
      warnings: collectPreviewWarnings(result)
    });
  }

  function toggleTemplateDay(day: TemplateDay) {
    setTemplateDays((currentDays) => {
      const nextDays = new Set(currentDays);

      if (nextDays.has(day)) {
        nextDays.delete(day);
      } else {
        nextDays.add(day);
      }

      return nextDays;
    });
  }

  function handleSavedTemplateChange(event: ChangeEvent<HTMLSelectElement>) {
    const templateId = event.target.value;
    setSelectedSavedTemplateId(templateId);

    const savedTemplate = savedTemplates.find(({ id }) => id === templateId);

    if (savedTemplate === undefined) {
      return;
    }

    applyTemplateToControls(savedTemplate);
    setTemplateName(savedTemplate.name);
    setTemplateStorageNotice({
      tone: "success",
      message: `已套用“${savedTemplate.name}”。`
    } satisfies TemplateStorageNotice);
  }

  function handleSaveCurrentTemplate() {
    const selectedTemplateDays = selectedTemplateDayValues(templateDays);
    const trimmedTemplateName = templateName.trim().replace(/\s+/g, " ");

    if (trimmedTemplateName.length === 0) {
      setTemplateStorageNotice({
        tone: "error",
        message: "请先填写模板名称。"
      } satisfies TemplateStorageNotice);
      return;
    }

    if (selectedTemplateDays.length === 0) {
      setTemplateStorageNotice({
        tone: "error",
        message: "请选择至少一天再保存模板。"
      } satisfies TemplateStorageNotice);
      return;
    }

    if (templateStartTime === templateEndTime) {
      setTemplateStorageNotice({
        tone: "error",
        message: "开始和结束时间不能相同。"
      } satisfies TemplateStorageNotice);
      return;
    }

    const savedTemplate = {
      daysOfWeek: selectedTemplateDays,
      endTime: templateEndTime,
      id: selectedSavedTemplateId || createSavedTemplateId(),
      name: trimmedTemplateName,
      startTime: templateStartTime
    } satisfies SavedParticipantTemplate;
    const nextSavedTemplates = saveParticipantTemplate(window.localStorage, savedTemplate);

    if (!nextSavedTemplates.some(({ id }) => id === savedTemplate.id)) {
      setTemplateStorageNotice({
        tone: "error",
        message: "浏览器没有允许保存本机模板。"
      } satisfies TemplateStorageNotice);
      return;
    }

    setSavedTemplates(nextSavedTemplates);
    setSelectedSavedTemplateId(savedTemplate.id);
    setTemplateName(trimmedTemplateName);
    rememberParticipantTemplate(window.localStorage, savedTemplate);
    setTemplateStorageNotice({
      tone: "success",
      message: `已保存“${trimmedTemplateName}”。`
    } satisfies TemplateStorageNotice);
  }

  function handleDeleteSavedTemplate() {
    const savedTemplate = savedTemplates.find(({ id }) => id === selectedSavedTemplateId);

    if (savedTemplate === undefined) {
      return;
    }

    setSavedTemplates(deleteSavedParticipantTemplate(window.localStorage, savedTemplate.id));
    setSelectedSavedTemplateId("");
    setTemplateStorageNotice({
      tone: "success",
      message: `已删除“${savedTemplate.name}”。`
    } satisfies TemplateStorageNotice);
  }

  function applyTemplateToControls(template: SavedParticipantTemplate) {
    setTemplateDays(new Set(template.daysOfWeek));
    setTemplateStartTime(template.startTime);
    setTemplateEndTime(template.endTime);
  }

  return (
    <div className={styles.importPanel}>
      <div className={styles.importSourceTabs} role="tablist" aria-label="预填来源">
        {availableImportMethods.map(({ helper, label, method }) => (
          <button
            aria-selected={activeImportMethod === method}
            className={[
              styles.importSourceTab,
              activeImportMethod === method ? styles.importSourceTabActive : undefined
            ]
              .filter(Boolean)
              .join(" ")}
            key={method}
            onClick={() => setActiveImportMethod(method)}
            role="tab"
            type="button"
          >
            {importMethodIcon(method, activeImportMethod === method)}
            <span>
              <strong>{label}</strong>
              <small>{helper}</small>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.importSourcePanel} role="tabpanel">
        {activeImportMethod === "text" ? (
          <label className={styles.importField}>
            <span>粘贴忙碌时间</span>
            <textarea
              maxLength={5000}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Mon 9-11 COMP101; 8/1 9am-10:30am Work; 8月1日 14.00-16.00 Lab"
              rows={3}
              value={importText}
            />
          </label>
        ) : null}
        {activeImportMethod === "image" && imageImportVisible ? (
          <label className={styles.importField}>
            <span>上传课表截图</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setImportFile(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}
        {activeImportMethod === "ics" ? (
          <label className={styles.importField}>
            <span>上传 .ics 日历</span>
            <input
              accept=".ics,text/calendar"
              onChange={(event) => setIcsFile(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}
        {activeImportMethod === "csv" ? (
          <label className={styles.importField}>
            <span>上传 CSV 排班</span>
            <input
              accept=".csv,text/csv"
              onChange={(event) => setCsvFile(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}
        {activeImportMethod === "template" ? (
          <fieldset className={styles.templatePanel}>
            <legend>每周模板</legend>
            {savedTemplates.length > 0 ? (
              <div className={styles.savedTemplateGrid}>
                <label className={styles.importField}>
                  <span>保存的本机模板</span>
                  <select
                    aria-label="选择保存的模板"
                    onChange={handleSavedTemplateChange}
                    value={selectedSavedTemplateId}
                  >
                    <option value="">选择模板</option>
                    {savedTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={styles.secondaryButton}
                  disabled={selectedSavedTemplateId === ""}
                  onClick={handleDeleteSavedTemplate}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={18} />
                  删除
                </button>
              </div>
            ) : null}
            <label className={styles.importField}>
              <span>模板名称</span>
              <input
                maxLength={40}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="如 工作日晚上"
                type="text"
                value={templateName}
              />
            </label>
            <div className={styles.templateDayList}>
              {templateDayOptions.map((day) => (
                <label className={styles.templateDayChoice} key={day.value}>
                  <input
                    checked={templateDays.has(day.value)}
                    onChange={() => toggleTemplateDay(day.value)}
                    type="checkbox"
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
            <div className={styles.templateTimeGrid}>
              <label className={styles.importField}>
                <span>开始时间</span>
                <input
                  onChange={(event) => setTemplateStartTime(event.target.value)}
                  type="time"
                  value={templateStartTime}
                />
              </label>
              <label className={styles.importField}>
                <span>结束时间</span>
                <input
                  onChange={(event) => setTemplateEndTime(event.target.value)}
                  type="time"
                  value={templateEndTime}
                />
              </label>
            </div>
            <div className={styles.templateSaveRow}>
              <button
                className={styles.secondaryButton}
                disabled={isPreviewing}
                onClick={handleSaveCurrentTemplate}
                type="button"
              >
                <Save aria-hidden="true" size={18} />
                保存到本机
              </button>
              {templateStorageNotice === undefined ? null : (
                <p
                  className={
                    templateStorageNotice.tone === "error"
                      ? styles.templateNoticeError
                      : styles.templateNotice
                  }
                  role={templateStorageNotice.tone === "error" ? "alert" : undefined}
                >
                  {templateStorageNotice.message}
                </p>
              )}
            </div>
          </fieldset>
        ) : null}
      </div>

      <div className={styles.importActions}>
        <div className={styles.importButtonGroup}>
          {activeImportMethod === "text" ? (
            <button
              className={styles.secondaryButton}
              disabled={isPreviewing || importText.trim().length === 0}
              onClick={handlePreviewAvailability}
              type="button"
            >
              {isPreviewingText ? (
                <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
              ) : (
                <FileText aria-hidden="true" size={18} />
              )}
              用文本预填
            </button>
          ) : null}
          {activeImportMethod === "image" && imageImportVisible ? (
            <button
              className={styles.secondaryButton}
              disabled={isPreviewing || importFile === undefined}
              onClick={handlePreviewImageAvailability}
              type="button"
            >
              {isPreviewingImage ? (
                <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
              ) : (
                <ImagePlus aria-hidden="true" size={18} />
              )}
              用图片预填
            </button>
          ) : null}
          {activeImportMethod === "ics" ? (
            <button
              className={styles.secondaryButton}
              disabled={isPreviewing || icsFile === undefined}
              onClick={handlePreviewIcsAvailability}
              type="button"
            >
              {isPreviewingIcs ? (
                <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
              ) : (
                <FileUp aria-hidden="true" size={18} />
              )}
              用日历预填
            </button>
          ) : null}
          {activeImportMethod === "csv" ? (
            <button
              className={styles.secondaryButton}
              disabled={isPreviewing || csvFile === undefined}
              onClick={handlePreviewCsvAvailability}
              type="button"
            >
              {isPreviewingCsv ? (
                <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
              ) : (
                <FileText aria-hidden="true" size={18} />
              )}
              用 CSV 预填
            </button>
          ) : null}
          {activeImportMethod === "template" ? (
            <button
              className={styles.secondaryButton}
              disabled={isPreviewing || templateDays.size === 0}
              onClick={handlePreviewTemplateAvailability}
              type="button"
            >
              {isPreviewingTemplate ? (
                <Loader2 aria-hidden="true" className={styles.spinIcon} size={18} />
              ) : (
                <CalendarClock aria-hidden="true" size={18} />
              )}
              用模板预填
            </button>
          ) : null}
        </div>
        {previewState.status === "success" ? <span>{previewSummaryText(previewState)}</span> : null}
      </div>
      {previewState.status === "error" ? (
        <p className={styles.error} role="alert">
          {previewState.message}
        </p>
      ) : null}
      {previewState.status === "success" ? <PreviewFeedback previewState={previewState} /> : null}
    </div>
  );
}

function importMethodIcon(method: PreviewMethod, active: boolean) {
  const color = active ? "#1d4ed8" : "currentColor";

  switch (method) {
    case "csv":
    case "text":
      return <FileText aria-hidden="true" color={color} size={18} />;
    case "image":
      return <ImagePlus aria-hidden="true" color={color} size={18} />;
    case "ics":
      return <FileUp aria-hidden="true" color={color} size={18} />;
    case "template":
      return <CalendarClock aria-hidden="true" color={color} size={18} />;
  }
}

function PreviewFeedback({
  previewState
}: {
  readonly previewState: Extract<PreviewState, { readonly status: "success" }>;
}) {
  const hasWarnings = previewState.warnings.length > 0;

  return (
    <div
      className={hasWarnings ? styles.previewFeedbackReview : styles.previewFeedback}
      aria-live="polite"
    >
      <div className={styles.previewFeedbackHeader}>
        <span className={styles.previewStatusIcon} aria-hidden="true">
          {hasWarnings ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
        </span>
        <div className={styles.previewFeedbackText}>
          <strong>{previewHeadline(previewState)}</strong>
          <p>{previewSummaryText(previewState)}</p>
        </div>
        <span className={hasWarnings ? styles.previewBadgeReview : styles.previewBadge}>
          {hasWarnings ? "需复核" : "已应用"}
        </span>
      </div>
      {hasWarnings ? (
        <ul className={styles.warningList}>
          {previewState.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.previewHelper}>下方时间格已更新，可以继续调整后提交。</p>
      )}
      {previewState.busyBlocks.length > 0 ? (
        <div className={styles.previewBusyReview}>
          <div className={styles.previewBusyReviewHeader}>
            <strong>识别明细</strong>
            <span>不准确时可以直接在下方时间格修正</span>
          </div>
          <ul className={styles.previewBusyList}>
            {previewState.busyBlocks.map((block) => (
              <li
                className={
                  block.warnings.length > 0 ? styles.previewBusyItemReview : styles.previewBusyItem
                }
                key={block.key}
              >
                <div className={styles.previewBusyMain}>
                  <strong>{block.title}</strong>
                  <span>
                    {block.dateText} · {block.timeText}
                  </span>
                </div>
                {block.confidenceText === undefined ? null : (
                  <span className={styles.previewBusyConfidence}>{block.confidenceText}</span>
                )}
                {block.warnings.length > 0 ? (
                  <ul className={styles.previewBusyWarnings}>
                    {block.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function previewHeadline(
  previewState: Extract<PreviewState, { readonly status: "success" }>
): string {
  const sourceLabel = previewMethodLabels[previewState.method];

  if (previewState.method === "template") {
    return previewState.availableCount === 0
      ? `${sourceLabel}没有找到可用时间格`
      : `${sourceLabel}已应用到时间格`;
  }

  if (previewState.busyBlockCount === 0) {
    return `${sourceLabel}没有识别到忙碌时段`;
  }

  return `${sourceLabel}已应用到时间格`;
}

function previewSummaryText(
  previewState: Extract<PreviewState, { readonly status: "success" }>
): string {
  return [
    `${previewState.busyBlockCount} 段忙碌`,
    `${previewState.availableCount} 个可用时间`,
    previewConfidenceText(previewState.confidence)
  ]
    .filter((item): item is string => item !== undefined)
    .join(" · ");
}

function selectedTemplateDayValues(days: ReadonlySet<TemplateDay>): TemplateDay[] {
  return templateDayOptions.filter(({ value }) => days.has(value)).map(({ value }) => value);
}

function createSavedTemplateId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPreviewErrorMessage(error: unknown): string {
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

    if (error.code === "VALIDATION_ERROR") {
      return "无法生成预填，请检查文本或模板时间。";
    }

    if (error.code === "IMPORT_PROVIDER_UNAVAILABLE") {
      return "图片识别服务还没有配置。可以先粘贴文本或手动选择。";
    }

    if (error.code === "IMPORT_UNSUPPORTED_FILE_TYPE") {
      return "请上传 PNG、JPG、WebP 图片、.ics 日历或 CSV 文件。";
    }

    if (error.code === "IMPORT_FILE_TOO_LARGE") {
      return "图片不能超过 4MB，ICS 和 CSV 不能超过 1MB。";
    }

    if (error.code === "IMPORT_LOW_CONFIDENCE") {
      return "这张图暂时没能可靠识别，可以换一张更清晰的截图。";
    }

    if (error.code === "UNSUPPORTED_ENTRY_METHOD") {
      return "这个导入方式暂不支持。";
    }

    return error.message;
  }

  if (error instanceof Error && error.name === "ZodError") {
    return "预填结果格式不正确。";
  }

  return "生成预填失败。";
}
