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
- 服务端会调用 `packages/core` 生成时间格，确保配置至少产生一个可选时间段。
- 返回的 `ownerUrl` 包含管理密钥；服务端只保存密钥哈希。

请求：

```json
{
  "title": "周末聚餐",
  "description": "找一个大家都方便的时间",
  "timezone": "Australia/Sydney",
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

成功响应：`201`

```json
{
  "schedule": {
    "publicId": "abc123",
    "title": "周末聚餐",
    "timezone": "Australia/Sydney",
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
    "dateRange": {
      "start": "2026-08-01",
      "end": "2026-08-07"
    },
    "slotMinutes": 30,
    "dailyWindows": [],
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

候选时间投票模式计划扩展请求：

```json
{
  "displayName": "Aki",
  "candidateVotes": [
    {
      "candidateTimeOptionId": "opt_123",
      "response": "available"
    },
    {
      "candidateTimeOptionId": "opt_456",
      "response": "maybe"
    }
  ]
}
```

运行要求：

- `candidateVotes` 只能用于 `candidate_poll` 日程。
- `candidateTimeOptionId` 必须属于当前日程。
- `maybe` 和偏好权重上线前，结果计算需要先在 `packages/core` 补测试。

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
  "availableSlots": []
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

状态：已实现。

运行要求：

- 服务端需要 `DATABASE_URL`。
- `key` 是组织者管理密钥；校验失败返回 `INVALID_OWNER_KEY`。
- 响应格式是 `text/csv; charset=utf-8`，用于下载当前日程结果。

CSV 内容包含：

- 日程标题、状态、时区、日期范围和参与者数量。
- 全员可用连续时间段。
- 当前时间槽排名。
- 参与者列表。

## 候选时间投票模式

状态：计划中。

当前 `POST /api/schedules` 已实现开放网格模式。后续可扩展 `scheduleMode` 支持候选时间投票：

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
- 如果支持 `maybe` 或偏好权重，需要同步更新 `packages/core` 的结果计算和测试。

## 可用时间预填预览

`POST /api/schedules/:publicId/availability-preview`

状态：计划中。

用途：

- 根据当前日程配置，把不同来源的时间信息转换为建议可用时间。
- 支持图片导入、文本导入、个人模板和后续文件导入。
- 该接口只返回 `AvailabilityDraft`，不创建参与者，也不提交可用时间。
- 用户仍需在页面确认后调用现有提交接口。

运行要求：

- 服务端需要 `DATABASE_URL`。
- 服务端必须校验日程存在且状态为 `open`。
- 请求会先通过 `packages/api-client` 的 schema 校验。
- 服务端再调用 `packages/core` 把输入来源转换为当前日程内的建议可用时间槽。
- 图片和文本识别需要按环境配置启用识别 provider；未配置时应返回 `IMPORT_PROVIDER_UNAVAILABLE`。
- 图片或文件上传需要限制文件类型和大小。

图片请求：`multipart/form-data`

```text
file: timetable.png
method: image_import
timezone: Australia/Sydney
interpretsAs: busy
```

文本请求：`application/json`

```json
{
  "method": "text_import",
  "sourceText": "Mon 09:00-11:00 COMP101, Wed 14:00-16:00 Lab",
  "timezone": "Australia/Sydney",
  "interpretsAs": "busy"
}
```

模板请求：`application/json`

```json
{
  "method": "template",
  "templateId": "tpl_123"
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

以下接口状态均为计划中。它们需要登录能力，认证方案开始前必须新增或更新认证 ADR。

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

使用 `POST /api/schedules/:publicId/availability-preview`，并传入 `method: "template"`。

运行要求：

- 必须登录。
- 只能读取当前用户自己的模板。
- 日程必须存在且状态为 `open`。
- 接口只返回预填建议，不提交参与者可用时间。

请求：

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
