export type NewScheduleFormLocale = "en" | "zh-CN";

export const dayValues = [1, 2, 3, 4, 5, 6, 0] as const;

type DayValue = (typeof dayValues)[number];

export interface NewScheduleFormCopy {
  readonly addCandidate: string;
  readonly availableDays: string;
  readonly availableDaysAria: string;
  readonly basicInfo: string;
  readonly candidateDate: string;
  readonly candidateEnd: string;
  readonly candidateLabel: string;
  readonly candidatePoll: string;
  readonly candidates: string;
  readonly copied: string;
  readonly copy: string;
  readonly create: string;
  readonly created: string;
  readonly creationMethod: string;
  readonly creationMethodAria: string;
  readonly dayLabels: Record<DayValue, string>;
  readonly deleteCandidateAria: (index: number) => string;
  readonly description: string;
  readonly descriptionPlaceholder: string;
  readonly endDate: string;
  readonly endTime: string;
  readonly gridModeDescription: string;
  readonly gridMode: string;
  readonly candidatePollDescription: string;
  readonly managerLink: string;
  readonly minuteLabel: (minutes: number) => string;
  readonly saveUnavailableBody: string;
  readonly saveUnavailableTitle: string;
  readonly saveUnknownBody: string;
  readonly saveUnknownTitle: string;
  readonly selectDateErrorBody: string;
  readonly selectDateErrorTitle: string;
  readonly shareLink: string;
  readonly slotMinutes: string;
  readonly slotMinutesAria: string;
  readonly startDate: string;
  readonly startTime: string;
  readonly submitValidationBody: string;
  readonly submitValidationTitle: string;
  readonly title: string;
  readonly titlePlaceholder: string;
  readonly timezone: string;
  readonly timeRange: string;
  readonly managerSchedulePathPrefix: string;
  readonly publicSchedulePathPrefix: string;
  readonly candidatePlaceholder: (index: number) => string;
  readonly coreErrorTitle: string;
  readonly databaseErrorTitle: string;
  readonly databaseErrorBody: string;
  readonly createFailedTitle: string;
  readonly createFailedBody: string;
}

export const newScheduleFormCopy: Record<NewScheduleFormLocale, NewScheduleFormCopy> = {
  "zh-CN": {
    addCandidate: "添加候选时间",
    availableDays: "选择日期",
    availableDaysAria: "可选日期",
    basicInfo: "日程信息",
    candidateDate: "日期",
    candidateEnd: "结束",
    candidateLabel: "标签",
    candidatePoll: "投票选择候选时间",
    candidatePollDescription: "提供几个时间，让大家选择哪些方便。",
    candidates: "候选时间",
    copied: "已复制",
    copy: "复制",
    create: "创建日程",
    created: "日程已创建",
    creationMethod: "选择日程方式",
    creationMethodAria: "选择日程方式",
    dayLabels: {
      0: "日",
      1: "一",
      2: "二",
      3: "三",
      4: "四",
      5: "五",
      6: "六"
    },
    deleteCandidateAria: (index) => `删除候选 ${index + 1}`,
    description: "说明",
    descriptionPlaceholder: "可选",
    endDate: "结束日期",
    endTime: "结束时间",
    gridModeDescription: "让大家标记自己能参加的日期和时段。",
    gridMode: "收集可用时间",
    managerLink: "组织者管理链接",
    minuteLabel: (minutes) => `${minutes} 分钟`,
    saveUnavailableBody: "当前环境尚未连接数据库，因此暂时不能创建真实日程。",
    saveUnavailableTitle: "暂时无法创建日程",
    saveUnknownBody: "暂时无法确认保存服务是否可用。提交时会再次检查。",
    saveUnknownTitle: "无法确认服务状态",
    selectDateErrorBody: "至少选择一天，才能生成可用时间。",
    selectDateErrorTitle: "选择日期",
    shareLink: "参与者填写链接",
    slotMinutes: "时间段长度",
    slotMinutesAria: "时间段长度",
    startDate: "开始日期",
    startTime: "开始时间",
    submitValidationBody: "请检查标题、日期和时间范围后重试。",
    submitValidationTitle: "检查日程信息",
    title: "标题",
    titlePlaceholder: "周末聚餐",
    timezone: "时区",
    timeRange: "时间范围",
    managerSchedulePathPrefix: "/zh/s/",
    publicSchedulePathPrefix: "/zh/s/",
    candidatePlaceholder: (index) => `候选 ${index + 1}`,
    coreErrorTitle: "请检查候选时间",
    databaseErrorTitle: "暂时无法保存日程",
    databaseErrorBody: "当前环境还没有连接数据库。接入 Postgres 后就能创建和分享真实日程。",
    createFailedBody: "请稍后再试。",
    createFailedTitle: "创建失败"
  },
  en: {
    addCandidate: "Add a time option",
    availableDays: "Choose days",
    availableDaysAria: "Available days",
    basicInfo: "Schedule details",
    candidateDate: "Date",
    candidateEnd: "End",
    candidateLabel: "Label",
    candidatePoll: "Vote on time options",
    candidatePollDescription: "Suggest a few times and let everyone choose what works.",
    candidates: "Time options",
    copied: "Copied",
    copy: "Copy",
    create: "Create schedule",
    created: "Schedule created",
    creationMethod: "How should people respond?",
    creationMethodAria: "How people respond",
    dayLabels: {
      0: "Sun",
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat"
    },
    deleteCandidateAria: (index) => `Delete option ${index + 1}`,
    description: "Description",
    descriptionPlaceholder: "Optional",
    endDate: "End date",
    endTime: "End time",
    gridModeDescription: "Let everyone mark the dates and times they can make.",
    gridMode: "Collect availability",
    managerLink: "Organizer management link",
    minuteLabel: (minutes) => `${minutes} minutes`,
    saveUnavailableBody:
      "A database connection is required to create a schedule in this environment.",
    saveUnavailableTitle: "Schedule creation is unavailable",
    saveUnknownBody:
      "We couldn’t confirm that the save service is ready. We’ll check again when you submit.",
    saveUnknownTitle: "Couldn’t check the service",
    selectDateErrorBody: "Select at least one day to create time slots.",
    selectDateErrorTitle: "Choose a day",
    shareLink: "Participant response link",
    slotMinutes: "Time slot length",
    slotMinutesAria: "Time slot length",
    startDate: "Start date",
    startTime: "Start time",
    submitValidationBody: "Check the title, dates, and time range, then try again.",
    submitValidationTitle: "Check schedule details",
    title: "Title",
    titlePlaceholder: "Weekend dinner",
    timezone: "Time zone",
    timeRange: "Daily time window",
    managerSchedulePathPrefix: "/s/",
    publicSchedulePathPrefix: "/s/",
    candidatePlaceholder: (index) => `Option ${index + 1}`,
    coreErrorTitle: "Check time options",
    databaseErrorTitle: "Schedule creation is unavailable",
    databaseErrorBody:
      "The database is not connected in this environment. Connect Postgres before creating and sharing real schedules.",
    createFailedBody: "Please try again later.",
    createFailedTitle: "Couldn’t create the schedule"
  }
};
