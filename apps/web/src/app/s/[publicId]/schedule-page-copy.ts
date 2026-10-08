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
  readonly responseGroupAria: (label: string) => string;
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
  readonly errorCandidateResponseRequired: string;
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
      candidateCountSummary: (available, maybe) => `${available} 方便 · ${maybe} 必要时可以`,
      candidateHeading: "候选时间投票",
      closedBadge: "已关闭",
      closedBody: "组织者锁定或归档日程后，你将无法再修改回应。",
      closedTitle: "这份日程已关闭",
      copied: "已复制",
      copy: "复制",
      copyFailed: "无法自动复制，可以手动选中链接。",
      displayName: "你的名字",
      displayNamePlaceholder: "Aki",
      editLinkAria: "编辑链接",
      errorDatabase: "数据库尚未配置。",
      errorDefault: "暂时无法提交，请稍后重试。",
      errorCandidateResponseRequired: "请为每个候选时间选择“方便”“必要时可以”或“不方便”。",
      errorLocked: "这份日程已关闭，无法继续修改回应。",
      errorNotFound: "日程链接可能有误或已过期。",
      errorSlotOutOfRange: "所选时间不在这份日程的范围内。",
      errorValidation: "请检查标出的内容后重试。",
      flowAria: "填写流程",
      importStepBody: "有课表、日历、排班或固定作息时用；没有就跳过。",
      importStepTitle: "可选：预填可用时间",
      manualStepBody: "检查预填结果，或直接手动标记时间。",
      manualStepCandidateBody: "为每个候选时间选择状态；可以把首选排在前面。",
      manualStepCandidateTitle: "选择适合你的时间",
      manualStepTitle: "标记你方便的时间",
      nameStepBody: "这个名字会显示在日程回应中。",
      nameStepTitle: "填写你的名字",
      selectedCountSummary: (count) => `${count} 个已选`,
      stepImport: "可选预填",
      stepManual: "选择时间",
      stepName: "名字",
      stepSubmit: "确认回应",
      stepVote: "投票",
      submitAvailability: "提交可用时间",
      submitCandidate: "提交投票",
      submitHintAvailability: "之后可以通过编辑链接更新回应。",
      submitHintCandidate: "之后可以通过编辑链接更新投票。",
      submitTitleAvailability: "回应会更新小组的可用时间结果。",
      submitTitleCandidate: "投票会更新候选时间的结果。",
      successBody: "保存编辑链接，之后可以修改回应。这台浏览器也会记住这个入口。",
      successTitle: "已收到你的回应",
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
      waitingBody: "参与者提交回应后，这里会按可用人数显示各时段的重合情况。",
      waitingTitle: "等待大家回应"
    },
    availabilitySlotGrid: {
      all: "全选",
      allSelected: "已全选",
      batchActionsAria: "按天选择时间",
      cardsView: "按卡片选择",
      clear: "清空",
      colorLegendAria: "颜色图例",
      dateJumpAria: "日期快速跳转",
      daySelectionSummary: (dayIndex, dayCount, selected, total) =>
        `第 ${dayIndex}/${dayCount} 天 · ${selected}/${total} 已选`,
      emptyBody: "创建者还没有为这个日程生成可选时间。",
      emptyTitle: "没有可填写的时间格",
      matrixView: "网格选择",
      noSelection: "未选",
      selected: "已选",
      selectedDaysSummary: (activeDays, totalDays) => `${activeDays}/${totalDays} 天已选择`,
      selectedSlotsSummary: (selected, total) => `${selected}/${total} 已选`,
      slotAriaLabel: ({ date, selected, time, meta }) =>
        [date, time, selected ? "已标记可用" : "未标记可用", meta].join("，"),
      slotMetaSelectedCount: (selected) => `${selected} 人已选`,
      slotMetaTotalCount: (selected, total) => `${selected}/${total} 人可用`,
      viewAria: "手动填写视图",
      weekdayLabels: ["日", "一", "二", "三", "四", "五", "六"],
      yourAvailability: "你方便的时间"
    },
    candidateVoteList: {
      addPreferenceAria: (label) => `把 ${label} 加入偏好排序`,
      addPreferenceTitle: "加入偏好排序",
      available: "方便",
      availabilitySummary: (available, total, maybe) =>
        `已有 ${available}/${total} 人方便${maybe > 0 ? ` · ${maybe} 人必要时可以` : ""}`,
      candidateFallback: (index) => `候选 ${index + 1}`,
      decreasePreferenceAria: (label) => `降低 ${label} 的偏好顺位`,
      decreasePreferenceTitle: "降低偏好顺位",
      dragPreferenceAria: (label) => `拖拽调整 ${label} 的偏好顺位`,
      dragPreferenceTitle: "拖拽调整偏好顺位",
      maybe: "必要时可以",
      responseGroupAria: (label) => `${label}的回应状态`,
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
      openEdit: "打开编辑页面",
      rememberedBody: (displayName) => `${displayName} 可以从这里继续修改回应。`,
      rememberedTitle: "已记住你的编辑入口"
    },
    backHome: "返回首页",
    bestSlotsTitle: "多数人方便的时间",
    candidateMode: "候选时间投票",
    dateLabel: "日期",
    dateSeparator: " 至 ",
    daysEveryday: "每天",
    dayJoiner: "、",
    emptyRankedSlotsBody: "参与者回应后，这里会显示大家可用人数较多的时段。",
    emptyRankedSlotsTitle: "等待大家回应",
    everyoneAvailableTitle: "全员都方便的时间",
    finalTimeAria: "已确认最终时间",
    finalTimeTitle: "已确认的时间",
    fullAvailabilityEmptyBody: (hasParticipants) =>
      hasParticipants
        ? "可以查看多数人方便的时段，或请参与者更新回应。"
        : "参与者回应后，这里会显示全员都方便的时段。",
    fullAvailabilityEmptyTitle: "目前还没有全员都方便的时间",
    homeHref: "/zh",
    languageChineseHrefPrefix: "/zh/s/",
    languageEnglishHrefPrefix: "/s/",
    modeLabel: "日程方式",
    participantCount: (count) => `${count} 人`,
    participantsLabel: "参与者",
    rangeGroups: (count) => `${count} 组`,
    rangeSeparator: "-",
    scheduleOverviewAria: "日程概览",
    serverErrorDatabase: "数据库尚未配置。",
    serverErrorDefault: "暂时无法读取这份日程，请稍后重试。",
    serverErrorNotFound: "日程链接可能有误或已过期。",
    sharedScheduleEyebrow: "Shared schedule",
    slotsAvailable: (available, total) => `${available}/${total} 可用`,
    slotsAvailableNames: (names) => `方便：${names}`,
    slotsUnavailableNames: (names) => `不方便：${names}`,
    slotLengthLabel: "时间段长度",
    slotsPlural: (count) => `${count} 段`,
    timezoneLabel: "时区",
    unableTitle: "无法打开日程",
    windowRangesTitle: "每天的可选时间"
  },
  en: {
    availabilityForm: {
      availabilityAria: "Availability",
      candidateCountSummary: (available, maybe) => `${available} available · ${maybe} if needed`,
      candidateHeading: "Vote on time options",
      closedBadge: "Closed",
      closedBody: "You can’t update your response after the organizer closes the schedule.",
      closedTitle: "This schedule is closed",
      copied: "Copied",
      copy: "Copy",
      copyFailed: "Copy failed. Select and copy the link manually.",
      displayName: "Your name",
      displayNamePlaceholder: "Aki",
      editLinkAria: "Edit link",
      errorDatabase: "The database is not configured yet.",
      errorDefault: "We couldn’t submit your response. Try again in a moment.",
      errorCandidateResponseRequired:
        "Choose available, if needed, or not available for every time option.",
      errorLocked: "This schedule is closed, so you can’t update your response.",
      errorNotFound: "This schedule link may be incorrect or expired.",
      errorSlotOutOfRange: "The selected time is outside this schedule.",
      errorValidation: "Check the highlighted details, then try again.",
      flowAria: "Response steps",
      importStepBody:
        "Choose one optional shortcut: paste busy times, upload a calendar or CSV, or apply a weekly template. You can still edit the grid before submitting.",
      importStepTitle: "Optional: prefill your availability",
      manualStepBody: "Review imported times or mark your availability on the grid.",
      manualStepCandidateBody:
        "Choose a response for each option. Move your preferred times to the top.",
      manualStepCandidateTitle: "Choose the times that work for you",
      manualStepTitle: "Mark when you’re available",
      nameStepBody: "This name will appear with your response.",
      nameStepTitle: "Add your name",
      selectedCountSummary: (count) => `${count} selected`,
      stepImport: "Optional prefill",
      stepManual: "Choose times",
      stepName: "Name",
      stepSubmit: "Review response",
      stepVote: "Vote",
      submitAvailability: "Submit availability",
      submitCandidate: "Submit vote",
      submitHintAvailability: "You can update your response later with your edit link.",
      submitHintCandidate: "You can update your vote later with your edit link.",
      submitTitleAvailability: "Your response will update the group results.",
      submitTitleCandidate: "Your vote will update the option results.",
      successBody:
        "Save your edit link to update your response later. This browser will remember the link too.",
      successTitle: "Your response is in",
      title: "Mark your availability",
      voteTitle: "Vote on time options"
    },
    availabilityHeatmap: {
      available: "available",
      collapse: "Collapse",
      densityAria: "Heatmap filter",
      densityLabels: {
        all: "All times",
        available: "Some people available",
        peak: "Most overlap"
      },
      emptyFilteredBody: "Switch back to all time slots to see the full grid.",
      emptyFilteredTitle: "No time slots match this filter",
      expand: "Expand",
      gridCount: (visible, total, isAll) =>
        isAll ? `${total} slots` : `${visible}/${total} slots`,
      legendAria: "Heatmap legend",
      participantCount: (count) => `${count} ${count === 1 ? "participant" : "participants"}`,
      peak: "Peak",
      peakSummary: (peak, total) => `Peak ${peak}/${total}`,
      title: "Group availability heatmap",
      waitingBody:
        "Once people respond, each time slot will show how many participants are available.",
      waitingTitle: "Waiting for responses"
    },
    availabilitySlotGrid: {
      all: "Select all",
      allSelected: "selected",
      batchActionsAria: "Bulk selection",
      cardsView: "Cards",
      clear: "Clear",
      colorLegendAria: "Color legend",
      dateJumpAria: "Date shortcuts",
      daySelectionSummary: (dayIndex, dayCount, selected, total) =>
        `Day ${dayIndex}/${dayCount} · ${selected}/${total} selected`,
      emptyBody: "The organizer hasn’t added any times to this schedule yet.",
      emptyTitle: "No times to choose from yet",
      matrixView: "Grid",
      noSelection: "Not selected",
      selected: "Selected",
      selectedDaysSummary: (activeDays, totalDays) => `${activeDays}/${totalDays} days selected`,
      selectedSlotsSummary: (selected, total) => `${selected}/${total} selected`,
      slotAriaLabel: ({ date, selected, time, meta }) =>
        [date, time, selected ? "marked available" : "not marked available", meta].join(", "),
      slotMetaSelectedCount: (selected) => `${selected} available`,
      slotMetaTotalCount: (selected, total) => `${selected} of ${total} available`,
      viewAria: "Availability selection view",
      weekdayLabels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      yourAvailability: "Your availability"
    },
    candidateVoteList: {
      addPreferenceAria: (label) => `Add ${label} to preference order`,
      addPreferenceTitle: "Add to preference order",
      available: "Available",
      availabilitySummary: (available, total, maybe) =>
        `${available}/${total} available${maybe > 0 ? ` · ${maybe} if needed` : ""}`,
      candidateFallback: (index) => `Option ${index + 1}`,
      decreasePreferenceAria: (label) => `Move ${label} lower`,
      decreasePreferenceTitle: "Move lower",
      dragPreferenceAria: (label) => `Drag to reorder ${label}`,
      dragPreferenceTitle: "Drag to reorder",
      maybe: "If needed",
      responseGroupAria: (label) => `Response for ${label}`,
      noPreferenceRank: "Not ranked",
      preferenceRank: (rank) => `Preference #${rank}`,
      rangeSeparator: " to ",
      unavailable: "Not available",
      increasePreferenceAria: (label) => `Move ${label} higher`,
      increasePreferenceTitle: "Move higher"
    },
    rememberedEditLink: {
      ariaLabel: "Remembered edit link",
      copied: "Copied",
      copy: "Copy",
      copyFailed: "Automatic copy failed. Open the edit page or copy the link manually.",
      openEdit: "Open edit page",
      rememberedBody: (displayName) => `${displayName} can return here to update their response.`,
      rememberedTitle: "Your edit link is saved in this browser"
    },
    backHome: "Home",
    bestSlotsTitle: "Times that work for the most people",
    candidateMode: "Time option poll",
    dateLabel: "Dates",
    dateSeparator: " to ",
    daysEveryday: "Every day",
    dayJoiner: ", ",
    emptyRankedSlotsBody: "Times will appear here after participants respond.",
    emptyRankedSlotsTitle: "Waiting for responses",
    everyoneAvailableTitle: "Times that work for everyone",
    finalTimeAria: "Final time confirmed",
    finalTimeTitle: "Final time confirmed",
    fullAvailabilityEmptyBody: (hasParticipants) =>
      hasParticipants
        ? "Check times that work for the most people, or ask participants to update their availability."
        : "Times that work for everyone will appear here after people respond.",
    fullAvailabilityEmptyTitle: "No time works for everyone yet",
    homeHref: "/",
    languageChineseHrefPrefix: "/zh/s/",
    languageEnglishHrefPrefix: "/s/",
    modeLabel: "Schedule type",
    participantCount: (count) => `${count} ${count === 1 ? "participant" : "participants"}`,
    participantsLabel: "Participants",
    rangeGroups: (count) => `${count} groups`,
    rangeSeparator: "-",
    scheduleOverviewAria: "Schedule overview",
    serverErrorDatabase: "The database is not configured yet.",
    serverErrorDefault: "We couldn’t load this schedule. Try again in a moment.",
    serverErrorNotFound: "This schedule link may be incorrect or expired.",
    sharedScheduleEyebrow: "Shared schedule",
    slotsAvailable: (available, total) => `${available}/${total} available`,
    slotsAvailableNames: (names) => `Available: ${names}`,
    slotsUnavailableNames: (names) => `Not available: ${names}`,
    slotLengthLabel: "Slot length",
    slotsPlural: (count) => `${count} blocks`,
    timezoneLabel: "Time zone",
    unableTitle: "Couldn’t open this schedule",
    windowRangesTitle: "Daily time windows"
  }
};
