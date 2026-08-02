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

import { localizedApiErrorMessage } from "../../i18n/api-error-messages";
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
import type { SchedulePageLocale } from "./schedule-page-copy";

interface AvailabilityImportPanelProps {
  readonly imageImportVisible: boolean;
  readonly locale?: SchedulePageLocale;
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
const templateDayOrder = [1, 2, 3, 4, 5, 6, 0] as const satisfies readonly TemplateDay[];
const previewMethodOrder = ["text", "image", "ics", "csv", "template"] as const;

interface ImportMethodCopy {
  readonly actionLabel: string;
  readonly helper: string;
  readonly label: string;
  readonly previewLabel: string;
}

interface AvailabilityImportPanelCopy {
  readonly appliedBadge: string;
  readonly appliedTemplate: (name: string) => string;
  readonly csvFileLabel: string;
  readonly databaseError: string;
  readonly defaultError: string;
  readonly deleteTemplate: string;
  readonly deletedTemplate: (name: string) => string;
  readonly detailsSubtitle: string;
  readonly detailsTitle: string;
  readonly fileTooLargeError: string;
  readonly imageFileLabel: string;
  readonly lowConfidenceError: string;
  readonly methods: Record<PreviewMethod, ImportMethodCopy>;
  readonly missingCsvFileError: string;
  readonly missingIcsFileError: string;
  readonly missingImageFileError: string;
  readonly missingTemplateDayError: string;
  readonly missingTemplateDaySaveError: string;
  readonly missingTemplateNameError: string;
  readonly missingTextError: string;
  readonly noBusyBlocksHeadline: (sourceLabel: string) => string;
  readonly noTemplateSlotsHeadline: (sourceLabel: string) => string;
  readonly providerUnavailableError: string;
  readonly reviewBadge: string;
  readonly savedTemplate: (name: string) => string;
  readonly savedTemplatesAria: string;
  readonly savedTemplatesLabel: string;
  readonly savedTemplatesPlaceholder: string;
  readonly sameTemplateTimeError: string;
  readonly saveTemplate: string;
  readonly scheduleLockedError: string;
  readonly scheduleNotFoundError: string;
  readonly successHeadline: (sourceLabel: string) => string;
  readonly successHelper: string;
  readonly summaryText: (busyBlocks: number, availableSlots: number, confidence?: string) => string;
  readonly tabAria: string;
  readonly templateDays: Record<TemplateDay, string>;
  readonly templateEndLabel: string;
  readonly templateLegend: string;
  readonly templateNameDefault: string;
  readonly templateNameLabel: string;
  readonly templateNamePlaceholder: string;
  readonly templateStorageDeniedError: string;
  readonly templateStartLabel: string;
  readonly textFieldLabel: string;
  readonly textPlaceholder: string;
  readonly unsupportedEntryMethodError: string;
  readonly unsupportedFileTypeError: string;
  readonly validationError: string;
  readonly zodError: string;
  readonly icsFileLabel: string;
  readonly weeklyTemplateApiName: string;
}

const availabilityImportPanelCopy = {
  "zh-CN": {
    appliedBadge: "已应用",
    appliedTemplate: (name) => `已套用“${name}”。`,
    csvFileLabel: "上传 CSV 排班",
    databaseError: "数据库尚未配置。",
    defaultError: "生成预填失败。",
    deleteTemplate: "删除",
    deletedTemplate: (name) => `已删除“${name}”。`,
    detailsSubtitle: "不准确时可以直接在下方时间格修正",
    detailsTitle: "识别明细",
    fileTooLargeError: "图片不能超过 4MB，ICS 和 CSV 不能超过 1MB。",
    imageFileLabel: "上传课表截图",
    lowConfidenceError: "这张图暂时没能可靠识别，可以换一张更清晰的截图。",
    methods: {
      csv: {
        actionLabel: "用 CSV 预填",
        helper: "CSV 排班文件",
        label: "CSV",
        previewLabel: "CSV 预填"
      },
      ics: {
        actionLabel: "用日历预填",
        helper: ".ics 日历文件",
        label: "日历",
        previewLabel: "日历预填"
      },
      image: {
        actionLabel: "用图片预填",
        helper: "课表或排班截图",
        label: "图片",
        previewLabel: "图片预填"
      },
      template: {
        actionLabel: "用模板预填",
        helper: "固定每周作息",
        label: "模板",
        previewLabel: "模板预填"
      },
      text: {
        actionLabel: "用文本预填",
        helper: "粘贴忙碌时间",
        label: "文本",
        previewLabel: "文本预填"
      }
    },
    missingCsvFileError: "请先选择一个 CSV 文件。",
    missingIcsFileError: "请先选择一个 .ics 日历文件。",
    missingImageFileError: "请先选择一张课表或排班截图。",
    missingTemplateDayError: "请选择至少一天。",
    missingTemplateDaySaveError: "请选择至少一天再保存模板。",
    missingTemplateNameError: "请先填写模板名称。",
    missingTextError: "请先粘贴一段忙碌时间。",
    noBusyBlocksHeadline: (sourceLabel) => `${sourceLabel}没有识别到忙碌时段`,
    noTemplateSlotsHeadline: (sourceLabel) => `${sourceLabel}没有找到可用时间格`,
    providerUnavailableError: "图片识别服务还没有配置。可以先粘贴文本或手动选择。",
    reviewBadge: "需复核",
    savedTemplate: (name) => `已保存“${name}”。`,
    savedTemplatesAria: "选择保存的模板",
    savedTemplatesLabel: "保存的本机模板",
    savedTemplatesPlaceholder: "选择模板",
    sameTemplateTimeError: "开始和结束时间不能相同。",
    saveTemplate: "保存到本机",
    scheduleLockedError: "这个日程已经停止接收提交。",
    scheduleNotFoundError: "这个日程不存在或链接有误。",
    successHeadline: (sourceLabel) => `${sourceLabel}已应用到时间格`,
    successHelper: "下方时间格已更新，可以继续调整后提交。",
    summaryText: (busyBlocks, availableSlots, confidence) =>
      [`${busyBlocks} 段忙碌`, `${availableSlots} 个可用时间`, confidence]
        .filter((item): item is string => item !== undefined)
        .join(" · "),
    tabAria: "预填来源",
    templateDays: {
      0: "周日",
      1: "周一",
      2: "周二",
      3: "周三",
      4: "周四",
      5: "周五",
      6: "周六"
    },
    templateEndLabel: "结束时间",
    templateLegend: "每周模板",
    templateNameDefault: "工作日晚上",
    templateNameLabel: "模板名称",
    templateNamePlaceholder: "如 工作日晚上",
    templateStorageDeniedError: "浏览器没有允许保存本机模板。",
    templateStartLabel: "开始时间",
    textFieldLabel: "粘贴忙碌时间",
    textPlaceholder: "Mon 9-11 COMP101; 8/1 9am-10:30am Work; 8月1日 14.00-16.00 Lab",
    unsupportedEntryMethodError: "这个导入方式暂不支持。",
    unsupportedFileTypeError: "请上传 PNG、JPG、WebP 图片、.ics 日历或 CSV 文件。",
    validationError: "无法生成预填，请检查文本或模板时间。",
    weeklyTemplateApiName: "每周模板",
    zodError: "预填结果格式不正确。",
    icsFileLabel: "上传 .ics 日历"
  },
  en: {
    appliedBadge: "Applied",
    appliedTemplate: (name) => `Applied "${name}".`,
    csvFileLabel: "Upload CSV schedule",
    databaseError: "The database is not configured yet.",
    defaultError: "Could not generate the preview.",
    deleteTemplate: "Delete",
    deletedTemplate: (name) => `Deleted "${name}".`,
    detailsSubtitle: "If anything looks off, adjust the grid below before submitting",
    detailsTitle: "Recognized Busy Times",
    fileTooLargeError: "Images must be under 4MB. ICS and CSV files must be under 1MB.",
    imageFileLabel: "Upload schedule screenshot",
    lowConfidenceError: "This image could not be read reliably. Try a clearer screenshot.",
    methods: {
      csv: {
        actionLabel: "Use CSV",
        helper: "CSV schedule file",
        label: "CSV",
        previewLabel: "CSV import"
      },
      ics: {
        actionLabel: "Use calendar",
        helper: ".ics calendar file",
        label: "Calendar",
        previewLabel: "Calendar import"
      },
      image: {
        actionLabel: "Use image",
        helper: "Schedule screenshot",
        label: "Image",
        previewLabel: "Image import"
      },
      template: {
        actionLabel: "Use template",
        helper: "Weekly routine",
        label: "Template",
        previewLabel: "Template import"
      },
      text: {
        actionLabel: "Use text",
        helper: "Paste busy times",
        label: "Text",
        previewLabel: "Text import"
      }
    },
    missingCsvFileError: "Choose a CSV file first.",
    missingIcsFileError: "Choose an .ics calendar file first.",
    missingImageFileError: "Choose a schedule screenshot first.",
    missingTemplateDayError: "Choose at least one day.",
    missingTemplateDaySaveError: "Choose at least one day before saving the template.",
    missingTemplateNameError: "Enter a template name first.",
    missingTextError: "Paste at least one busy time first.",
    noBusyBlocksHeadline: (sourceLabel) => `${sourceLabel} did not find any busy blocks`,
    noTemplateSlotsHeadline: (sourceLabel) => `${sourceLabel} did not find available slots`,
    providerUnavailableError:
      "Image recognition is not enabled yet. Use text import or the manual grid for now.",
    reviewBadge: "Review",
    savedTemplate: (name) => `Saved "${name}".`,
    savedTemplatesAria: "Choose a saved template",
    savedTemplatesLabel: "Saved local templates",
    savedTemplatesPlaceholder: "Choose template",
    sameTemplateTimeError: "Start and end time cannot be the same.",
    saveTemplate: "Save locally",
    scheduleLockedError: "This schedule is no longer accepting submissions.",
    scheduleNotFoundError: "This schedule does not exist, or the link is incorrect.",
    successHeadline: (sourceLabel) => `${sourceLabel} applied to the grid`,
    successHelper: "The grid below has been updated. You can still adjust it before submitting.",
    summaryText: (busyBlocks, availableSlots, confidence) =>
      [`${busyBlocks} busy blocks`, `${availableSlots} available slots`, confidence]
        .filter((item): item is string => item !== undefined)
        .join(" · "),
    tabAria: "Import source",
    templateDays: {
      0: "Sun",
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat"
    },
    templateEndLabel: "End time",
    templateLegend: "Weekly Template",
    templateNameDefault: "Weekday evenings",
    templateNameLabel: "Template name",
    templateNamePlaceholder: "e.g. Weekday evenings",
    templateStorageDeniedError: "This browser did not allow saving a local template.",
    templateStartLabel: "Start time",
    textFieldLabel: "Paste busy times",
    textPlaceholder: "Mon 9-11 COMP101; Aug 1 9am-10:30am Work; Aug 1 14:00-16:00 Lab",
    unsupportedEntryMethodError: "This import method is not supported yet.",
    unsupportedFileTypeError: "Upload a PNG, JPG, WebP image, .ics calendar, or CSV file.",
    validationError: "Could not generate the preview. Check the text or template time.",
    weeklyTemplateApiName: "Weekly template",
    zodError: "The preview result was not in the expected format.",
    icsFileLabel: "Upload .ics calendar"
  }
} satisfies Record<SchedulePageLocale, AvailabilityImportPanelCopy>;

export function AvailabilityImportPanel({
  imageImportVisible,
  locale = "zh-CN",
  onPreviewApplied,
  publicId,
  scheduleTimezone
}: AvailabilityImportPanelProps) {
  const copy = availabilityImportPanelCopy[locale];
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | undefined>(undefined);
  const [icsFile, setIcsFile] = useState<File | undefined>(undefined);
  const [csvFile, setCsvFile] = useState<File | undefined>(undefined);
  const [templateDays, setTemplateDays] = useState<Set<TemplateDay>>(
    () => new Set(defaultTemplateDays)
  );
  const [templateName, setTemplateName] = useState(copy.templateNameDefault);
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
  const availableImportMethods = previewMethodOrder
    .filter((method) => imageImportVisible || method !== "image")
    .map((method) => ({ method, ...copy.methods[method] }));

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
        message: copy.missingTextError
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
        message: toPreviewErrorMessage(error, copy, locale)
      });
    }
  }

  async function handlePreviewImageAvailability() {
    if (importFile === undefined) {
      setPreviewState({
        status: "error",
        message: copy.missingImageFileError
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
        message: toPreviewErrorMessage(error, copy, locale)
      });
    }
  }

  async function handlePreviewIcsAvailability() {
    if (icsFile === undefined) {
      setPreviewState({
        status: "error",
        message: copy.missingIcsFileError
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
        message: toPreviewErrorMessage(error, copy, locale)
      });
    }
  }

  async function handlePreviewCsvAvailability() {
    if (csvFile === undefined) {
      setPreviewState({
        status: "error",
        message: copy.missingCsvFileError
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
        message: toPreviewErrorMessage(error, copy, locale)
      });
    }
  }

  async function handlePreviewTemplateAvailability() {
    const selectedTemplateDays = selectedTemplateDayValues(templateDays);

    if (selectedTemplateDays.length === 0) {
      setPreviewState({
        status: "error",
        message: copy.missingTemplateDayError
      });
      return;
    }

    if (templateStartTime === templateEndTime) {
      setPreviewState({
        status: "error",
        message: copy.sameTemplateTimeError
      });
      return;
    }

    setPreviewState({ method: "template", status: "previewing" });

    try {
      const result = await previewAvailability(publicId, {
        interpretsAs: "busy",
        method: "template",
        template: {
          name: copy.weeklyTemplateApiName,
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
        message: toPreviewErrorMessage(error, copy, locale)
      });
    }
  }

  function applyPreviewResult(method: PreviewMethod, result: AvailabilityPreviewResponse) {
    onPreviewApplied(new Set(result.availableSlots.map(slotKey)));
    setPreviewState({
      status: "success",
      availableCount: result.availableSlots.length,
      busyBlocks: buildPreviewBusyBlockSummaries(result, locale),
      busyBlockCount: result.busyBlocks.length,
      ...(result.confidence === undefined ? {} : { confidence: result.confidence }),
      method,
      warnings: collectPreviewWarnings(result, locale)
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
      message: copy.appliedTemplate(savedTemplate.name)
    } satisfies TemplateStorageNotice);
  }

  function handleSaveCurrentTemplate() {
    const selectedTemplateDays = selectedTemplateDayValues(templateDays);
    const trimmedTemplateName = templateName.trim().replace(/\s+/g, " ");

    if (trimmedTemplateName.length === 0) {
      setTemplateStorageNotice({
        tone: "error",
        message: copy.missingTemplateNameError
      } satisfies TemplateStorageNotice);
      return;
    }

    if (selectedTemplateDays.length === 0) {
      setTemplateStorageNotice({
        tone: "error",
        message: copy.missingTemplateDaySaveError
      } satisfies TemplateStorageNotice);
      return;
    }

    if (templateStartTime === templateEndTime) {
      setTemplateStorageNotice({
        tone: "error",
        message: copy.sameTemplateTimeError
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
        message: copy.templateStorageDeniedError
      } satisfies TemplateStorageNotice);
      return;
    }

    setSavedTemplates(nextSavedTemplates);
    setSelectedSavedTemplateId(savedTemplate.id);
    setTemplateName(trimmedTemplateName);
    rememberParticipantTemplate(window.localStorage, savedTemplate);
    setTemplateStorageNotice({
      tone: "success",
      message: copy.savedTemplate(trimmedTemplateName)
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
      message: copy.deletedTemplate(savedTemplate.name)
    } satisfies TemplateStorageNotice);
  }

  function applyTemplateToControls(template: SavedParticipantTemplate) {
    setTemplateDays(new Set(template.daysOfWeek));
    setTemplateStartTime(template.startTime);
    setTemplateEndTime(template.endTime);
  }

  return (
    <div className={styles.importPanel}>
      <div className={styles.importSourceTabs} role="tablist" aria-label={copy.tabAria}>
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
            <span>{copy.textFieldLabel}</span>
            <textarea
              maxLength={5000}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={copy.textPlaceholder}
              rows={3}
              value={importText}
            />
          </label>
        ) : null}
        {activeImportMethod === "image" && imageImportVisible ? (
          <label className={styles.importField}>
            <span>{copy.imageFileLabel}</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setImportFile(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}
        {activeImportMethod === "ics" ? (
          <label className={styles.importField}>
            <span>{copy.icsFileLabel}</span>
            <input
              accept=".ics,text/calendar"
              onChange={(event) => setIcsFile(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}
        {activeImportMethod === "csv" ? (
          <label className={styles.importField}>
            <span>{copy.csvFileLabel}</span>
            <input
              accept=".csv,text/csv"
              onChange={(event) => setCsvFile(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}
        {activeImportMethod === "template" ? (
          <fieldset className={styles.templatePanel}>
            <legend>{copy.templateLegend}</legend>
            {savedTemplates.length > 0 ? (
              <div className={styles.savedTemplateGrid}>
                <label className={styles.importField}>
                  <span>{copy.savedTemplatesLabel}</span>
                  <select
                    aria-label={copy.savedTemplatesAria}
                    onChange={handleSavedTemplateChange}
                    value={selectedSavedTemplateId}
                  >
                    <option value="">{copy.savedTemplatesPlaceholder}</option>
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
                  {copy.deleteTemplate}
                </button>
              </div>
            ) : null}
            <label className={styles.importField}>
              <span>{copy.templateNameLabel}</span>
              <input
                maxLength={40}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={copy.templateNamePlaceholder}
                type="text"
                value={templateName}
              />
            </label>
            <div className={styles.templateDayList}>
              {templateDayOrder.map((day) => (
                <label className={styles.templateDayChoice} key={day}>
                  <input
                    checked={templateDays.has(day)}
                    onChange={() => toggleTemplateDay(day)}
                    type="checkbox"
                  />
                  <span>{copy.templateDays[day]}</span>
                </label>
              ))}
            </div>
            <div className={styles.templateTimeGrid}>
              <label className={styles.importField}>
                <span>{copy.templateStartLabel}</span>
                <input
                  onChange={(event) => setTemplateStartTime(event.target.value)}
                  type="time"
                  value={templateStartTime}
                />
              </label>
              <label className={styles.importField}>
                <span>{copy.templateEndLabel}</span>
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
                {copy.saveTemplate}
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
              {copy.methods.text.actionLabel}
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
              {copy.methods.image.actionLabel}
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
              {copy.methods.ics.actionLabel}
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
              {copy.methods.csv.actionLabel}
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
              {copy.methods.template.actionLabel}
            </button>
          ) : null}
        </div>
        {previewState.status === "success" ? (
          <span>{previewSummaryText(previewState, copy, locale)}</span>
        ) : null}
      </div>
      {previewState.status === "error" ? (
        <p className={styles.error} role="alert">
          {previewState.message}
        </p>
      ) : null}
      {previewState.status === "success" ? (
        <PreviewFeedback copy={copy} locale={locale} previewState={previewState} />
      ) : null}
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
  copy,
  locale,
  previewState
}: {
  readonly copy: AvailabilityImportPanelCopy;
  readonly locale: SchedulePageLocale;
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
          <strong>{previewHeadline(previewState, copy)}</strong>
          <p>{previewSummaryText(previewState, copy, locale)}</p>
        </div>
        <span className={hasWarnings ? styles.previewBadgeReview : styles.previewBadge}>
          {hasWarnings ? copy.reviewBadge : copy.appliedBadge}
        </span>
      </div>
      {hasWarnings ? (
        <ul className={styles.warningList}>
          {previewState.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.previewHelper}>{copy.successHelper}</p>
      )}
      {previewState.busyBlocks.length > 0 ? (
        <div className={styles.previewBusyReview}>
          <div className={styles.previewBusyReviewHeader}>
            <strong>{copy.detailsTitle}</strong>
            <span>{copy.detailsSubtitle}</span>
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
  previewState: Extract<PreviewState, { readonly status: "success" }>,
  copy: AvailabilityImportPanelCopy
): string {
  const sourceLabel = copy.methods[previewState.method].previewLabel;

  if (previewState.method === "template") {
    return previewState.availableCount === 0
      ? copy.noTemplateSlotsHeadline(sourceLabel)
      : copy.successHeadline(sourceLabel);
  }

  if (previewState.busyBlockCount === 0) {
    return copy.noBusyBlocksHeadline(sourceLabel);
  }

  return copy.successHeadline(sourceLabel);
}

function previewSummaryText(
  previewState: Extract<PreviewState, { readonly status: "success" }>,
  copy: AvailabilityImportPanelCopy,
  locale: SchedulePageLocale
): string {
  return copy.summaryText(
    previewState.busyBlockCount,
    previewState.availableCount,
    previewConfidenceText(previewState.confidence, locale)
  );
}

function selectedTemplateDayValues(days: ReadonlySet<TemplateDay>): TemplateDay[] {
  return templateDayOrder.filter((day) => days.has(day));
}

function createSavedTemplateId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPreviewErrorMessage(
  error: unknown,
  copy: AvailabilityImportPanelCopy,
  locale: SchedulePageLocale
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return copy.databaseError;
    }

    if (error.code === "SCHEDULE_LOCKED") {
      return copy.scheduleLockedError;
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return copy.scheduleNotFoundError;
    }

    if (error.code === "VALIDATION_ERROR") {
      return copy.validationError;
    }

    if (error.code === "IMPORT_PROVIDER_UNAVAILABLE") {
      return copy.providerUnavailableError;
    }

    if (error.code === "IMPORT_UNSUPPORTED_FILE_TYPE") {
      return copy.unsupportedFileTypeError;
    }

    if (error.code === "IMPORT_FILE_TOO_LARGE") {
      return copy.fileTooLargeError;
    }

    if (error.code === "IMPORT_LOW_CONFIDENCE") {
      return copy.lowConfidenceError;
    }

    if (error.code === "UNSUPPORTED_ENTRY_METHOD") {
      return copy.unsupportedEntryMethodError;
    }

    return localizedApiErrorMessage(error.code, locale);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return copy.zodError;
  }

  return copy.defaultError;
}
