# API 设计

## 设计原则

- API 使用 JSON。
- 精确时间戳使用 ISO 8601 UTC 字符串。
- 本地日期使用 `YYYY-MM-DD`。
- 本地时间使用 `HH:mm`。
- 服务端负责权限校验和业务规则校验。
- API 返回结构应稳定，避免前端依赖数据库字段。
- 请求/响应契约优先放在 `packages/api-client`，服务端和前端共同复用。

## 健康检查

`GET /api/health`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 接口会执行轻量数据库查询，用于部署平台探活和上线后诊断。

健康响应：`200`

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok"
  }
}
```

异常响应：`503`

```json
{
  "status": "unhealthy",
  "checks": {
    "database": "unavailable"
  }
}
```

## 创建日程

`POST /api/schedules`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 请求会先通过 `packages/api-client` 的 schema 校验。
- 开放网格模式会调用 `packages/core` 生成时间格，确保配置至少产生一个可选时间段。
- 候选投票模式会调用 `packages/core` 校验和规范化明确 UTC 候选时间。
- 返回的 `ownerUrl` 包含管理密钥；服务端只保存密钥哈希。

开放网格请求：

```json
{
  "title": "周末聚餐",
  "description": "找一个大家都方便的时间",
  "timezone": "Australia/Sydney",
  "scheduleMode": "availability_grid",
  "dateRange": {
    "start": "2026-08-01",
    "end": "2026-08-07"
  },
  "slotMinutes": 30,
  "dailyWindows": [
    {
      "daysOfWeek": [1, 2, 3, 4, 5],
      "startTime": "18:00",
      "endTime": "22:00"
    },
    {
      "daysOfWeek": [0, 6],
      "startTime": "09:00",
      "endTime": "22:00"
    }
  ]
}
```

候选投票请求：

```json
{
  "title": "Project sync",
  "description": "Pick one of these candidate times",
  "timezone": "Australia/Sydney",
  "scheduleMode": "candidate_poll",
  "slotMinutes": 60,
  "candidateWindows": [
    {
      "startUtc": "2026-08-03T08:00:00.000Z",
      "endUtc": "2026-08-03T09:00:00.000Z",
      "label": "Option A"
    },
    {
      "startUtc": "2026-08-04T09:00:00.000Z",
      "endUtc": "2026-08-04T10:00:00.000Z",
      "label": "Option B"
    }
  ]
}
```

成功响应：`201`

```json
{
  "schedule": {
    "publicId": "abc123",
    "title": "周末聚餐",
    "timezone": "Australia/Sydney",
    "scheduleMode": "availability_grid",
    "status": "open"
  },
  "shareUrl": "https://example.com/s/abc123",
  "ownerUrl": "https://example.com/s/abc123/manage?key=..."
}
```

## 获取日程

`GET /api/schedules/:publicId`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 响应会从数据库读取日程、参与者和可用时间槽，再通过 `packages/core` 计算汇总结果。

响应：

```json
{
  "schedule": {
    "publicId": "abc123",
    "title": "周末聚餐",
    "description": "找一个大家都方便的时间",
    "timezone": "Australia/Sydney",
    "scheduleMode": "availability_grid",
    "dateRange": {
      "start": "2026-08-01",
      "end": "2026-08-07"
    },
    "slotMinutes": 30,
    "dailyWindows": [],
    "candidateWindows": [],
    "finalTime": null,
    "status": "open"
  },
  "participants": [
    {
      "id": "p_123",
      "displayName": "Aki"
    }
  ],
  "results": {
    "totalParticipantCount": 1,
    "slotResults": [
      {
        "startUtc": "2026-08-01T08:00:00.000Z",
        "endUtc": "2026-08-01T08:30:00.000Z",
        "timezone": "Australia/Sydney",
        "localStartDate": "2026-08-01",
        "localEndDate": "2026-08-01",
        "localStartTime": "18:00",
        "localEndTime": "18:30",
        "availableParticipantCount": 1,
        "availableParticipantIds": ["p_123"],
        "maybeParticipantCount": 0,
        "maybeParticipantIds": [],
        "isEveryoneAvailable": true
      }
    ],
    "everyoneAvailableSlots": [
      {
        "startUtc": "2026-08-01T08:00:00.000Z",
        "endUtc": "2026-08-01T08:30:00.000Z",
        "timezone": "Australia/Sydney",
        "localStartDate": "2026-08-01",
        "localEndDate": "2026-08-01",
        "localStartTime": "18:00",
        "localEndTime": "18:30",
        "availableParticipantCount": 1,
        "availableParticipantIds": ["p_123"],
        "isEveryoneAvailable": true
      }
    ],
    "everyoneAvailableBlocks": [
      {
        "startUtc": "2026-08-01T08:00:00.000Z",
        "endUtc": "2026-08-01T08:30:00.000Z",
        "timezone": "Australia/Sydney",
        "localStartDate": "2026-08-01",
        "localEndDate": "2026-08-01",
        "localStartTime": "18:00",
        "localEndTime": "18:30",
        "slotCount": 1,
        "availableParticipantCount": 1,
        "availableParticipantIds": ["p_123"]
      }
    ],
    "rankedSlots": [
      {
        "startUtc": "2026-08-01T08:00:00.000Z",
        "endUtc": "2026-08-01T08:30:00.000Z",
        "timezone": "Australia/Sydney",
        "localStartDate": "2026-08-01",
        "localEndDate": "2026-08-01",
        "localStartTime": "18:00",
        "localEndTime": "18:30",
        "availableParticipantCount": 1,
        "availableParticipantIds": ["p_123"],
        "isEveryoneAvailable": true
      }
    ]
  }
}
```

## 提交可用时间

`POST /api/schedules/:publicId/participants`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 服务端会重新生成日程时间格，并拒绝不属于该日程范围的时间槽。
- 返回的 `editUrl` 包含参与者编辑密钥；服务端只保存密钥哈希。

请求：

```json
{
  "displayName": "Aki",
  "availableSlots": [
    {
      "startUtc": "2026-08-01T08:00:00.000Z",
      "endUtc": "2026-08-01T08:30:00.000Z"
    }
  ]
}
```

候选时间投票请求也可以传 `candidateVotes`。当 `candidateVotes` 存在时，服务端会把 `available` 响应同步转换为 `availableSlots`，`maybe` 和 `unavailable` 只保存在候选投票记录中：

```json
{
  "displayName": "Aki",
  "candidateVotes": [
    {
      "candidateTimeOptionId": "opt_123",
      "preferenceRank": 1,
      "response": "available"
    },
    {
      "candidateTimeOptionId": "opt_456",
      "preferenceRank": 2,
      "response": "maybe"
    },
    {
      "candidateTimeOptionId": "opt_789",
      "response": "unavailable"
    }
  ]
}
```

响应：

```json
{
  "participant": {
    "id": "p_123",
    "displayName": "Aki"
  },
  "editUrl": "https://example.com/s/abc123/edit/p_123?key=..."
}
```

为兼容早期二元候选投票，请求仍可只提交 `availableSlots`；未出现的候选项会按不方便处理，且不会生成 `maybe` 记录。

运行要求：

- `candidateVotes` 只能用于 `candidate_poll` 日程。
- `candidateTimeOptionId` 必须属于当前日程。
- 同一个参与者对同一个候选时间只能有一条投票。
- `preferenceRank` 可选，必须是 `1..50` 的正整数，只能用于 `available` 或 `maybe` 响应；同一个参与者的一次提交内不能有重复顺位。
- `maybe` 不计入全员可用或多数人可用人数，但会进入候选投票专门结果视图和 CSV 导出。
- 候选投票结果中的候选时间槽可包含 `firstPreferenceParticipantCount`、`firstPreferenceParticipantIds`、`preferenceRankCount` 和 `preferenceRankSum`，用于展示首选人数和平均偏好顺位。

## 更新可用时间

`GET /api/schedules/:publicId/participants/:participantId?key=...`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- `key` 是参与者编辑密钥；校验失败返回 `INVALID_EDIT_KEY`。

响应：

```json
{
  "schedule": {
    "publicId": "abc123",
    "title": "周末聚餐",
    "description": "找一个大家都方便的时间",
    "timezone": "Australia/Sydney",
    "dateRange": {
      "start": "2026-08-01",
      "end": "2026-08-07"
    },
    "slotMinutes": 30,
    "dailyWindows": [],
    "status": "open"
  },
  "participant": {
    "id": "p_123",
    "displayName": "Aki",
    "availableSlots": [
      {
        "startUtc": "2026-08-01T08:00:00.000Z",
        "endUtc": "2026-08-01T08:30:00.000Z"
      }
    ],
    "candidateVotes": [
      {
        "candidateTimeOptionId": "opt_123",
        "preferenceRank": 1,
        "response": "maybe"
      }
    ]
  },
  "slots": []
}
```

`PUT /api/schedules/:publicId/participants/:participantId`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 服务端会校验 `editKey`，并拒绝不属于该日程范围的时间槽。
- 更新会在同一事务中替换参与者姓名和全部可用时间槽。

请求：

```json
{
  "editKey": "...",
  "displayName": "Aki",
  "availableSlots": [],
  "candidateVotes": [
    {
      "candidateTimeOptionId": "opt_123",
      "preferenceRank": 1,
      "response": "available"
    }
  ]
}
```

响应：

```json
{
  "participant": {
    "id": "p_123",
    "displayName": "Aki"
  }
}
```

## 锁定日程

`POST /api/schedules/:publicId/lock`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 服务端会校验 `ownerKey`；校验失败返回 `INVALID_OWNER_KEY`。
- 锁定后参与者不能再提交或更新可用时间。

请求：

```json
{
  "ownerKey": "..."
}
```

响应：

```json
{
  "schedule": {
    "publicId": "abc123",
    "status": "locked"
  }
}
```

## 确认最终时间

`POST /api/schedules/:publicId/final-time`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 服务端会校验 `ownerKey`；校验失败返回 `INVALID_OWNER_KEY`。
- 开放网格模式下，`startUtc` 和 `endUtc` 必须精确匹配当前结果中的某个全员可用连续时间段。
- 候选投票模式下，`startUtc` 和 `endUtc` 必须精确匹配组织者预设的某个候选时间。
- 确认最终时间会把日程状态置为 `locked`，后续参与者不能再提交或更新可用时间。
- 已锁定但未归档的日程仍可由组织者重新选择另一个当前模式下可确认的最终时间。
- 已归档日程返回 `SCHEDULE_LOCKED`。
- 非全员可用时间段或非候选时间段返回 `VALIDATION_ERROR`。

请求：

```json
{
  "ownerKey": "...",
  "startUtc": "2026-08-01T08:00:00.000Z",
  "endUtc": "2026-08-01T08:30:00.000Z"
}
```

响应：

```json
{
  "schedule": {
    "publicId": "abc123",
    "status": "locked",
    "finalTime": {
      "startUtc": "2026-08-01T08:00:00.000Z",
      "endUtc": "2026-08-01T08:30:00.000Z",
      "timezone": "Australia/Sydney",
      "localStartDate": "2026-08-01",
      "localEndDate": "2026-08-01",
      "localStartTime": "18:00",
      "localEndTime": "18:30"
    }
  }
}
```

## 归档日程

`POST /api/schedules/:publicId/archive`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 服务端会校验 `ownerKey`；校验失败返回 `INVALID_OWNER_KEY`。
- 开放中或已锁定日程都可以归档。
- 已归档日程再次调用会继续返回 `archived`。
- 归档后参与者不能再提交或更新可用时间。

请求：

```json
{
  "ownerKey": "..."
}
```

响应：

```json
{
  "schedule": {
    "publicId": "abc123",
    "status": "archived"
  }
}
```

## 导出结果

`GET /api/schedules/:publicId/export?key=...`

`GET /api/schedules/:publicId/export?key=...&format=ics`

`GET /api/schedules/:publicId/export?key=...&format=ics&startUtc=2026-07-31T23:00:00.000Z&endUtc=2026-07-31T23:30:00.000Z`

`GET /api/schedules/:publicId/export?key=...&format=ics&target=final-time`

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- `key` 是组织者管理密钥；校验失败返回 `INVALID_OWNER_KEY`。
- 默认响应格式是 `text/csv; charset=utf-8`，用于下载当前日程结果。
- `format=ics` 时响应格式是 `text/calendar; charset=utf-8`；默认用于把全员可用连续时间段导入日历。
- `format=ics` 可选传入 `startUtc` 和 `endUtc`，只导出一个全员可用连续时间段；两个参数必须同时出现，并且必须精确匹配当前结果中的某个全员可用连续时间段。
- `format=ics&target=final-time` 只导出已确认最终时间；要求日程已有 `finalTime`，且不能同时传入 `startUtc` / `endUtc`。
- 不支持的 `format` 返回 `VALIDATION_ERROR`。
- 不支持的 `.ics` `target`、单段 `.ics` 导出参数无效、结束时间不晚于开始时间、范围不是全员可用连续时间段，或最终时间尚未确认时，返回 `VALIDATION_ERROR`。

CSV 内容包含：

- 日程标题、状态、时区、日期范围和参与者数量。
- 全员可用连续时间段。
- 当前时间槽排名。
- 参与者列表。

候选投票 CSV 会额外包含候选名称、方便人数、也许人数、首选人数、平均偏好顺位、方便参与者、也许参与者、首选参与者和不方便/未选参与者。

ICS 内容包含：

- 一个 `VCALENDAR`。
- 每个全员可用连续时间段对应一个 `VEVENT`。
- 传入 `startUtc` / `endUtc` 时，只包含选中的一个 `VEVENT`。
- 传入 `target=final-time` 时，只包含已确认最终时间对应的一个 `VEVENT`。
- 事件使用 UTC `DTSTART` / `DTEND`；全员可用时间段 summary 为 `Available: 日程标题`，最终时间 summary 为 `Final: 日程标题`。
- 全员可用时间段事件使用 `TRANSP:TRANSPARENT`，最终时间事件使用 `TRANSP:OPAQUE`。
- 当前没有全员可用时间时返回空日历，不猜测非全员可用时间。

## 候选时间投票模式

状态：三态 `available/maybe/unavailable` v1、默认综合排序、参与者偏好顺位 v1、Web 端按钮/拖拽调整偏好顺位、候选缺口标签、对比最佳分析和候选复制文本缺口/对比摘要已实现；参与者自定义偏好权重计划中。

`POST /api/schedules` 传入 `scheduleMode: "candidate_poll"` 和 `candidateWindows` 即可创建候选投票日程：

```json
{
  "title": "Project sync",
  "description": "Pick one of these candidate times",
  "timezone": "Australia/Sydney",
  "scheduleMode": "candidate_poll",
  "slotMinutes": 30,
  "candidateWindows": [
    {
      "startUtc": "2026-08-03T08:00:00.000Z",
      "endUtc": "2026-08-03T08:30:00.000Z",
      "label": "Option A"
    },
    {
      "startUtc": "2026-08-04T09:00:00.000Z",
      "endUtc": "2026-08-04T09:30:00.000Z",
      "label": "Option B"
    }
  ]
}
```

运行要求：

- 服务端需要校验候选时间包含明确 UTC 时间戳。
- 候选时间必须能按日程时区展示。
- 参与者投票后，仍应能复用当前结果汇总、排名和导出链路。
- 当前 v1 中，参与者可以提交 `candidateVotes`；`available` 会同步进入 `availableSlots` 参与现有汇总，`maybe` 会在候选投票结果和 CSV 导出中单独展示。参与者也可以给 `available` 或 `maybe` 候选传入可选 `preferenceRank`，服务端会保存并在候选结果中汇总首选人数和平均偏好顺位。
- Web 候选结果面板会调用 `packages/core` 按 `available = 1`、`maybe = 0.5` 计算综合支持度；综合分相同时，优先确定可用人数、也许人数、首选人数、平均偏好顺位和开始时间排序。
- 早期二元请求仍可只提交 `availableSlots`，未选择的候选时间按不方便处理。
- 如果支持参与者自定义偏好权重，需要同步更新 API contract、数据库结构、`packages/core` 的结果计算和测试；当前拖拽排序只调整现有 `preferenceRank` 提交值，不需要新增 API 字段。

## 可用时间预填预览

`POST /api/schedules/:publicId/availability-preview`

状态：部分实现。

当前已实现：

- `application/json` 的 `text_import` 预览。
- `multipart/form-data` 的 `image_import` 图片预览，支持 PNG、JPEG、WebP，单张默认最大 4MB，可通过更低的运行时上限收紧。
- `multipart/form-data` 的 `ics_import` 日历文件预览，支持单个 `.ics` 文件，最大 1MB。
- `multipart/form-data` 的 `csv_import` CSV 文件预览，支持单个 `.csv` 文件，最大 1MB。
- `application/json` 的 `template` 内联每周可用窗口预览。
- 请求可传 `sourceText`，服务端会识别简单的中英文星期或明确日期加时间段，例如 `Mon 9-11 COMP101`、`Mon, 9-11 COMP101`、`Monday, Aug 3, 6pm-7pm Dinner`、`Meeting from 9 to 11 on Monday`、`Meeting between 9 and 11 on Monday`、`Mon noon-1pm Lunch`、`Tue midnight to 1am Maintenance`、`Mon 6 to 7pm Dinner`、`Mon from 9am until 11am Class`、`2pm till 4pm Lab`、`Mon 9am for 2 hours Lecture`、`Tue 14:30 for 90 min Lab`、`Aug 3, 9am-10:30am Work`、`3 Aug, 14:00-16:00 Lab`、`周三 14:00-16:00 Lab`、`8/1 9am-10:30am Work`、`8月1日 9点30-11点 排班`、`周三 下午2点-4点 Lab` 或 `2026-08-01 14.00-16.00`；列表/编号和 `Busy:`、`blocked:`、`忙碌:` 这类状态前缀会先归一化。
- 无年份的 `8/1`、`8月1日` 等日期按当前日程的开始年份解释。
- 文本导入也支持粘贴“时间行 x 星期/日期列”的 tab、逗号分隔或 Markdown 表格，可识别复制自合并日期表头的多行表头、日期/星期 + 时间的双层表头、`Start/End` 拆分表头行和左右并排区域各自独立 `Time/时间` 列的课表，以及 `Date/Start/End/Title`、`Start Date/Start Time/End Time/Subject`、`Date/Time/Title` 和 `Day/Time/Activity` 这类行式排班表格；导出区域前面多一行标题说明时会自动跳过；空白日期或时间单元格会继承上一行上下文，独立 `Notes/备注` 列里的纯备注续行会追加到上一段说明；`Schedule for Week 1`、`Summary`、`Generated by ...`、`Exported on ...`、`Total hours`、`Page 1 of 1`、`说明:` 等常见导出标题、汇总说明或页脚行会静默跳过；单元格非空时会识别为忙碌时间，`空`、`休息`、`free`、`off` 等会被跳过。
- 课程节次可以给出明确钟点，例如 `第1-2节 08:00-09:40`；导入内容前面也可以包含自定义节次定义行，例如 `第1节 08:30-09:15` 或 `Period 1,08:30-09:15`，后续仅写 `第1-2节`、`第3节` 或 `1-2 periods` 时会优先用这些自定义时间换算。没有自定义定义或某节缺失时，会按默认节次表回退并返回 warning 提醒用户复核学校作息是否一致。默认节次表为：第 1 节 `08:00-08:45`、第 2 节 `08:55-09:40`、第 3 节 `10:00-10:45`、第 4 节 `10:55-11:40`、第 5 节 `13:30-14:15`、第 6 节 `14:25-15:10`、第 7 节 `15:30-16:15`、第 8 节 `16:25-17:10`、第 9 节 `18:30-19:15`、第 10 节 `19:25-20:10`、第 11 节 `20:20-21:05`、第 12 节 `21:15-22:00`。
- 请求也可直接传结构化 `busyBlocks`，用于图片/OCR、ICS、CSV 或其他导入适配器复用。
- 图片导入 provider 使用 OpenAI Responses API 识别忙碌时间块；未配置 `OPENAI_API_KEY`、`AI_IMAGE_IMPORT_ENABLED` 不是 true、release mode 为 `off`、内测 token 不匹配，或当前尝试公开模式时，都会返回 `IMPORT_PROVIDER_UNAVAILABLE`。
- `.ics` 导入会解析 `VEVENT` 的 `DTSTART` / `DTEND` 和 `VFREEBUSY` 的 `FREEBUSY` 忙闲区间，支持 UTC 时间、`TZID` 本地时间、常见 Windows 时区别名（如 `AUS Eastern Standard Time`、`China Standard Time`、`Pacific Standard Time`）、`DTSTART` + `DURATION`（含周、日、时、分、秒，秒级时长向上折算到分钟）、`FREEBUSY` 的 `start/end` 与 `start/duration` 区间、全天事件（含缺少 `DTEND` 的 date-only `DTSTART`）、取消或透明事件跳过、`FBTYPE=FREE` 空闲段跳过、常见每日 `RRULE`、常见每周 `RRULE`、常见月度 `RRULE`（同日、`BYMONTH`、`BYMONTHDAY`、月末写法、无序号 `BYDAY` 的每月所有指定星期几、顺数/倒数第 N 个星期几的 `BYDAY`、`BYSETPOS` 位置过滤）和常见年度 `RRULE`（同月同日、`BYMONTH`、`BYMONTHDAY`、无序号 `BYDAY` 的每年某月所有指定星期几、顺数/倒数第 N 个星期几的 `BYDAY`、`BYSETPOS` 位置过滤），以及按 `COUNT` / `UNTIL` 展开有限重复、按 `RDATE` 添加额外发生日期或 `VALUE=PERIOD` 额外时段、按 `EXDATE` 排除例外日期、按同 `UID` 的 `RECURRENCE-ID` 处理单次取消或改期。
- CSV 导入支持“时间行 x 星期/日期列”的课表/排班 CSV、复制自合并日期表头的多行表头、日期/星期 + 时间的双层表头、`Start/End` 拆分表头行、左右并排区域各自独立 `Time/时间` 列的 CSV，以及 `Date,Start,End,Title`、`Start Date,Start Time,End Time,Subject`、`Date,Time,Title`、`Day,Time,Activity`、`Day of Week,Period,Activity` 和 `Day of Week,Shift Start,Shift End,Activity` 这类行式排班 CSV；CSV 文件里也可以先放 `Period,Time` / `Period 1,08:30-09:15` / `1,08:30-09:15` 这类自定义节次定义，再放实际排班表；`Period/节次` 列的裸 `1-2` 也会按课程节次而不是凌晨钟点解释；导出区域前面多一行标题说明时会自动跳过；空白日期或时间单元格会继承上一行上下文，独立 `Notes/备注` 列里的纯备注续行会追加到上一段说明；常见导出标题、汇总说明或页脚行会静默跳过。
- 模板预填会按模板时区解释每周可用窗口，再投影到当前日程的日期范围和时间格。
- 服务端会把忙碌时间块或模板窗口交给 `packages/core`，按当前日程配置生成 `AvailabilityDraft`。
- 该接口不创建参与者，不写入可用时间；参与者仍需在页面确认后提交。

尚未实现：

- 登录用户保存型模板和 `templateId` 读取。

用途：

- 根据当前日程配置，把不同来源的时间信息转换为建议可用时间。
- 支持图片导入、文本导入、`.ics` / CSV 文件导入和个人模板。
- 该接口只返回 `AvailabilityDraft`，不创建参与者，也不提交可用时间。
- 用户仍需在页面确认后调用现有提交接口。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 服务端必须校验日程存在且状态为 `open`。
- 请求会先通过 `packages/api-client` 的 schema 校验。
- 服务端再调用 `packages/core` 把输入来源转换为当前日程内的建议可用时间槽。
- 图片识别需要配置 `OPENAI_API_KEY`，可选 `OPENAI_IMAGE_IMPORT_MODEL`；但 key 只是凭证，不能单独开放功能。
- 图片识别默认关闭。必须同时设置 `AI_IMAGE_IMPORT_ENABLED=true` 和允许的 `AI_IMAGE_IMPORT_RELEASE_MODE` 才会尝试调用 provider。
- `AI_IMAGE_IMPORT_RELEASE_MODE=local_only` 只用于本地非生产运行；`internal_test` 需要请求头 `x-ai-image-import-test-token` 匹配 `AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN`；`public` 当前被代码层阻断，直到额度账本、广告验证和成本护栏实现后再开放。
- 后续如果开启激励广告换 AI 图片识别额度，`image_import` 还需要先通过计划中的额度校验；无额度时返回计划错误码 `AI_CREDIT_REQUIRED`。当前代码尚未实现该校验。
- 图片上传限制为 PNG、JPEG 或 WebP，默认最大 4MB，可用 `AI_IMAGE_IMPORT_MAX_BYTES` 设置更低上限；超限返回 `IMPORT_FILE_TOO_LARGE`，类型不支持返回 `IMPORT_UNSUPPORTED_FILE_TYPE`。
- OpenAI 请求有 `OPENAI_IMAGE_IMPORT_TIMEOUT_MS`、`OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS` 和 `OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE` 运行时护栏；超时返回 `IMPORT_PROVIDER_UNAVAILABLE`，低置信度返回 `IMPORT_LOW_CONFIDENCE`。
- 当前代码还读取 `AI_IMAGE_IMPORT_ESTIMATED_COST_USD`、`AI_IMAGE_IMPORT_MAX_ESTIMATED_COST_USD`、`AI_IMAGE_IMPORT_DAILY_REQUEST_LIMIT` 和 `AI_IMAGE_IMPORT_DAILY_COST_LIMIT_USD`。如果单次估算成本超过上限，或每日请求上限乘以单次估算成本可能超过每日预算，图片识别 provider 不会创建；这仍是静态成本闸门，不替代后续额度账本。
- `.ics` 上传限制为单个 `.ics` 文件最大 1MB；超限返回 `IMPORT_FILE_TOO_LARGE`，类型不支持返回 `IMPORT_UNSUPPORTED_FILE_TYPE`。
- CSV 上传限制为单个 `.csv` 文件最大 1MB；超限返回 `IMPORT_FILE_TOO_LARGE`，类型不支持返回 `IMPORT_UNSUPPORTED_FILE_TYPE`。

图片请求：`multipart/form-data`

```text
file: timetable.png
method: image_import
timezone: Australia/Sydney
interpretsAs: busy
```

日历请求：`multipart/form-data`

```text
file: calendar.ics
method: ics_import
timezone: Australia/Sydney
interpretsAs: busy
```

CSV 请求：`multipart/form-data`

```text
file: roster.csv
method: csv_import
timezone: Australia/Sydney
interpretsAs: busy
```

文本请求：`application/json`

```json
{
  "method": "text_import",
  "sourceText": "时间\t周一\t周二\n09:00-11:00\tCOMP101\t休息\n14:00-16:00\t\tShift",
  "timezone": "Australia/Sydney",
  "interpretsAs": "busy"
}
```

结构化忙碌时间请求：`application/json`。`method` 可以是 `image_import`、`ics_import` 或 `csv_import`，用于图片/OCR、ICS、CSV 或其他导入适配器复用同一份 busyBlocks 结构。

```json
{
  "method": "image_import",
  "timezone": "Australia/Sydney",
  "interpretsAs": "busy",
  "busyBlocks": [
    {
      "sourceLabel": "COMP101",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "11:00",
      "timezone": "Australia/Sydney"
    }
  ]
}
```

内联模板请求：`application/json`

```json
{
  "method": "template",
  "timezone": "Australia/Sydney",
  "interpretsAs": "busy",
  "template": {
    "name": "Weeknight default",
    "timezone": "Australia/Sydney",
    "weeklyWindows": [
      {
        "dayOfWeek": 1,
        "startTime": "18:00",
        "endTime": "21:00"
      },
      {
        "dayOfWeek": 3,
        "startTime": "18:00",
        "endTime": "21:00"
      }
    ]
  }
}
```

成功响应：`200`

```json
{
  "entryMethod": "image_import",
  "busyBlocks": [
    {
      "sourceLabel": "COMP101",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "11:00",
      "timezone": "Australia/Sydney",
      "confidence": 0.88,
      "warnings": []
    }
  ],
  "availableSlots": [
    {
      "startUtc": "2026-08-01T08:00:00.000Z",
      "endUtc": "2026-08-01T08:30:00.000Z"
    }
  ],
  "warnings": ["Some class names were ignored because only busy times are needed."],
  "confidence": 0.82
}
```

## 个人长期模板

以下保存型模板接口状态均为计划中。它们需要登录能力，认证方案开始前必须新增或更新认证 ADR。

当前已实现的是不落库的内联模板预览：`POST /api/schedules/:publicId/availability-preview` 可直接传
`method: "template"` 和 `template.weeklyWindows`，用于参与者填写页临时预填。
Web 端本机多模板保存、选择和删除只使用浏览器 localStorage，不新增服务端 API。

### 获取模板列表

`GET /api/me/availability-templates`

运行要求：

- 必须登录。
- 只能返回当前用户自己的模板。

响应：

```json
{
  "templates": [
    {
      "id": "tpl_123",
      "name": "Semester default",
      "timezone": "Australia/Sydney",
      "notes": "Usually free outside classes",
      "windows": [
        {
          "dayOfWeek": 1,
          "startTime": "18:00",
          "endTime": "22:00"
        }
      ]
    }
  ]
}
```

### 创建模板

`POST /api/me/availability-templates`

请求：

```json
{
  "name": "Semester default",
  "timezone": "Australia/Sydney",
  "notes": "Usually free outside classes",
  "windows": [
    {
      "dayOfWeek": 1,
      "startTime": "18:00",
      "endTime": "22:00"
    }
  ]
}
```

响应：`201`

```json
{
  "template": {
    "id": "tpl_123",
    "name": "Semester default",
    "timezone": "Australia/Sydney",
    "notes": "Usually free outside classes",
    "windows": []
  }
}
```

### 更新模板

`PUT /api/me/availability-templates/:templateId`

运行要求：

- 必须登录。
- 只能更新当前用户自己的模板。
- 更新时替换模板基础信息和全部窗口。

### 删除模板

`DELETE /api/me/availability-templates/:templateId`

运行要求：

- 必须登录。
- 只能删除当前用户自己的模板。

### 模板预填当前日程

保存型模板预填计划复用 `POST /api/schedules/:publicId/availability-preview`，并传入 `method: "template"` 和
`templateId`。内联模板预填已经可以直接传 `template` 对象。

运行要求：

- 使用 `templateId` 时必须登录，并且只能读取当前用户自己的模板。
- 使用内联 `template` 时不要求登录，也不会保存模板。
- 日程必须存在且状态为 `open`。
- 接口只返回预填建议，不提交参与者可用时间。

保存型模板请求计划：

```json
{
  "method": "template",
  "templateId": "tpl_123"
}
```

响应：

```json
{
  "entryMethod": "template",
  "availableSlots": [
    {
      "startUtc": "2026-08-01T08:00:00.000Z",
      "endUtc": "2026-08-01T08:30:00.000Z"
    }
  ],
  "warnings": []
}
```

## AI 图片识别额度与激励广告

以下接口状态均为计划中。它们用于把 `image_import` 的 AI 成本限制在免费额度、激励广告奖励或未来付费额度内；当前代码尚未实现。

详细产品、成本和风控方案见 `docs/monetization.md`。

### 查询 AI 识别额度

`GET /api/ai-credits/status`

用途：

- 返回当前匿名 session、浏览器设备或登录用户可用的 AI 图片识别额度。
- 告诉前端图片识别入口是否可直接使用、是否需要展示激励广告入口，或者是否因为成本护栏临时关闭。
- 不返回原始广告标识或图片内容。

响应计划：

```json
{
  "imageRecognition": {
    "enabled": true,
    "creditsRemaining": 1,
    "dailyLimitRemaining": 3,
    "requiresRewardedAd": false,
    "rewardedAdsEnabled": true
  }
}
```

### 验证激励广告完成事件

`POST /api/ai-credits/rewarded-ad/verify`

用途：

- 接收前端广告完成事件或广告平台服务端验证 token。
- 服务端校验签名、广告单元、事件唯一性和过期时间。
- 校验成功后发放 AI 图片识别额度。

请求计划：

```json
{
  "provider": "rewarded_ad_provider",
  "adUnitId": "image-import-reward",
  "verificationToken": "provider-issued-token"
}
```

响应计划：

```json
{
  "creditsRemaining": 1,
  "expiresAt": "2026-08-03T00:00:00.000Z"
}
```

计划错误码：

- `AI_CREDIT_REQUIRED`
- `AI_CREDIT_LIMIT_REACHED`
- `REWARDED_AD_UNAVAILABLE`
- `REWARDED_AD_VERIFICATION_FAILED`
- `REWARDED_AD_EVENT_DUPLICATE`

## 错误格式

```json
{
  "error": {
    "code": "SCHEDULE_LOCKED",
    "message": "This schedule no longer accepts changes."
  }
}
```

错误对象可以包含可选的 `details` 字段，用于开发期展示结构化校验信息。

常见错误码：

- `VALIDATION_ERROR`
- `DATABASE_UNAVAILABLE`
- `INTERNAL_ERROR`
- `SCHEDULE_NOT_FOUND`
- `PARTICIPANT_NOT_FOUND`
- `SCHEDULE_LOCKED`
- `INVALID_OWNER_KEY`
- `INVALID_EDIT_KEY`
- `SLOT_OUT_OF_RANGE`
- `UNSUPPORTED_SLOT_MINUTES`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `IMPORT_PROVIDER_UNAVAILABLE`
- `IMPORT_FILE_TOO_LARGE`
- `IMPORT_UNSUPPORTED_FILE_TYPE`
- `IMPORT_LOW_CONFIDENCE`
- `UNSUPPORTED_ENTRY_METHOD`
- `CANDIDATE_OPTION_NOT_FOUND`
- `TEMPLATE_NOT_FOUND`
