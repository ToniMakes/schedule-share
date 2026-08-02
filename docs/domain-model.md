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
- `schedule_mode`：`availability_grid` 表示开放网格，`candidate_poll` 表示候选时间投票。
- `final_start_utc`：组织者确认的最终时间开始，UTC，可为空。
- `final_end_utc`：组织者确认的最终时间结束，UTC，可为空。
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

在候选时间投票模式中，`available` 投票仍会同步写入 `Availability`，用于复用现有多数人空闲排序、全员可用计算和导出链路；`maybe` 与 `unavailable` 保存在 `CandidateVote`。

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

### AvailabilityEntryMethod

参与者添加可用时间的来源。短期可只作为 API 预览和分析字段，最终提交仍以 `Availability` 为准。

可选值草案：

- `manual_grid`：手动拖拽网格。
- `candidate_vote`：候选时间投票。
- `image_import`：课表或排班图片导入。
- `text_import`：粘贴文本导入。
- `csv_import`：CSV 文件导入。
- `template`：个人长期模板导入。
- `ics_import`：`.ics` 文件导入。
- `calendar_sync`：日历账号同步，后置能力。

### AvailabilityDraft

由不同添加方式生成、等待用户确认的可用时间草稿。默认不落库，确认后才转换为 `Availability`。

字段草案：

- `entry_method`：对应的 `AvailabilityEntryMethod`。
- `available_slots`：建议可用时间槽，使用 UTC 精确时间。
- `busy_blocks`：可选，导入流程识别出的忙碌时间块。
- `confidence`：可选整体置信度。
- `warnings`：需要用户复核的问题。

### ImportedBusyBlock

从课表截图、排班截图或粘贴文本中识别出的忙碌时间块。导入 v1 中默认不直接落库，只作为生成预填建议的中间结果。

字段草案：

- `source_label`：可选来源说明，例如课程名、班次名或识别片段。
- `local_date`：可选本地日期，适用于明确日期的日程文本。
- `day_of_week`：可选星期，适用于每周重复课表。
- `start_time`：本地开始时间，`HH:mm`。
- `end_time`：本地结束时间，`HH:mm`。
- `timezone`：识别结果使用的 IANA 时区。
- `confidence`：识别置信度，供 UI 提醒用户复核。
- `warnings`：无法确认的日期、时间或重复规则说明。

### AvailabilityImportPreview

导入接口返回的预览结果。它是 `AvailabilityDraft` 的一种具体来源，不是提交结果，用户确认后才会转换为 `Availability`。
文本和图片来源通常返回 `busy_blocks`；内联模板来源可以不包含忙碌块，只返回由模板窗口投影出的 `available_slots`。

字段草案：

- `busy_blocks`：识别出的忙碌时间块。
- `available_slots`：按当前日程配置计算出的建议可用时间槽。
- `warnings`：需要用户复核的问题。
- `confidence`：整体置信度。

### AiRecognitionCreditGrant

AI 图片识别额度发放记录。用于限制 `image_import` 的成本暴露，并支持免费额度、激励广告奖励、人工发放和失败退款。当前数据库表和 migration 已实现；额度发放、原子消耗、退款和前端兑换流程仍未接入，详细方案见 `docs/monetization.md`。

当前字段：

- `id`：内部唯一 ID。
- `scope_type`：额度归属范围，例如匿名 session、浏览器设备或登录用户。
- `scope_id_hash`：归属标识的哈希。
- `schedule_id`：可选，额度如限定在某个日程内使用则填写。
- `source`：`free_quota`、`rewarded_ad`、`admin` 或 `refund`。
- `provider`：额度来源或广告平台。
- `provider_event_id_hash`：广告奖励事件 ID 的哈希，用于防重复发放。
- `credits_granted`：发放额度数。
- `credits_remaining`：剩余额度数。
- `expires_at`：UTC 时间。
- `created_at`：UTC 时间。

### AiRecognitionAttempt

图片识别尝试记录。用于成本归因、风控、失败退款和效果分析。它不保存原始图片、不保存完整 OCR 文本，也不保存未确认识别明细。当前数据库表和 migration 已实现；图片识别 API 尚未接入额度消耗和尝试状态更新。

当前字段：

- `id`：内部唯一 ID。
- `schedule_id`：所属日程。
- `participant_id`：可选参与者，用户确认提交后可回填。
- `credit_grant_id`：本次消耗的额度来源。
- `entry_method`：固定为 `image_import`。
- `image_mime_type`：上传图片类型。
- `image_byte_size`：上传图片大小。
- `model`：调用的图片识别模型。
- `estimated_cost_usd`：估算成本。
- `status`：`started`、`succeeded`、`low_confidence`、`provider_unavailable`、`failed` 或 `refunded`。
- `created_at`：UTC 时间。
- `updated_at`：UTC 时间。

### RewardedAdVerification

激励广告完成事件验证记录。用于服务端确认广告完成、避免重复发放额度，并把广告收益和 AI 成本做粗略归因。当前数据库表和 migration 已实现；真实 rewarded ad provider 和服务端验证流程仍未接入。

当前字段：

- `id`：内部唯一 ID。
- `provider`：广告平台。
- `ad_unit_id`：广告单元 ID。
- `reward_event_id_hash`：奖励事件 ID 的哈希。
- `scope_id_hash`：获得奖励的匿名 session、浏览器设备或用户范围。
- `verification_status`：`pending`、`verified`、`rejected` 或 `duplicate`。
- `gross_revenue_usd`：可选，平台回传或后续报表归因的粗略收入。
- `created_at`：UTC 时间。

### CandidateTimeOption

候选时间投票模式中的组织者预设时间。它适合 Doodle/Rallly 风格的“几个候选时间里选一个或几个”场景。
当前 v1 已落库为 `candidate_time_options`。

字段草案：

- `id`：内部唯一 ID。
- `schedule_id`：所属日程。
- `slot_start_utc`：候选时间开始，UTC。
- `slot_end_utc`：候选时间结束，UTC。
- `label`：可选显示标签，例如“晚饭前”或“线上会议”。

### CandidateVote

参与者对某个候选时间的选择。当前 v1 已落库为 `candidate_votes`，用于保存 `available`、`maybe`、`unavailable` 三态响应和可选偏好顺位。
为了继续复用现有可用时间统计，`available` 响应会同步写入 `availability_slots`；`maybe` 不计入全员可用或多数人可用人数，但会在候选投票结果视图和导出中单独展示。

字段草案：

- `candidate_time_option_id`：候选时间。
- `participant_id`：参与者。
- `response`：`available`、`maybe`、`unavailable`。
- `preference_rank`：可选偏好顺位，正整数，只能用于 `available` 或 `maybe` 响应；同一参与者一次提交内不能有重复顺位。

### UserAccount

后续登录功能中的用户账号。它服务于长期模板、历史偏好和可能的高频用户功能，不改变匿名参与主流程。

字段草案：

- `id`：内部唯一 ID。
- `display_name`：默认显示名称。
- `email`：可选登录邮箱或第三方身份标识，具体方案需另写认证 ADR。
- `default_timezone`：默认 IANA 时区。
- `created_at`：UTC 时间。
- `updated_at`：UTC 时间。

### AvailabilityTemplate

登录用户维护的长期可用时间模板，例如“上课期间一般有空时间”或“工作日晚间和周末”。
当前代码已支持不落库的内联模板预览 DTO，且 Web 端会在浏览器本机记住上次成功使用的内联模板星期和时间段，并可保存多个仅当前浏览器可见的本机每周模板；下面的持久化字段属于后续登录用户模板模型。

字段草案：

- `id`：内部唯一 ID。
- `user_id`：所属用户。
- `name`：模板名称。
- `timezone`：模板的默认 IANA 时区。
- `notes`：可选备注。
- `created_at`：UTC 时间。
- `updated_at`：UTC 时间。

### AvailabilityTemplateWindow

个人模板中的每周重复可用窗口。

字段草案：

- `id`：内部唯一 ID。
- `template_id`：所属模板。
- `day_of_week`：星期，0 表示周日，1 到 6 表示周一到周六。
- `start_time`：模板时区下的本地开始时间，`HH:mm`。
- `end_time`：模板时区下的本地结束时间，`HH:mm`。

## 时间规则

- 数据库存储所有精确时间时统一使用 UTC。
- 日程配置中的日期和每日时间窗口使用组织者选择的 IANA 时区解释。
- 前端展示时默认使用用户本地时区，同时允许切换到日程时区。
- 所有时间格必须从 `Schedule` 配置生成，不能由 UI 临时拼接。
- 跨天、夏令时切换和日期边界必须由核心时间库处理。
- API 输入的精确时间戳必须包含 `Z` 或明确时区偏移，服务端再统一规范化为 UTC。
- 长期模板中的每周时间窗口按模板时区解释，再投影到具体日程的日期范围和时间格上。
- 课表导入识别出的忙碌时间必须先转换为明确时区下的时间块，再由核心逻辑反推出当前日程中的建议可用时间槽。

## 权限规则

- MVP 不要求用户注册。
- 登录账号是后续高频用户能力，不应成为查看、创建和参与普通日程的前置条件。
- 计划中的 AI 图片识别额度可以绑定匿名 session、浏览器设备或登录用户，但不能成为手动填写、候选投票、文本导入、CSV/ICS 导入的前置条件。
- 创建日程后，组织者获得一个只显示一次的管理链接或管理密钥。
- 参与者提交后，获得一个编辑链接或编辑密钥；当前 Web 端也会在本机浏览器按日程记住该参与者的编辑入口，方便同一浏览器再次修改。
- 公共分享链接只能查看和填写，不能删除日程、锁定日程或修改他人提交。
- 只有组织者管理密钥可以确认最终时间；开放网格模式的确认范围必须来自当前全员可用连续时间段，候选投票模式的确认范围必须来自组织者预设候选时间。
- 当前本机每周模板只存在于浏览器 localStorage；后续登录版个人长期模板只能由模板所有者读取、修改和删除。
- 服务端只存密钥哈希，不存明文密钥。

## 状态规则

- `open`：允许新增和修改提交。
- `locked`：禁止新增和修改提交，结果仍可查看。
- `archived`：只读状态，可在过期后清理。
- 确认最终时间会保存 `final_start_utc` / `final_end_utc` 并把日程置为 `locked`；已锁定但未归档时，组织者仍可重新选择另一个当前模式下可确认的最终时间。

## 结果计算规则

- 共同空闲时间：某个时间格被所有当前参与者标记为可用。
- 多数人空闲时间：按可用人数从高到低排序。
- 如果没有参与者，不能显示“所有人都有空”，只显示等待填写状态。
- 连续相邻时间格可以合并为更长时间段。
- 开放网格模式下，最终时间必须精确匹配一个共同空闲时间段，不允许选择非全员可用时间。
- 候选投票模式下，最终时间必须精确匹配一个候选时间；组织者可以根据方便、也许和不方便名单选择最终候选。
- 候选投票的默认最佳候选按综合支持分排序：`available` 计 1 分，`maybe` 计 0.5 分；综合分相同时，优先确定可用人数更多的候选，再按也许人数、首选人数、平均偏好顺位和开始时间排序。
- 导入流程中的忙碌时间块需要先与日程时间格求差集，生成建议可用时间槽。
- 长期模板需要先按日程日期范围投影为候选可用窗口，再与日程时间格求交集。
- 候选时间投票模式需要把组织者预设候选时间对齐到统一时间槽；`available` 参与现有汇总，`maybe` 作为候选投票附加统计并参与候选投票综合排序。
- 所有非手动入口都必须先形成 `AvailabilityDraft`，由用户确认后再写入最终提交。
- 核心计算逻辑必须放在 `packages/core`，UI 和 API 层不得重复实现。

## 数据保留规则

- MVP 默认日程在创建后 90 天过期。
- 过期日程可先归档，后续再删除。
- 用户提交中不收集邮箱、手机号、微信号等敏感信息。
- 导入 v1 默认不保存原始图片、原始文件、原始文本或未确认的识别中间结果。
- 计划中的 AI 图片识别额度和广告验证只保存必要的额度、事件哈希、图片元数据、成本估算和状态；广告平台不应接收日程内容、上传图片、参与者姓名或识别明细。
- 内联模板预填服务端默认不保存模板内容，只用于生成当前页面的预填草稿；Web 端可在浏览器本机记住上次成功使用的星期和时间段，作为下次填写的默认控件值，也可把多个命名每周模板保存到当前浏览器。
- 长期模板属于登录用户主动保存的数据，删除账号或模板时应同步删除对应模板窗口。
- 如果后续添加登录或通知功能，需要更新隐私说明和数据保留策略。
