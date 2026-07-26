# 领域模型

## 核心实体

### Schedule

一次日程协调房间。

字段草案：

- `id`：内部唯一 ID。
- `public_id`：用于分享链接的短 ID。
- `title`：日程标题。
- `description`：可选说明。
- `timezone`：组织者创建时选择的 IANA 时区，例如 `Australia/Sydney`。
- `date_range_start`：本地日期范围开始。
- `date_range_end`：本地日期范围结束。
- `slot_minutes`：时间粒度，允许 15、30、60。
- `daily_windows`：每天可选的本地时间窗口。
- `owner_key_hash`：组织者管理密钥哈希。
- `status`：`open`、`locked`、`archived`。
- `created_at`：UTC 时间。
- `updated_at`：UTC 时间。
- `expires_at`：UTC 时间。

### Participant

一个参与者在某个日程中的身份。

字段草案：

- `id`：内部唯一 ID。
- `schedule_id`：所属日程。
- `display_name`：参与者显示名。
- `edit_key_hash`：参与者编辑密钥哈希。
- `created_at`：UTC 时间。
- `updated_at`：UTC 时间。

### Availability

参与者选择的可用时间。

字段草案：

- `id`：内部唯一 ID。
- `schedule_id`：所属日程。
- `participant_id`：所属参与者。
- `slot_start_utc`：时间格开始，UTC。
- `slot_end_utc`：时间格结束，UTC。
- `created_at`：UTC 时间。

### TimeSlot

由日程配置生成的标准时间格，不一定需要单独存表，可以由 `Schedule` 计算得到。

字段草案：

- `start_utc`：开始时间，UTC。
- `end_utc`：结束时间，UTC。
- `local_start_date`：按日程时区显示的开始日期。
- `local_end_date`：按日程时区显示的结束日期。
- `local_start_time`：按日程时区显示的开始时间。
- `local_end_time`：按日程时区显示的结束时间。

### AvailabilityResult

由参与者填写结果计算出的派生数据。默认不落库，除非后续性能需要缓存。

字段草案：

- `slot_start_utc`
- `slot_end_utc`
- `available_participant_count`
- `available_participant_ids`
- `is_everyone_available`

## 时间规则

- 数据库存储所有精确时间时统一使用 UTC。
- 日程配置中的日期和每日时间窗口使用组织者选择的 IANA 时区解释。
- 前端展示时默认使用用户本地时区，同时允许切换到日程时区。
- 所有时间格必须从 `Schedule` 配置生成，不能由 UI 临时拼接。
- 跨天、夏令时切换和日期边界必须由核心时间库处理。
- API 输入的精确时间戳必须包含 `Z` 或明确时区偏移，服务端再统一规范化为 UTC。

## 权限规则

- MVP 不要求用户注册。
- 创建日程后，组织者获得一个只显示一次的管理链接或管理密钥。
- 参与者提交后，获得一个只显示一次的编辑链接或编辑密钥。
- 公共分享链接只能查看和填写，不能删除日程、锁定日程或修改他人提交。
- 服务端只存密钥哈希，不存明文密钥。

## 状态规则

- `open`：允许新增和修改提交。
- `locked`：禁止新增和修改提交，结果仍可查看。
- `archived`：只读状态，可在过期后清理。

## 结果计算规则

- 共同空闲时间：某个时间格被所有当前参与者标记为可用。
- 多数人空闲时间：按可用人数从高到低排序。
- 如果没有参与者，不能显示“所有人都有空”，只显示等待填写状态。
- 连续相邻时间格可以合并为更长时间段。
- 核心计算逻辑必须放在 `packages/core`，UI 和 API 层不得重复实现。

## 数据保留规则

- MVP 默认日程在创建后 90 天过期。
- 过期日程可先归档，后续再删除。
- 用户提交中不收集邮箱、手机号、微信号等敏感信息。
- 如果后续添加登录或通知功能，需要更新隐私说明和数据保留策略。
