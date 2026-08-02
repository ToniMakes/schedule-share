# AI 图片识别成本与激励广告方案

更新日期：2026-08-02

## 定位

本文件记录图片课表/排班识别的成本控制和商业化方案。它是计划文档，不代表当前代码已经接入广告、额度账本或付费能力。

当前已经实现的是图片导入预览入口和 OpenAI provider 适配器；要让这个能力长期开放给真实用户，还需要先解决“每次识别都会产生成本”的问题。短期推荐方案是：手动填写、候选投票、文本导入、CSV/ICS 导入继续保持免费且不插入广告；只有 AI 图片识别这种高成本入口，才使用用户主动触发的激励广告或免费额度来换取识别次数。

## 目标

- 让图片识别成为产品差异化能力，而不是无限制烧钱入口。
- 保留无广告的核心排期体验：用户始终可以不用图片识别完成填写。
- 用激励广告或少量免费额度覆盖 AI 识别的边际成本。
- 给系统加上每日限额、单日程限额、失败退款和总开关。
- 不把日程内容、上传图片或识别文本交给广告平台做定向。

## 非目标

- 不在手动填写、候选投票、文本导入、CSV/ICS 导入过程中强插广告。
- 不鼓励或要求用户点击广告。只能按广告平台允许的 rewarded ad 完成事件发放额度。
- 不承诺“每一次识别都必然盈利”。广告 eCPM、填充率、无效流量和地区差异都会波动，只能通过阈值和限额让整体期望为正。
- 不在未做法律和广告平台政策审阅前正式面向所有用户开放。
- 不把激励广告和未来会员/付费能力混成同一套不可拆的逻辑。

## 推荐产品机制

用户看到图片识别入口时，系统先检查是否有可用的 AI 图片识别额度：

1. 如果有免费额度或已获得的广告额度，直接允许上传图片并生成预览。
2. 如果没有额度，显示“观看广告，获得 1 次图片识别”的主动按钮。
3. 用户完成 rewarded ad 后，前端请求服务端校验广告完成事件。
4. 服务端通过广告平台回调或服务端验证确认事件有效后，发放 1 次 AI 图片识别额度。
5. 用户上传图片，服务端原子消耗 1 次额度，再调用 OpenAI 图片识别。
6. 识别结果只生成 `AvailabilityDraft`，用户仍需确认或手动修正后才会提交。
7. 如果 provider 不可用、超时或内部错误，额度可以退款；如果成功返回但置信度低，一般不自动退款，只提示用户复核。

推荐默认策略：

- 每个新日程可给 1 次免费图片识别额度，用于降低首次试用门槛。
- 同一浏览器或同一匿名 session 每天最多通过广告换取有限次数，例如 3 到 5 次。
- 同一日程最多允许有限次数图片识别，例如 10 到 20 次，避免被单个分享链接刷爆成本。
- 文本粘贴、CSV、ICS 和手动填写永远作为免费 fallback。

## 单次经济模型

先按保守区间估算 OpenAI 图片识别成本：

- 普通清晰课表截图：约 `$0.002` 到 `$0.01` 每次。
- 超大图、复杂表格、重试和低置信度复核会提高实际成本。
- 成本必须按真实 usage log 定期校准，不应长期只用静态估算。

激励广告单次预期收入可用下面的公式估算：

```text
adRevenuePerView = eCPM / 1000 * fillRate * validTrafficRate
requiredEcpm = apiCostPerRecognition * 1000 / (fillRate * validTrafficRate)
```

含义：

- `eCPM`：每 1000 次有效广告展示收入。
- `fillRate`：广告请求能拿到广告的比例。
- `validTrafficRate`：扣掉无效流量、未完成、风控损耗后的有效比例。
- `apiCostPerRecognition`：一次图片识别的平均 AI 成本。

示例：

| 假设场景 | AI 成本  | 填充率 | 有效率 | 覆盖成本所需 eCPM |
| -------- | -------- | ------ | ------ | ----------------- |
| 乐观     | `$0.002` | 90%    | 90%    | 约 `$2.47`        |
| 中性     | `$0.005` | 80%    | 85%    | 约 `$7.35`        |
| 保守     | `$0.01`  | 70%    | 80%    | 约 `$17.86`       |

推荐兑换规则：

- 真实有效 eCPM 稳定高于 `$10`：1 次 rewarded ad 换 1 次图片识别。
- eCPM 在 `$3` 到 `$10`：考虑 2 次广告换 1 次识别，或限制图片大小、模型、每日额度。
- eCPM 低于 `$3`：关闭广告换识别，仅保留免费试用额度或手动/文本/CSV/ICS fallback。
- 当 OpenAI usage 或广告收入监控异常时，立即关闭 `AI_IMAGE_REWARDED_ADS_ENABLED`。

## 数据模型计划

以下实体属于后续实现计划，当前数据库还没有这些表。

### AiRecognitionCreditGrant

记录一次 AI 图片识别额度发放。

字段草案：

- `id`：内部唯一 ID。
- `scope_type`：额度归属范围，例如 `anonymous_session`、`browser_device`、`user_account`。
- `scope_id_hash`：匿名 session、设备标识或用户 ID 的哈希；尽量避免保存原始广告标识。
- `schedule_id`：可选，额度如限定在某个日程内使用则填写。
- `source`：`free_quota`、`rewarded_ad`、`admin` 或 `refund`。
- `provider`：广告或额度来源，例如 `google_admob`、`adsense`、`internal_free_quota`。
- `provider_event_id_hash`：广告完成事件 ID 的哈希，用于防重复发放。
- `credits_granted`：发放额度数。
- `credits_remaining`：剩余额度数。
- `expires_at`：过期时间。
- `created_at`：UTC 时间。

### AiRecognitionAttempt

记录一次图片识别尝试，用于成本、风控和退款判断。

字段草案：

- `id`：内部唯一 ID。
- `schedule_id`：所属日程。
- `participant_id`：可选，用户确认提交后可回填；匿名预览阶段也可以为空。
- `credit_grant_id`：本次消耗的额度来源。
- `entry_method`：固定为 `image_import`。
- `image_mime_type`：上传图片类型。
- `image_byte_size`：上传图片大小。
- `image_width` / `image_height`：可选图片尺寸。
- `model`：调用的图片识别模型。
- `estimated_cost_usd`：估算成本，后续可由真实 usage 数据校准。
- `status`：`started`、`succeeded`、`low_confidence`、`provider_unavailable`、`failed` 或 `refunded`。
- `created_at`：UTC 时间。

`AiRecognitionAttempt` 不保存原始图片、不保存完整 OCR 文本、不保存未确认的识别明细；只保存必要的元数据和成本状态。

### RewardedAdVerification

记录广告完成事件的服务端验证结果。

字段草案：

- `id`：内部唯一 ID。
- `provider`：广告平台。
- `ad_unit_id`：广告单元 ID。
- `reward_event_id_hash`：奖励事件 ID 的哈希。
- `scope_id_hash`：获得奖励的匿名 session、设备或用户范围。
- `verification_status`：`pending`、`verified`、`rejected` 或 `duplicate`。
- `gross_revenue_usd`：可选，平台回传或后续报表归因的粗略收入。
- `created_at`：UTC 时间。

## API 计划

这些接口还未实现，写入这里是为了后续开发时保持同一套契约。

### 查询 AI 识别额度

`GET /api/ai-credits/status`

用途：

- 返回当前匿名 session 或登录用户的图片识别剩余额度。
- 告诉前端是否需要展示 rewarded ad CTA。
- 返回当前功能是否因成本护栏关闭。

### 验证激励广告完成事件

`POST /api/ai-credits/rewarded-ad/verify`

用途：

- 接收前端广告完成事件或广告平台服务端验证 token。
- 服务端校验签名、事件唯一性、广告单元和过期时间。
- 校验成功后发放 `AiRecognitionCreditGrant`。

### 图片预览额度校验

`POST /api/schedules/:publicId/availability-preview`

计划变更：

- 当 `method=image_import` 且激励广告模式开启时，服务端必须先原子消耗 1 次 AI 图片识别额度。
- 无额度时返回计划错误码 `AI_CREDIT_REQUIRED`，并告诉前端可以展示 rewarded ad 入口。
- provider 不可用、网络超时或内部错误时可以自动退款。
- 文件类型、大小、低置信度和用户取消不应绕过既有校验。

## 计划环境变量

以下变量是未来接入激励广告和额度系统时使用，不属于当前生产部署必填项：

| 变量                                     | 说明                                                    |
| ---------------------------------------- | ------------------------------------------------------- |
| `AI_IMAGE_REWARDED_ADS_ENABLED`          | 是否启用激励广告换图片识别额度。                        |
| `AI_IMAGE_FREE_CREDITS_PER_SCHEDULE`     | 每个日程默认发放的免费图片识别额度。                    |
| `AI_IMAGE_CREDIT_DAILY_LIMIT`            | 同一匿名 session、设备或用户每日可获得/使用的额度上限。 |
| `AI_IMAGE_MAX_RECOGNITIONS_PER_SCHEDULE` | 单个日程最多允许的图片识别次数。                        |
| `AI_IMAGE_COST_GUARDRAIL_USD`            | 单日或单周期 AI 图片识别成本上限。                      |
| `REWARDED_AD_PROVIDER`                   | 激励广告提供商标识。                                    |
| `REWARDED_AD_UNIT_ID`                    | 广告单元 ID。                                           |
| `REWARDED_AD_VERIFICATION_SECRET`        | 服务端验证广告完成事件所需的密钥或签名 secret。         |
| `REWARDED_AD_MIN_EFFECTIVE_ECPM_USD`     | 低于该有效 eCPM 时暂停广告换额度。                      |
| `REWARDED_AD_CREDIT_EXCHANGE_RATE_DENOM` | 兑换比例分母，例如设置为 `2` 表示 2 次广告换 1 次识别。 |

## 隐私和合规原则

- 广告平台只应拿到广告展示所需的最小化信息，不应接收用户上传的课表图片、日程标题、参与者姓名、识别文本或可用时间。
- 图片内容只发送给配置的 AI provider，并且只用于生成本次可编辑预览。
- 用户必须主动选择观看激励广告；不能把广告伪装成继续按钮，也不能把广告插入无关流程。
- 不能承诺点击广告获得更多额度，也不能诱导点击广告。
- 上线前需要按目标地区和广告平台政策确认 rewarded ad 是否适用于网页、学生场景和匿名用户。
- 隐私说明页需要补充广告 SDK、奖励验证、额度记录和 AI provider 的公开说明。

## 风控和成本护栏

- 对匿名 session、IP、日程和全站分别做频率限制。
- 对广告事件做防重放：同一个 `reward_event_id` 只能发放一次额度。
- 对 OpenAI provider 设置超时、图片大小限制和总成本限额。
- 识别失败要区分可退款失败和不可退款结果，避免用户重复刷退款。
- 记录每次识别的估算成本、置信度、用户最终是否提交，以及提交前修改比例。
- 当全站成本超过阈值、广告填充率过低、无效流量升高或 OpenAI key 异常时，自动关闭广告换额度。

## 指标

上线小流量实验时，至少观察：

- 图片识别入口曝光次数。
- 上传图片尝试次数。
- rewarded ad 展示、完成、验证成功和验证失败次数。
- AI 额度发放、消耗、退款和过期次数。
- 图片识别成功率、低置信度率和 provider 错误率。
- 单次识别平均成本和 P95 成本。
- 每次广告完成的有效收入估算。
- 预览后真实提交率。
- 用户从图片识别改用手动、文本、CSV 或 ICS 的比例。

## 分阶段落地

1. 文档阶段：明确成本、广告、隐私、数据模型和 API 计划，不改现有可用主链路。
2. 免费额度阶段：先做本机或匿名 session 的少量免费图片识别额度和全站限额，不接广告。
3. 小流量广告阶段：接入 rewarded ad provider，使用服务端验证发放额度，并保留手动 fallback。
4. 动态兑换阶段：按真实 eCPM、填充率、AI 成本和风控情况调整 1 广告换 1 次或多广告换 1 次。
5. 付费或会员阶段：只有在真实用户证明图片识别有高频价值后，再考虑付费额度、会员或组织者侧套餐。

## 打开条件

公开开放广告换图片识别前，至少需要满足：

- `OPENAI_API_KEY` 已在生产环境配置并通过真实样本调优。
- 有 `AiRecognitionCreditGrant` 和 `AiRecognitionAttempt` 账本，额度消耗是原子的。
- 广告完成事件通过服务端验证，不能只信任前端回调。
- 隐私说明已经补充广告和 AI provider 数据处理边界。
- 有全站开关、每日成本上限、单日程上限和紧急关闭流程。
- 手动填写、文本导入、CSV/ICS 导入在广告关闭时仍可正常使用。
