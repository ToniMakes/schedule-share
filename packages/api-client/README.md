# API Client Package

`packages/api-client` 存放前端访问后端 API 的封装，也存放前后端共享的请求和响应契约。

## 边界

- 负责请求函数。
- 负责 API 输入输出类型。
- 负责把 API 错误映射为前端可处理的错误。
- 不直接操作数据库。
- 不重复实现 `packages/core` 中的领域规则。

## 已有能力

- `createScheduleRequestSchema`
- `createScheduleResponseSchema`
- `createParticipantAvailabilityRequestSchema`
- `createParticipantAvailabilityResponseSchema`
- `getParticipantAvailabilityResponseSchema`
- `updateParticipantAvailabilityRequestSchema`
- `updateParticipantAvailabilityResponseSchema`
- `lockScheduleRequestSchema`
- `lockScheduleResponseSchema`
- `getScheduleResponseSchema`
- `apiErrorResponseSchema`
- `createSchedule`
- `getSchedule`
- `createParticipantAvailability`
- `getParticipantAvailability`
- `updateParticipantAvailability`
- `lockSchedule`
- `ApiClientError`

## 首批客户端函数

- `createSchedule`：已实现。
- `getSchedule`：已实现。
- `createParticipantAvailability`：已实现。
- `getParticipantAvailability`：已实现。
- `updateParticipantAvailability`：已实现。
- `lockSchedule`：已实现。
