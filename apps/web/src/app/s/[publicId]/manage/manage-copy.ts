import type { ScheduleDetail } from "@schedule-share/api-client";

import type { SchedulePageLocale } from "../schedule-page-copy";

export interface CopyRankedSlotButtonCopy {
  readonly copied: string;
  readonly copyFailed: string;
  readonly fallbackAriaLabel: string;
  readonly idleLabel: string;
}

export interface ConfirmFinalTimeButtonCopy {
  readonly errorArchived: string;
  readonly errorDefault: string;
  readonly errorInvalidOwnerKey: string;
  readonly errorValidation: string;
  readonly selected: string;
  readonly select: string;
}

export interface LockScheduleControlCopy {
  readonly archive: string;
  readonly archivedSuccess: string;
  readonly exportCalendar: string;
  readonly exportCsv: string;
  readonly heading: string;
  readonly lock: string;
  readonly lockedSuccess: string;
  readonly actionDescription: (status: ScheduleDetail["status"]) => string;
  readonly actionTitle: (status: ScheduleDetail["status"]) => string;
  readonly errorDatabase: string;
  readonly errorDefault: string;
  readonly errorInvalidOwnerKey: string;
  readonly errorNotFound: string;
  readonly errorValidation: string;
  readonly statusLabel: (status: ScheduleDetail["status"]) => string;
}

export interface ManageResultSummaryPanelCopy {
  readonly ariaLabel: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly copySummary: string;
  readonly safeHint: string;
  readonly textAreaLabel: string;
  readonly title: string;
}

export interface ManageShareLinksPanelCopy {
  readonly ariaLabel: string;
  readonly copied: string;
  readonly copy: string;
  readonly copyFailed: string;
  readonly managerPathPrefix: string;
  readonly ownerLabel: string;
  readonly publicPathPrefix: string;
  readonly shareLabel: string;
  readonly subtitle: string;
  readonly title: string;
}

export interface ManagePageCopy {
  readonly allAvailableCount: (count: number) => string;
  readonly allAvailableEmptyBody: string;
  readonly allAvailableEmptyTitle: string;
  readonly allAvailableTitle: string;
  readonly availableLabel: string;
  readonly backSchedule: string;
  readonly bestSlotsTitle: string;
  readonly continuousSlots: (slotCount: number) => string;
  readonly dateRange: (start: string, end: string) => string;
  readonly exportFinalTime: string;
  readonly exportThisTime: string;
  readonly finalTimeAria: string;
  readonly finalTimeTitle: string;
  readonly overviewAria: string;
  readonly participantCount: (count: number) => string;
  readonly participantSummary: (count: number) => string;
  readonly participantsLabel: string;
  readonly peakNote: string;
  readonly rankedSlotCount: (count: number) => string;
  readonly rankedSlotEmptyBody: string;
  readonly rankedSlotEmptyTitle: string;
  readonly recommendationAlternatesTitle: string;
  readonly recommendationBasisAria: string;
  readonly recommendationCoverageMetric: string;
  readonly recommendationDurationMetric: string;
  readonly recommendationEmptyAfterSubmissions: (participantCount: number) => string;
  readonly recommendationEmptyNoSubmissions: string;
  readonly recommendationEmptyNoTime: string;
  readonly recommendationEmptyWaiting: string;
  readonly recommendationHeadlineAllAvailable: string;
  readonly recommendationHeadlinePeak: (ratio: string) => string;
  readonly recommendationPeopleMetric: string;
  readonly recommendationStatusWaiting: string;
  readonly recommendationTitle: string;
  readonly recommendedAllAvailable: string;
  readonly recommendedMostAvailable: string;
  readonly statusLabel: (status: ScheduleDetail["status"]) => string;
  readonly statusSummaryLabel: string;
  readonly titleEyebrow: string;
  readonly unavailableLabel: string;
  readonly unknownParticipant: string;
}

export const copyRankedSlotButtonCopy: Record<SchedulePageLocale, CopyRankedSlotButtonCopy> = {
  "zh-CN": {
    copied: "已复制",
    copyFailed: "无法自动复制，可手动选中文本。",
    fallbackAriaLabel: "备选时间复制文本",
    idleLabel: "复制此备选"
  },
  en: {
    copied: "Copied",
    copyFailed: "Automatic copy failed. Select the text manually.",
    fallbackAriaLabel: "Copy ranked time summary",
    idleLabel: "Copy this time"
  }
};

export const confirmFinalTimeButtonCopy: Record<SchedulePageLocale, ConfirmFinalTimeButtonCopy> = {
  "zh-CN": {
    errorArchived: "归档后不能再设置。",
    errorDefault: "设置失败。",
    errorInvalidOwnerKey: "管理密钥无效。",
    errorValidation: "只能选择当前可确认的时间。",
    selected: "已设为最终",
    select: "设为最终"
  },
  en: {
    errorArchived: "Archived schedules can no longer be changed.",
    errorDefault: "Could not set the final time.",
    errorInvalidOwnerKey: "The organizer key is invalid.",
    errorValidation: "Choose one of the currently confirmable times.",
    selected: "Final Time",
    select: "Set Final"
  }
};

export const lockScheduleControlCopy: Record<SchedulePageLocale, LockScheduleControlCopy> = {
  "zh-CN": {
    archive: "归档",
    archivedSuccess: "已归档",
    exportCalendar: "导出日历",
    exportCsv: "导出 CSV",
    heading: "管理操作",
    lock: "锁定",
    lockedSuccess: "已锁定",
    actionDescription: (status) => {
      if (status === "archived") {
        return "归档后参与者不能再提交或修改时间。";
      }

      if (status === "locked") {
        return "参与者不能再提交或修改时间，你仍可以导出结果或归档日程。";
      }

      return "锁定会停止参与者提交；归档会把日程标记为已结束。";
    },
    actionTitle: (status) => {
      if (status === "archived") {
        return "日程已经归档";
      }

      if (status === "locked") {
        return "日程已经锁定";
      }

      return "管理日程";
    },
    errorDatabase: "数据库尚未配置。",
    errorDefault: "锁定失败。",
    errorInvalidOwnerKey: "管理链接无效或缺少密钥。",
    errorNotFound: "这个日程不存在或链接有误。",
    errorValidation: "请检查管理密钥。",
    statusLabel: (status) => statusLabel(status, "zh-CN")
  },
  en: {
    archive: "Archive",
    archivedSuccess: "Archived",
    exportCalendar: "Export Calendar",
    exportCsv: "Export CSV",
    heading: "Management Actions",
    lock: "Lock",
    lockedSuccess: "Locked",
    actionDescription: (status) => {
      if (status === "archived") {
        return "Participants can no longer submit or edit availability.";
      }

      if (status === "locked") {
        return "Participants can no longer submit or edit availability. You can still export results or archive the schedule.";
      }

      return "Locking stops participant submissions. Archiving marks the schedule as finished.";
    },
    actionTitle: (status) => {
      if (status === "archived") {
        return "Schedule Archived";
      }

      if (status === "locked") {
        return "Schedule Locked";
      }

      return "Manage Schedule";
    },
    errorDatabase: "The database is not configured yet.",
    errorDefault: "Could not lock the schedule.",
    errorInvalidOwnerKey: "The organizer link is invalid or missing its key.",
    errorNotFound: "This schedule does not exist, or the link is incorrect.",
    errorValidation: "Check the organizer key.",
    statusLabel: (status) => statusLabel(status, "en")
  }
};

export const manageResultSummaryPanelCopy: Record<
  SchedulePageLocale,
  ManageResultSummaryPanelCopy
> = {
  "zh-CN": {
    ariaLabel: "结果摘要",
    copied: "已复制",
    copyFailed: "无法自动复制，可以手动选中摘要文本。",
    copySummary: "复制摘要",
    safeHint: "不包含管理密钥。",
    textAreaLabel: "结果摘要文本",
    title: "结果摘要"
  },
  en: {
    ariaLabel: "Result summary",
    copied: "Copied",
    copyFailed: "Automatic copy failed. Select the summary text manually.",
    copySummary: "Copy Summary",
    safeHint: "Does not include the organizer key.",
    textAreaLabel: "Result summary text",
    title: "Result Summary"
  }
};

export const manageShareLinksPanelCopy: Record<SchedulePageLocale, ManageShareLinksPanelCopy> = {
  "zh-CN": {
    ariaLabel: "分享与管理链接",
    copied: "已复制",
    copy: "复制",
    copyFailed: "无法自动复制，可以手动选中链接。",
    managerPathPrefix: "/zh/s/",
    ownerLabel: "管理链接",
    publicPathPrefix: "/zh/s/",
    shareLabel: "公开填写链接",
    subtitle: "可随时复制",
    title: "分享链接"
  },
  en: {
    ariaLabel: "Share and organizer links",
    copied: "Copied",
    copy: "Copy",
    copyFailed: "Automatic copy failed. Select the link manually.",
    managerPathPrefix: "/s/",
    ownerLabel: "Organizer Link",
    publicPathPrefix: "/s/",
    shareLabel: "Public Availability Link",
    subtitle: "Copy whenever you need",
    title: "Share Links"
  }
};

export const managePageCopy: Record<SchedulePageLocale, ManagePageCopy> = {
  "zh-CN": {
    allAvailableCount: (count) => `${count} 段`,
    allAvailableEmptyBody: "当前参与者提交还没有形成全员共同时间。",
    allAvailableEmptyTitle: "暂时没有全员都可用的时间",
    allAvailableTitle: "全员可用时间",
    availableLabel: "可用",
    backSchedule: "返回日程",
    bestSlotsTitle: "当前较优时间槽",
    continuousSlots: (slotCount) => `${slotCount} 个连续时间槽`,
    dateRange: (start, end) => `${start} 至 ${end}`,
    exportFinalTime: "导出最终时间",
    exportThisTime: "导出此时间",
    finalTimeAria: "已确认最终时间",
    finalTimeTitle: "已确认最终时间",
    overviewAria: "管理概览",
    participantCount: (count) => `${count} 人`,
    participantSummary: (count) => `${count} 人参与`,
    participantsLabel: "参与者",
    peakNote:
      "这不是全员可用时间，先作为折中建议展示；最终确认仍需要选择全员可用时间，或让未覆盖的人再调整。",
    rankedSlotCount: (count) => `${count} 人参与`,
    rankedSlotEmptyBody: "目前没有参与者提交可用时间。",
    rankedSlotEmptyTitle: "还没有可排序的时间槽",
    recommendationAlternatesTitle: "备选推荐",
    recommendationBasisAria: "推荐依据",
    recommendationCoverageMetric: "覆盖率",
    recommendationDurationMetric: "连续时长",
    recommendationEmptyAfterSubmissions: (participantCount) =>
      `已有 ${participantCount} 人参与，但还没有任何可用时间槽。`,
    recommendationEmptyNoSubmissions:
      "有人提交可用时间后，系统会自动挑出覆盖人数最多、连续时长更好的时间段。",
    recommendationEmptyNoTime: "还没有可推荐的时间",
    recommendationEmptyWaiting: "还在等待参与者填写",
    recommendationHeadlineAllAvailable:
      "这是当前最长的全员共同可用时间，可以直接设为最终时间并导出日历。",
    recommendationHeadlinePeak: (ratio) =>
      `当前没有全员重叠时间，这一段覆盖 ${ratio}，适合作为下一轮协调的首选。`,
    recommendationPeopleMetric: "可用人数",
    recommendationStatusWaiting: "等待填写",
    recommendationTitle: "系统推荐最佳时间",
    recommendedAllAvailable: "全员可用",
    recommendedMostAvailable: "最多人可用",
    statusLabel: (status) => statusLabel(status, "zh-CN"),
    statusSummaryLabel: "状态",
    titleEyebrow: "Manage Schedule",
    unavailableLabel: "未覆盖",
    unknownParticipant: "未知参与者"
  },
  en: {
    allAvailableCount: (count) => `${count} blocks`,
    allAvailableEmptyBody: "Current submissions do not overlap for everyone yet.",
    allAvailableEmptyTitle: "No time works for everyone yet",
    allAvailableTitle: "Everyone Available",
    availableLabel: "Available",
    backSchedule: "Back to Schedule",
    bestSlotsTitle: "Best Current Time Slots",
    continuousSlots: (slotCount) => `${slotCount} continuous slots`,
    dateRange: (start, end) => `${start} to ${end}`,
    exportFinalTime: "Export Final Time",
    exportThisTime: "Export This Time",
    finalTimeAria: "Final time confirmed",
    finalTimeTitle: "Final Time Confirmed",
    overviewAria: "Management overview",
    participantCount: (count) => `${count} participants`,
    participantSummary: (count) => `${count} participants`,
    participantsLabel: "Participants",
    peakNote:
      "This is not available for everyone yet. Treat it as a compromise option, then ask uncovered participants to adjust before confirming.",
    rankedSlotCount: (count) => `${count} participants`,
    rankedSlotEmptyBody: "No participant has submitted availability yet.",
    rankedSlotEmptyTitle: "No ranked time slots yet",
    recommendationAlternatesTitle: "Alternate Recommendations",
    recommendationBasisAria: "Recommendation basis",
    recommendationCoverageMetric: "Coverage",
    recommendationDurationMetric: "Duration",
    recommendationEmptyAfterSubmissions: (participantCount) =>
      `${participantCount} participants have submitted, but no time slot is available yet.`,
    recommendationEmptyNoSubmissions:
      "After participants submit availability, the system will highlight the times with the most coverage and better continuous duration.",
    recommendationEmptyNoTime: "No recommended time yet",
    recommendationEmptyWaiting: "Waiting for participants",
    recommendationHeadlineAllAvailable:
      "This is the longest current time everyone can attend. You can set it as final and export it to a calendar.",
    recommendationHeadlinePeak: (ratio) =>
      `No time overlaps for everyone yet. This block covers ${ratio}, so it is a good first compromise to coordinate around.`,
    recommendationPeopleMetric: "Available People",
    recommendationStatusWaiting: "Waiting",
    recommendationTitle: "System Recommended Time",
    recommendedAllAvailable: "Everyone Available",
    recommendedMostAvailable: "Most Available",
    statusLabel: (status) => statusLabel(status, "en"),
    statusSummaryLabel: "Status",
    titleEyebrow: "Manage Schedule",
    unavailableLabel: "Not covered",
    unknownParticipant: "Unknown participant"
  }
};

export function statusLabel(status: ScheduleDetail["status"], locale: SchedulePageLocale): string {
  if (locale === "en") {
    if (status === "open") {
      return "Open";
    }

    if (status === "locked") {
      return "Locked";
    }

    return "Archived";
  }

  if (status === "open") {
    return "开放中";
  }

  if (status === "locked") {
    return "已锁定";
  }

  return "已归档";
}
