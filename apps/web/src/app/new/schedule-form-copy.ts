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
  readonly gridMode: string;
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
    addCandidate: "新增候选",
    availableDays: "可选日期",
    availableDaysAria: "可选日期",
    basicInfo: "基本信息",
    candidateDate: "日期",
    candidateEnd: "结束",
    candidateLabel: "标签",
    candidatePoll: "候选投票",
    candidates: "候选时间",
    copied: "已复制",
    copy: "复制",
    create: "创建日程",
    created: "已创建",
    creationMethod: "创建方式",
    creationMethodAria: "创建方式",
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
    gridMode: "开放网格",
    managerLink: "管理链接",
    minuteLabel: (minutes) => `${minutes} 分钟`,
    saveUnavailableBody:
      "当前环境还没有连接数据库。页面可以预览，接入 Postgres 后就能创建和分享真实日程。",
    saveUnavailableTitle: "暂时无法保存日程",
    saveUnknownBody: "服务状态检查没有返回预期结果。你仍可以填写表单，提交时会再次确认。",
    saveUnknownTitle: "无法确认保存状态",
    selectDateErrorBody: "至少需要选择一天，系统才能生成候选时间。",
    selectDateErrorTitle: "请选择可选日期",
    shareLink: "分享链接",
    slotMinutes: "时间粒度",
    slotMinutesAria: "时间粒度",
    startDate: "开始日期",
    startTime: "开始时间",
    submitValidationBody: "有些输入没有通过校验，请确认日期、时间和标题后再试。",
    submitValidationTitle: "请检查表单内容",
    title: "标题",
    titlePlaceholder: "周末聚餐",
    timezone: "时区",
    timeRange: "时间范围",
    managerSchedulePathPrefix: "/s/",
    publicSchedulePathPrefix: "/s/",
    candidatePlaceholder: (index) => `候选 ${index + 1}`,
    coreErrorTitle: "请检查候选时间",
    databaseErrorTitle: "暂时无法保存日程",
    databaseErrorBody: "当前环境还没有连接数据库。接入 Postgres 后就能创建和分享真实日程。",
    createFailedBody: "请稍后再试。",
    createFailedTitle: "创建失败"
  },
  en: {
    addCandidate: "Add option",
    availableDays: "Available Days",
    availableDaysAria: "Available days",
    basicInfo: "Basic Info",
    candidateDate: "Date",
    candidateEnd: "End",
    candidateLabel: "Label",
    candidatePoll: "Candidate Poll",
    candidates: "Candidate Times",
    copied: "Copied",
    copy: "Copy",
    create: "Create Schedule",
    created: "Created",
    creationMethod: "Creation Method",
    creationMethodAria: "Creation method",
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
    endDate: "End Date",
    endTime: "End Time",
    gridMode: "Open Grid",
    managerLink: "Organizer Link",
    minuteLabel: (minutes) => `${minutes} minutes`,
    saveUnavailableBody:
      "The database is not connected in this environment. You can preview the page, but real schedules can be created after Postgres is connected.",
    saveUnavailableTitle: "Schedules Cannot Be Saved Yet",
    saveUnknownBody:
      "The health check did not return the expected result. You can still fill out the form; saving will be checked again on submit.",
    saveUnknownTitle: "Save Status Unknown",
    selectDateErrorBody: "Select at least one day so the schedule can generate time slots.",
    selectDateErrorTitle: "Select Available Days",
    shareLink: "Share Link",
    slotMinutes: "Slot Length",
    slotMinutesAria: "Slot length",
    startDate: "Start Date",
    startTime: "Start Time",
    submitValidationBody: "Some inputs did not pass validation. Check the dates, times, and title.",
    submitValidationTitle: "Check the Form",
    title: "Title",
    titlePlaceholder: "Weekend dinner",
    timezone: "Time Zone",
    timeRange: "Time Range",
    managerSchedulePathPrefix: "/en/s/",
    publicSchedulePathPrefix: "/en/s/",
    candidatePlaceholder: (index) => `Option ${index + 1}`,
    coreErrorTitle: "Check Candidate Times",
    databaseErrorTitle: "Schedules Cannot Be Saved Yet",
    databaseErrorBody:
      "The database is not connected in this environment. Connect Postgres before creating and sharing real schedules.",
    createFailedBody: "Please try again later.",
    createFailedTitle: "Create Failed"
  }
};
