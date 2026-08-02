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
- `candidateTimeWindowSchema`
- `candidateVoteInputSchema`
- `createParticipantAvailabilityRequestSchema`
- `createParticipantAvailabilityResponseSchema`
- `getParticipantAvailabilityResponseSchema`
- `updateParticipantAvailabilityRequestSchema`
- `updateParticipantAvailabilityResponseSchema`
- `availabilityPreviewRequestSchema`
- `availabilityPreviewResponseSchema`
- `lockScheduleRequestSchema`
- `lockScheduleResponseSchema`
- `confirmFinalTimeRequestSchema`
- `confirmFinalTimeResponseSchema`
- `getScheduleResponseSchema`
- `apiErrorResponseSchema`
- `createSchedule`
- `getSchedule`
- `createParticipantAvailability`
- `getParticipantAvailability`
- `updateParticipantAvailability`
- `previewAvailability`
- `previewAvailabilityImage`
- `previewAvailabilityIcs`
- `previewAvailabilityCsv`
- `lockSchedule`
- `confirmFinalTime`
- `ApiClientError`

## 首批客户端函数

- `createSchedule`：已实现。
- `getSchedule`：已实现。
- `createParticipantAvailability`：已实现。
- `getParticipantAvailability`：已实现。
- `updateParticipantAvailability`：已实现。
- `previewAvailability`：已实现 `text_import` JSON 预览，以及结构化 `image_import` / `ics_import` / `csv_import` busyBlocks 预览。
- `previewAvailabilityImage`：已实现 `image_import` multipart 图片预览。
- `previewAvailabilityIcs`：已实现 `ics_import` multipart 日历文件预览。
- `previewAvailabilityCsv`：已实现 `csv_import` multipart CSV 文件预览。
- `lockSchedule`：已实现。
- `confirmFinalTime`：已实现。
