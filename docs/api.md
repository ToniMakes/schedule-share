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
