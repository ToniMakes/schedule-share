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
    errorArchived: "这份日程已归档，无法确认时间。",
    errorDefault: "暂时无法确认时间，请稍后重试。",
    errorInvalidOwnerKey: "组织者链接无效。",
    errorValidation: "请选择当前可确认的时间。",
    selected: "已确认",
    select: "确认此时间"
  },
  en: {
    errorArchived: "This schedule is archived, so you can’t confirm a time.",
    errorDefault: "We couldn’t confirm this time. Try again in a moment.",
    errorInvalidOwnerKey: "This organizer link is invalid.",
    errorValidation: "Choose a time that can be confirmed now.",
    selected: "Confirmed",
    select: "Confirm this time"
  }
};

export const lockScheduleControlCopy: Record<SchedulePageLocale, LockScheduleControlCopy> = {
  "zh-CN": {
    archive: "归档日程",
    archivedSuccess: "已归档",
    exportCalendar: "导出日历",
    exportCsv: "导出 CSV",
    heading: "日程状态",
    lock: "停止收集回应",
    lockedSuccess: "已锁定",
    actionDescription: (status) => {
      if (status === "archived") {
        return "这份日程已归档，参与者不能再提交或修改回应。";
      }

      if (status === "locked") {
        return "参与者不能再提交或修改回应。你仍可以导出结果或归档日程。";
      }

      return "停止收集回应后，参与者将无法继续修改；归档会将日程标记为已结束。";
    },
    actionTitle: (status) => {
      if (status === "archived") {
        return "日程已归档";
      }

      if (status === "locked") {
        return "已停止收集回应";
      }

      return "管理日程";
    },
    errorDatabase: "数据库尚未配置。",
    errorDefault: "暂时无法停止收集回应，请稍后重试。",
    errorInvalidOwnerKey: "组织者链接无效或缺少管理权限。",
    errorNotFound: "日程链接可能有误或已过期。",
    errorValidation: "请检查组织者链接。",
    statusLabel: (status) => statusLabel(status, "zh-CN")
  },
  en: {
    archive: "Archive schedule",
    archivedSuccess: "Archived",
    exportCalendar: "Export calendar",
    exportCsv: "Export CSV",
    heading: "Schedule status",
    lock: "Stop responses",
    lockedSuccess: "Locked",
    actionDescription: (status) => {
      if (status === "archived") {
        return "Participants can no longer submit or update responses.";
      }

      if (status === "locked") {
        return "Participants can no longer submit or update responses. You can still export results or archive the schedule.";
      }

      return "Stopping responses prevents participants from making changes. Archiving marks the schedule as finished.";
    },
    actionTitle: (status) => {
      if (status === "archived") {
        return "Schedule archived";
      }

      if (status === "locked") {
        return "Responses closed";
      }

      return "Manage schedule";
    },
    errorDatabase: "The database is not configured yet.",
    errorDefault: "We couldn’t stop responses. Try again in a moment.",
    errorInvalidOwnerKey: "This organizer link is invalid or missing access.",
    errorNotFound: "This schedule link may be incorrect or expired.",
    errorValidation: "Check your organizer link.",
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
    copySummary: "Copy summary",
    safeHint: "Does not include the organizer key.",
    textAreaLabel: "Result summary text",
    title: "Result summary"
  }
};

export const manageShareLinksPanelCopy: Record<SchedulePageLocale, ManageShareLinksPanelCopy> = {
  "zh-CN": {
    ariaLabel: "参与者填写与组织者管理链接",
    copied: "已复制",
    copy: "复制",
    copyFailed: "无法自动复制，请手动选中链接复制。",
    managerPathPrefix: "/zh/s/",
    ownerLabel: "组织者管理链接",
    publicPathPrefix: "/zh/s/",
    shareLabel: "参与者填写链接",
    subtitle: "将参与者链接发给需要回应的人。请妥善保管组织者链接。",
    title: "分享日程"
  },
  en: {
    ariaLabel: "Participant and organizer links",
    copied: "Copied",
    copy: "Copy",
    copyFailed: "Copy failed. Select and copy the link manually.",
    managerPathPrefix: "/s/",
    ownerLabel: "Organizer management link",
    publicPathPrefix: "/s/",
    shareLabel: "Participant response link",
    subtitle: "Share the participant link. Keep the organizer link private.",
    title: "Share this schedule"
  }
};

export const managePageCopy: Record<SchedulePageLocale, ManagePageCopy> = {
  "zh-CN": {
    allAvailableCount: (count) => `${count} 段`,
    allAvailableEmptyBody: "目前的回应还没有重叠出全员都方便的时间。",
    allAvailableEmptyTitle: "目前没有全员都方便的时间",
    allAvailableTitle: "全员都方便的时间",
    availableLabel: "可用",
    backSchedule: "返回日程",
    bestSlotsTitle: "多数人方便的时间",
    continuousSlots: (slotCount) => `${slotCount} 个连续时间段`,
    dateRange: (start, end) => `${start} 至 ${end}`,
    exportFinalTime: "导出最终时间",
    exportThisTime: "导出此时间",
    finalTimeAria: "已确认最终时间",
    finalTimeTitle: "已确认最终时间",
    overviewAria: "管理概览",
    participantCount: (count) => `${count} 人`,
    participantSummary: (count) => `${count} 人参与`,
    participantsLabel: "参与者",
    peakNote: "这些时段并非全员都方便。确认前可请其他参与者更新回应。",
    rankedSlotCount: (count) => `${count} 人参与`,
    rankedSlotEmptyBody: "参与者回应后，这里会显示多数人方便的时间段。",
    rankedSlotEmptyTitle: "等待大家回应",
    recommendationAlternatesTitle: "其他可选时间",
    recommendationBasisAria: "推荐依据",
    recommendationCoverageMetric: "覆盖率",
    recommendationDurationMetric: "连续时长",
    recommendationEmptyAfterSubmissions: (participantCount) =>
      `已有 ${participantCount} 人回应，但目前还没有人方便的时间。`,
    recommendationEmptyNoSubmissions: "参与者回应后，这里会按方便人数和连续时长列出可选时间。",
    recommendationEmptyNoTime: "目前没有可推荐的时间",
    recommendationEmptyWaiting: "等待大家回应",
    recommendationHeadlineAllAvailable:
      "这是目前最长的全员都方便时段。你可以确认这个时间并导出日历。",
    recommendationHeadlinePeak: (ratio) =>
      `目前没有全员都方便的时段；这段时间有 ${ratio} 的参与者可以参加。`,
    recommendationPeopleMetric: "方便人数",
    recommendationStatusWaiting: "等待填写",
    recommendationTitle: "建议时间",
    recommendedAllAvailable: "全员可用",
    recommendedMostAvailable: "最多人可用",
    statusLabel: (status) => statusLabel(status, "zh-CN"),
    statusSummaryLabel: "状态",
    titleEyebrow: "管理日程",
    unavailableLabel: "不方便",
    unknownParticipant: "未知参与者"
  },
  en: {
    allAvailableCount: (count) => `${count} blocks`,
    allAvailableEmptyBody: "Current responses don’t overlap for everyone yet.",
    allAvailableEmptyTitle: "No time works for everyone yet",
    allAvailableTitle: "Times that work for everyone",
    availableLabel: "Available",
    backSchedule: "Back to schedule",
    bestSlotsTitle: "Times that work for the most people",
    continuousSlots: (slotCount) => `${slotCount} consecutive time slots`,
    dateRange: (start, end) => `${start} to ${end}`,
    exportFinalTime: "Export confirmed time",
    exportThisTime: "Export this time",
    finalTimeAria: "Final time confirmed",
    finalTimeTitle: "Final time confirmed",
    overviewAria: "Management overview",
    participantCount: (count) => `${count} ${count === 1 ? "participant" : "participants"}`,
    participantSummary: (count) => `${count} ${count === 1 ? "participant" : "participants"}`,
    participantsLabel: "Participants",
    peakNote:
      "These times don’t work for everyone. Ask the remaining participants to update their responses before confirming.",
    rankedSlotCount: (count) => `${count} ${count === 1 ? "participant" : "participants"}`,
    rankedSlotEmptyBody: "Times that work for more people will appear here after they respond.",
    rankedSlotEmptyTitle: "Waiting for responses",
    recommendationAlternatesTitle: "Other options",
    recommendationBasisAria: "Recommendation basis",
    recommendationCoverageMetric: "Coverage",
    recommendationDurationMetric: "Duration",
    recommendationEmptyAfterSubmissions: (participantCount) =>
      `${participantCount} people have responded, but no one is available at the proposed times yet.`,
    recommendationEmptyNoSubmissions:
      "After people respond, times will be ranked by how many can attend and how long the available blocks are.",
    recommendationEmptyNoTime: "No suggested time yet",
    recommendationEmptyWaiting: "Waiting for responses",
    recommendationHeadlineAllAvailable:
      "This is the longest time everyone can attend. You can confirm it and export it to a calendar.",
    recommendationHeadlinePeak: (ratio) =>
      `No time works for everyone yet. ${ratio} of participants can attend this time.`,
    recommendationPeopleMetric: "Can attend",
    recommendationStatusWaiting: "Waiting for responses",
    recommendationTitle: "Suggested time",
    recommendedAllAvailable: "Works for everyone",
    recommendedMostAvailable: "Works for the most people",
    statusLabel: (status) => statusLabel(status, "en"),
    statusSummaryLabel: "Status",
    titleEyebrow: "Manage schedule",
    unavailableLabel: "Not available",
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
