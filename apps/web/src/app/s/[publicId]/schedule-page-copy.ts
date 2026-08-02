export type SchedulePageLocale = "en" | "zh-CN";

export interface AvailabilitySlotGridCopy {
  readonly all: string;
  readonly allSelected: string;
  readonly batchActionsAria: string;
  readonly cardsView: string;
  readonly clear: string;
  readonly colorLegendAria: string;
  readonly dateJumpAria: string;
  readonly daySelectionSummary: (
    dayIndex: number,
    dayCount: number,
    selected: number,
    total: number
  ) => string;
  readonly emptyBody: string;
  readonly emptyTitle: string;
  readonly matrixView: string;
  readonly noSelection: string;
  readonly selected: string;
  readonly selectedDaysSummary: (activeDays: number, totalDays: number) => string;
  readonly selectedSlotsSummary: (selected: number, total: number) => string;
  readonly slotAriaLabel: (input: {
    readonly date: string;
    readonly selected: boolean;
    readonly time: string;
    readonly meta: string;
  }) => string;
  readonly slotMetaSelectedCount: (selected: number) => string;
  readonly slotMetaTotalCount: (selected: number, total: number) => string;
  readonly viewAria: string;
  readonly yourAvailability: string;
  readonly weekdayLabels: readonly [string, string, string, string, string, string, string];
}

export interface CandidateVoteListCopy {
  readonly addPreferenceAria: (label: string) => string;
  readonly addPreferenceTitle: string;
  readonly available: string;
  readonly availabilitySummary: (available: number, total: number, maybe: number) => string;
  readonly candidateFallback: (index: number) => string;
  readonly decreasePreferenceAria: (label: string) => string;
  readonly decreasePreferenceTitle: string;
  readonly dragPreferenceAria: (label: string) => string;
  readonly dragPreferenceTitle: string;
  readonly maybe: string;
  readonly noPreferenceRank: string;
  readonly preferenceRank: (rank: number) => string;
  readonly rangeSeparator: string;
  readonly unavailable: string;
  readonly increasePreferenceAria: (label: string) => string;
  readonly increasePreferenceTitle: string;
}

export interface RememberedEditLinkCopy {
  readonly ariaLabel: string;
  readonly copied: string;
  readonly copy: string;
  readonly copyFailed: string;
  readonly openEdit: string;
  readonly rememberedBody: (displayName: string) => string;
  readonly rememberedTitle: string;
}

export interface AvailabilityHeatmapCopy {
  readonly available: string;
  readonly collapse: string;
  readonly densityAria: string;
  readonly densityLabels: Record<"all" | "available" | "peak", string>;
  readonly emptyFilteredBody: string;
  readonly emptyFilteredTitle: string;
  readonly expand: string;
  readonly gridCount: (visible: number, total: number, isAll: boolean) => string;
  readonly legendAria: string;
  readonly participantCount: (count: number) => string;
  readonly peak: string;
  readonly peakSummary: (peak: number, total: number) => string;
  readonly title: string;
  readonly waitingBody: string;
  readonly waitingTitle: string;
}

export interface AvailabilityFormCopy {
  readonly availabilityAria: string;
  readonly candidateCountSummary: (available: number, maybe: number) => string;
  readonly candidateHeading: string;
  readonly closedBadge: string;
  readonly closedBody: string;
  readonly closedTitle: string;
  readonly copied: string;
  readonly copy: string;
  readonly copyFailed: string;
  readonly displayName: string;
  readonly displayNamePlaceholder: string;
  readonly editLinkAria: string;
  readonly errorDatabase: string;
  readonly errorDefault: string;
  readonly errorLocked: string;
  readonly errorNotFound: string;
  readonly errorSlotOutOfRange: string;
  readonly errorValidation: string;
  readonly flowAria: string;
  readonly importStepBody: string;
  readonly importStepTitle: string;
  readonly manualStepBody: string;
  readonly manualStepCandidateBody: string;
  readonly manualStepCandidateTitle: string;
  readonly manualStepTitle: string;
  readonly nameStepBody: string;
  readonly nameStepTitle: string;
  readonly selectedCountSummary: (count: number) => string;
  readonly stepImport: string;
  readonly stepManual: string;
  readonly stepName: string;
  readonly stepSubmit: string;
  readonly stepVote: string;
  readonly submitAvailability: string;
  readonly submitCandidate: string;
  readonly submitHintAvailability: string;
  readonly submitHintCandidate: string;
  readonly submitTitleAvailability: string;
  readonly submitTitleCandidate: string;
  readonly successBody: string;
  readonly successTitle: string;
  readonly title: string;
  readonly voteTitle: string;
}

export interface SchedulePageCopy {
  readonly availabilityForm: AvailabilityFormCopy;
  readonly availabilityHeatmap: AvailabilityHeatmapCopy;
  readonly availabilitySlotGrid: AvailabilitySlotGridCopy;
  readonly backHome: string;
  readonly candidateVoteList: CandidateVoteListCopy;
  readonly rememberedEditLink: RememberedEditLinkCopy;
  readonly bestSlotsTitle: string;
  readonly candidateMode: string;
  readonly dateLabel: string;
  readonly dateSeparator: string;
  readonly daysEveryday: string;
  readonly dayJoiner: string;
  readonly emptyRankedSlotsBody: string;
  readonly emptyRankedSlotsTitle: string;
  readonly everyoneAvailableTitle: string;
  readonly finalTimeAria: string;
  readonly finalTimeTitle: string;
  readonly fullAvailabilityEmptyBody: (hasParticipants: boolean) => string;
  readonly fullAvailabilityEmptyTitle: string;
  readonly homeHref: string;
  readonly languageChineseHrefPrefix: string;
  readonly languageEnglishHrefPrefix: string;
  readonly modeLabel: string;
  readonly participantCount: (count: number) => string;
  readonly participantsLabel: string;
  readonly rangeGroups: (count: number) => string;
  readonly rangeSeparator: string;
  readonly scheduleOverviewAria: string;
  readonly serverErrorDatabase: string;
  readonly serverErrorDefault: string;
  readonly serverErrorNotFound: string;
  readonly sharedScheduleEyebrow: string;
  readonly slotsAvailable: (available: number, total: number) => string;
  readonly slotsAvailableNames: (names: string) => string;
  readonly slotsUnavailableNames: (names: string) => string;
  readonly slotLengthLabel: string;
  readonly slotsPlural: (count: number) => string;
  readonly timezoneLabel: string;
  readonly unableTitle: string;
  readonly windowRangesTitle: string;
}

export const schedulePageCopy: Record<SchedulePageLocale, SchedulePageCopy> = {
  "zh-CN": {
    availabilityForm: {
      availabilityAria: "可用时间",
      candidateCountSummary: (available, maybe) => `${available} 方便 · ${maybe} 也许`,
      candidateHeading: "候选时间投票",
      closedBadge: "已关闭",
      closedBody: "组织者锁定或归档后，参与者不能再更新可用时间。",
      closedTitle: "这个日程已经停止接收提交",
      copied: "已复制",
      copy: "复制",
      copyFailed: "无法自动复制，可以手动选中链接。",
      displayName: "你的名字",
      displayNamePlaceholder: "Aki",
      editLinkAria: "编辑链接",
      errorDatabase: "数据库尚未配置。",
      errorDefault: "提交失败。",
      errorLocked: "这个日程已经停止接收提交。",
      errorNotFound: "这个日程不存在或链接有误。",
      errorSlotOutOfRange: "提交的时间不在这个日程范围内。",
      errorValidation: "请检查填写内容。",
      flowAria: "填写流程",
      importStepBody: "有课表、日历、排班或固定作息时用；没有就跳过。",
      importStepTitle: "任选一种快速预填",
      manualStepBody: "预填结果会落在这里，也可以直接手动填写。",
      manualStepCandidateBody: "对候选时间标记方便程度，想优先安排的时间可以排在前面。",
      manualStepCandidateTitle: "选择你的偏好",
      manualStepTitle: "检查并涂选时间",
      nameStepBody: "结果页会用它标记你的提交。",
      nameStepTitle: "先写名字",
      selectedCountSummary: (count) => `${count} 个已选`,
      stepImport: "可选预填",
      stepManual: "涂选",
      stepName: "名字",
      stepSubmit: "提交",
      stepVote: "投票",
      submitAvailability: "提交可用时间",
      submitCandidate: "提交投票",
      submitHintAvailability: "之后可以用编辑链接修改可用时间。",
      submitHintCandidate: "之后可以用编辑链接修改投票。",
      submitTitleAvailability: "提交后会更新大家的重叠时间",
      submitTitleCandidate: "提交后会更新投票结果",
      successBody: "之后修改可用时间需要这个链接；这台浏览器也会记住这个编辑入口。",
      successTitle: "已提交，请保存编辑链接",
      title: "填写可用时间",
      voteTitle: "候选时间投票"
    },
    availabilityHeatmap: {
      available: "可用",
      collapse: "收起",
      densityAria: "热力图筛选",
      densityLabels: {
        all: "全部",
        available: "有人可用",
        peak: "只看峰值"
      },
      emptyFilteredBody: "切回全部可以查看所有候选时间格。",
      emptyFilteredTitle: "当前筛选没有时间格",
      expand: "展开",
      gridCount: (visible, total, isAll) => (isAll ? `${total} 格` : `${visible}/${total} 格`),
      legendAria: "热力图图例",
      participantCount: (count) => `${count} 人参与`,
      peak: "峰值",
      peakSummary: (peak, total) => `峰值 ${peak}/${total}`,
      title: "结果热力图",
      waitingBody: "有人填写后，这里会按人数深浅显示每个时间格的重合程度。",
      waitingTitle: "等待参与者提交"
    },
    availabilitySlotGrid: {
      all: "全选",
      allSelected: "已选",
      batchActionsAria: "批量选择",
      cardsView: "卡片选择",
      clear: "清空",
      colorLegendAria: "颜色图例",
      dateJumpAria: "日期快速跳转",
      daySelectionSummary: (dayIndex, dayCount, selected, total) =>
        `第 ${dayIndex}/${dayCount} 天 · ${selected}/${total} 已选`,
      emptyBody: "创建者还没有为这个日程生成可选时间。",
      emptyTitle: "没有可填写的时间格",
      matrixView: "表格涂选",
      noSelection: "未选",
      selected: "已选",
      selectedDaysSummary: (activeDays, totalDays) => `${activeDays}/${totalDays} 天有选择`,
      selectedSlotsSummary: (selected, total) => `${selected}/${total} 已选`,
      slotAriaLabel: ({ date, selected, time, meta }) =>
        [date, time, selected ? "已标记可用" : "未标记可用", meta].join("，"),
      slotMetaSelectedCount: (selected) => `${selected} 人已选`,
      slotMetaTotalCount: (selected, total) => `${selected}/${total} 人可用`,
      viewAria: "手动填写视图",
      weekdayLabels: ["日", "一", "二", "三", "四", "五", "六"],
      yourAvailability: "你的可用时间"
    },
    candidateVoteList: {
      addPreferenceAria: (label) => `把 ${label} 加入偏好排序`,
      addPreferenceTitle: "加入偏好排序",
      available: "方便",
      availabilitySummary: (available, total, maybe) =>
        `已有 ${available}/${total} 方便${maybe > 0 ? ` · ${maybe} 也许` : ""}`,
      candidateFallback: (index) => `候选 ${index + 1}`,
      decreasePreferenceAria: (label) => `降低 ${label} 的偏好顺位`,
      decreasePreferenceTitle: "降低偏好顺位",
      dragPreferenceAria: (label) => `拖拽调整 ${label} 的偏好顺位`,
      dragPreferenceTitle: "拖拽调整偏好顺位",
      maybe: "也许",
      noPreferenceRank: "偏好未排序",
      preferenceRank: (rank) => `偏好 #${rank}`,
      rangeSeparator: " 至 ",
      unavailable: "不方便",
      increasePreferenceAria: (label) => `提高 ${label} 的偏好顺位`,
      increasePreferenceTitle: "提高偏好顺位"
    },
    rememberedEditLink: {
      ariaLabel: "已记住的编辑链接",
      copied: "已复制",
      copy: "复制",
      copyFailed: "无法自动复制，可以打开编辑页面或手动复制链接。",
      openEdit: "打开编辑",
      rememberedBody: (displayName) => `${displayName} 可以直接回到自己的编辑页面。`,
      rememberedTitle: "这台浏览器记得你的提交"
    },
    backHome: "返回首页",
    bestSlotsTitle: "当前最优时间槽",
    candidateMode: "候选投票",
    dateLabel: "日期",
    dateSeparator: " 至 ",
    daysEveryday: "每天",
    dayJoiner: "、",
    emptyRankedSlotsBody: "目前没有参与者提交可用时间。",
    emptyRankedSlotsTitle: "还没有可排序的时间槽",
    everyoneAvailableTitle: "全员可用时间",
    finalTimeAria: "已确认最终时间",
    finalTimeTitle: "已确认最终时间",
    fullAvailabilityEmptyBody: (hasParticipants) =>
      hasParticipants
        ? "可以扩大日期范围、调整时间段，或等待更多参与者更新。"
        : "等待参与者提交可用时间后，这里会自动汇总。",
    fullAvailabilityEmptyTitle: "暂时没有全员都可用的时间",
    homeHref: "/",
    languageChineseHrefPrefix: "/s/",
    languageEnglishHrefPrefix: "/en/s/",
    modeLabel: "模式",
    participantCount: (count) => `${count} 人`,
    participantsLabel: "参与者",
    rangeGroups: (count) => `${count} 组`,
    rangeSeparator: "-",
    scheduleOverviewAria: "日程概览",
    serverErrorDatabase: "数据库尚未配置。",
    serverErrorDefault: "服务器暂时无法读取这个日程。",
    serverErrorNotFound: "这个日程不存在或链接有误。",
    sharedScheduleEyebrow: "Shared Schedule",
    slotsAvailable: (available, total) => `${available}/${total} 可用`,
    slotsAvailableNames: (names) => `方便：${names}`,
    slotsUnavailableNames: (names) => `未选此时间：${names}`,
    slotLengthLabel: "粒度",
    slotsPlural: (count) => `${count} 段`,
    timezoneLabel: "时区",
    unableTitle: "无法打开日程",
    windowRangesTitle: "可选时间范围"
  },
  en: {
    availabilityForm: {
      availabilityAria: "Availability",
      candidateCountSummary: (available, maybe) => `${available} yes · ${maybe} maybe`,
      candidateHeading: "Vote on Candidate Times",
      closedBadge: "Closed",
      closedBody:
        "After the organizer locks or archives the schedule, participants can no longer update availability.",
      closedTitle: "This schedule is no longer accepting submissions",
      copied: "Copied",
      copy: "Copy",
      copyFailed: "Automatic copy failed. Select the link manually.",
      displayName: "Your Name",
      displayNamePlaceholder: "Aki",
      editLinkAria: "Edit link",
      errorDatabase: "The database is not configured yet.",
      errorDefault: "Submit failed.",
      errorLocked: "This schedule is no longer accepting submissions.",
      errorNotFound: "This schedule does not exist, or the link is incorrect.",
      errorSlotOutOfRange: "The submitted time is outside this schedule.",
      errorValidation: "Check the form contents.",
      flowAria: "Availability flow",
      importStepBody:
        "Choose one optional shortcut: paste busy times, upload a calendar or CSV, or apply a weekly template. You can still edit the grid before submitting.",
      importStepTitle: "Quick Import",
      manualStepBody: "Click and drag across the grid to mark when you are available.",
      manualStepCandidateBody:
        "Mark each option as yes, maybe, or no. Put your preferred times earlier when possible.",
      manualStepCandidateTitle: "Choose Your Preferences",
      manualStepTitle: "Mark Your Availability",
      nameStepBody: "Results will use this name to label your submission.",
      nameStepTitle: "Add Your Name",
      selectedCountSummary: (count) => `${count} selected`,
      stepImport: "Optional import",
      stepManual: "Mark",
      stepName: "Name",
      stepSubmit: "Submit",
      stepVote: "Vote",
      submitAvailability: "Submit Availability",
      submitCandidate: "Submit Vote",
      submitHintAvailability: "You can update availability later with your edit link.",
      submitHintCandidate: "You can update your vote later with your edit link.",
      submitTitleAvailability: "Submitting will update the group overlap.",
      submitTitleCandidate: "Submitting will update the vote results.",
      successBody:
        "You need this link to update your submission later. This browser will remember it too.",
      successTitle: "Submitted. Save Your Edit Link",
      title: "Fill In Availability",
      voteTitle: "Vote on Candidate Times"
    },
    availabilityHeatmap: {
      available: "available",
      collapse: "Collapse",
      densityAria: "Heatmap filter",
      densityLabels: {
        all: "All",
        available: "Available",
        peak: "Peak only"
      },
      emptyFilteredBody: "Switch back to all time slots to see the full grid.",
      emptyFilteredTitle: "No time slots match this filter",
      expand: "Expand",
      gridCount: (visible, total, isAll) =>
        isAll ? `${total} slots` : `${visible}/${total} slots`,
      legendAria: "Heatmap legend",
      participantCount: (count) => `${count} participants`,
      peak: "Peak",
      peakSummary: (peak, total) => `Peak ${peak}/${total}`,
      title: "Group Availability Heatmap",
      waitingBody:
        "After participants submit availability, each time slot will show overlap by intensity.",
      waitingTitle: "Waiting for participants"
    },
    availabilitySlotGrid: {
      all: "Select All",
      allSelected: "selected",
      batchActionsAria: "Bulk selection",
      cardsView: "Cards",
      clear: "Clear",
      colorLegendAria: "Color legend",
      dateJumpAria: "Date shortcuts",
      daySelectionSummary: (dayIndex, dayCount, selected, total) =>
        `Day ${dayIndex}/${dayCount} · ${selected}/${total} selected`,
      emptyBody: "The organizer has not generated any available time slots for this schedule.",
      emptyTitle: "No Time Slots to Fill",
      matrixView: "Grid",
      noSelection: "Not selected",
      selected: "Selected",
      selectedDaysSummary: (activeDays, totalDays) => `${activeDays}/${totalDays} days selected`,
      selectedSlotsSummary: (selected, total) => `${selected}/${total} selected`,
      slotAriaLabel: ({ date, selected, time, meta }) =>
        [date, time, selected ? "marked available" : "not marked available", meta].join(", "),
      slotMetaSelectedCount: (selected) => `${selected} selected`,
      slotMetaTotalCount: (selected, total) => `${selected}/${total} available`,
      viewAria: "Manual entry view",
      weekdayLabels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      yourAvailability: "Your Availability"
    },
    candidateVoteList: {
      addPreferenceAria: (label) => `Add ${label} to preference order`,
      addPreferenceTitle: "Add to preference order",
      available: "Yes",
      availabilitySummary: (available, total, maybe) =>
        `${available}/${total} yes${maybe > 0 ? ` · ${maybe} maybe` : ""}`,
      candidateFallback: (index) => `Option ${index + 1}`,
      decreasePreferenceAria: (label) => `Move ${label} lower`,
      decreasePreferenceTitle: "Move lower",
      dragPreferenceAria: (label) => `Drag to reorder ${label}`,
      dragPreferenceTitle: "Drag to reorder",
      maybe: "Maybe",
      noPreferenceRank: "Not ranked",
      preferenceRank: (rank) => `Preference #${rank}`,
      rangeSeparator: " to ",
      unavailable: "No",
      increasePreferenceAria: (label) => `Move ${label} higher`,
      increasePreferenceTitle: "Move higher"
    },
    rememberedEditLink: {
      ariaLabel: "Remembered edit link",
      copied: "Copied",
      copy: "Copy",
      copyFailed: "Automatic copy failed. Open the edit page or copy the link manually.",
      openEdit: "Open Edit",
      rememberedBody: (displayName) => `${displayName} can go back to their edit page directly.`,
      rememberedTitle: "This Browser Remembers Your Submission"
    },
    backHome: "Back Home",
    bestSlotsTitle: "Best Current Time Slots",
    candidateMode: "Candidate Poll",
    dateLabel: "Dates",
    dateSeparator: " to ",
    daysEveryday: "Every day",
    dayJoiner: ", ",
    emptyRankedSlotsBody: "No participant has submitted availability yet.",
    emptyRankedSlotsTitle: "No ranked time slots yet",
    everyoneAvailableTitle: "Everyone Available",
    finalTimeAria: "Final time confirmed",
    finalTimeTitle: "Final Time Confirmed",
    fullAvailabilityEmptyBody: (hasParticipants) =>
      hasParticipants
        ? "You can expand the date range, adjust the time window, or wait for more updates."
        : "After participants submit availability, overlapping times will appear here.",
    fullAvailabilityEmptyTitle: "No time works for everyone yet",
    homeHref: "/en",
    languageChineseHrefPrefix: "/s/",
    languageEnglishHrefPrefix: "/en/s/",
    modeLabel: "Mode",
    participantCount: (count) => `${count} participants`,
    participantsLabel: "Participants",
    rangeGroups: (count) => `${count} groups`,
    rangeSeparator: "-",
    scheduleOverviewAria: "Schedule overview",
    serverErrorDatabase: "The database is not configured yet.",
    serverErrorDefault: "The server cannot read this schedule right now.",
    serverErrorNotFound: "This schedule does not exist, or the link is incorrect.",
    sharedScheduleEyebrow: "Shared Schedule",
    slotsAvailable: (available, total) => `${available}/${total} available`,
    slotsAvailableNames: (names) => `Available: ${names}`,
    slotsUnavailableNames: (names) => `Not selected: ${names}`,
    slotLengthLabel: "Slot",
    slotsPlural: (count) => `${count} blocks`,
    timezoneLabel: "Time Zone",
    unableTitle: "Cannot Open Schedule",
    windowRangesTitle: "Available Time Ranges"
  }
};
