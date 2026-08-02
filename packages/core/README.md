# Core Package

`packages/core` 存放纯业务逻辑，是 Web 和未来小程序共同复用的核心。

## 允许

- 时间格生成。
- 时区规则。
- 可用时间交集。
- 多数人空闲排序。
- 候选投票综合排序。
- 领域输入校验。
- 不依赖外部状态的纯函数。

## 禁止

- 访问数据库。
- 调用 HTTP API。
- 读取浏览器 API。
- 引入 React 或小程序组件。
- 处理支付、登录、部署等基础设施逻辑。

## 测试重点

- UTC 和本地时区转换。
- 跨天时间窗口。
- 夏令时边界。
- 连续时间格合并。
- 空参与者、单参与者和多人结果计算。

## 已有能力

- `generateTimeSlots`：从日程配置生成标准 UTC 时间格。
- `calculateAvailabilitySummary`：计算每个时间格的可用人数、所有人可用时间和排序候选时间。
- `buildCandidatePollResults`：按 `available = 1`、`maybe = 0.5` 计算候选投票综合支持度，并用首选人数和平均偏好顺位辅助排名。
- `mergeAvailabilityBlocks`：合并相邻且可用参与者集合相同的时间格。
- `createCandidateTimeSlots`：把明确 UTC 候选时间规范化为日程时区下的可展示时间槽。
- `createCandidateTimeWindowFromLocal`：把本地日期和时间窗口转换为明确 UTC 候选时间。
- `createAvailabilityDraftFromBusyBlocks`：把导入识别出的忙碌时间块转换为当前日程中的可用时间草稿。
- `createAvailabilityDraftFromAvailableSlots`：把已有可用时间槽归一化为可确认的可用时间草稿。
