# 广告与 AI 图片识别商业化方案

更新日期：2026-08-02

## 定位

本文件记录网站常驻展示广告、AI 图片识别成本控制、激励广告换额度和后续增值能力的商业化方案。当前代码已经接入默认关闭的常驻展示广告框架和 `/ads.txt` 路由；真实广告、AI 额度账本、激励广告验证和付费能力仍未开放。

当前已经实现的是核心排期主链路、图片导入预览入口、OpenAI provider 适配器，以及默认不加载第三方脚本的展示广告位框架；要让产品长期开放给真实用户，需要同时解决两类问题：

- 普通页面浏览和低成本功能需要有被动收入，至少覆盖托管、数据库、域名和日常维护。
- AI 图片识别每次都会产生成本，需要用免费额度、激励广告或未来付费额度做精细控制。

## 目标

- 用常驻展示广告建立基础被动收入。
- 让图片识别成为产品差异化能力，而不是无限制烧钱入口。
- 保留低干扰的核心排期体验：用户始终可以不用图片识别完成填写。
- 用激励广告或少量免费额度覆盖 AI 图片识别的边际成本。
- 给系统加上每日限额、单日程限额、失败退款和总开关。
- 为未来高频组织者保留“移除广告、自定义品牌、群组和批量活动”等增值路径。
- 不主动把日程内容、上传图片或识别文本传给广告平台做定向。

## 非目标

- 不在时间格、提交按钮、上传预览、候选投票按钮等核心操作区插入会误触或阻断操作的广告。
- 不鼓励或要求用户点击广告。只能按广告平台允许的 rewarded ad 完成事件发放额度。
- 不承诺“每一次识别都必然盈利”。广告 eCPM、填充率、无效流量和地区差异都会波动，只能通过阈值和限额让整体期望为正。
- 不在未做法律和广告平台政策审阅前正式面向所有用户开放。
- 不把激励广告和未来会员/付费能力混成同一套不可拆的逻辑。

## 推荐商业化组合

短期不要只押注某一个收入来源。推荐组合是：

1. 常驻展示广告：覆盖基础流量收入。适合放在结果页、提交成功页、公开说明页和桌面侧栏；移动端优先使用可关闭的底部 anchor ad。
2. 激励广告换 AI 额度：只服务图片识别这种有明确成本的高级入口。用户主动看广告，获得 1 次或若干次图片识别额度。
3. 组织者侧增值：等真实使用数据足够后，再考虑移除广告、自定义品牌、保存常用群组、批量创建活动、提醒和统计。不要让普通参与者为一次性填写付费。

这套组合的判断是：普通参与者付费意愿很低，常驻广告能把每次访问变成微小收入，激励广告能把高成本 AI 操作和收入绑定，组织者增值则保留真正可能付费的人群。

## 广告平台选择

展示广告和激励广告要按两条不同接入线管理：

- 常驻展示广告：优先评估 Google AdSense / Auto ads，用于顶部、底部、桌面侧栏、移动 anchor 和结果页内容间广告。
- 激励广告：不能把普通 AdSense 展示广告包装成“看广告得额度”。必须使用明确支持 rewarded inventory、用户同意和服务端验证的产品，例如 Google Ad Manager / Google Publisher Tag rewarded ad，或其他明确支持 Web rewarded ad 的广告网络。
- 自营或内部广告：带管理/编辑密钥的页面、上传预览页和高隐私页面在未完成 URL 密钥迁移前，只允许内部推广、无第三方脚本的赞助占位或不展示广告。

平台选择规则：

- 普通展示广告不能承诺奖励、不能诱导点击、不能靠误触盈利。
- 激励广告必须由用户主动触发，并且奖励事件必须能在服务端校验、去重和审计。
- 如果某个平台不支持 Web rewarded ad 或不能提供可验证完成事件，就不能用于发放 AI 图片识别额度。
- 真实广告只允许在生产域名启用；本地、Preview、自动化测试和内部 QA 默认关闭真实广告或使用平台 test mode。

## 常驻展示广告策略

常驻广告用于被动收入，产品策略改为“默认每个页面都有外围广告框架”。创建、填写、编辑、结果、管理和说明类页面都可以展示广告，但广告只能占用页面边缘、段落间或完成动作之后的位置，不能进入用户正在做选择、拖拽、上传、提交、复制和导出的关键操作区。

推荐页面密度：

- A 档，核心操作页：创建页、参与者填写页、编辑页。使用顶部 slim banner、桌面左右 rail、移动端可关闭底部 anchor。中间表单、时间格和提交区保持无广告。
- B 档，结果和管理页：公开结果页、组织者管理页。可以使用顶部 banner、结果块之间的 in-content ad、桌面左右 rail、页面底部广告；带管理密钥的页面必须先处理完整 URL 密钥暴露风险。
- C 档，完成和说明页：提交成功状态、隐私页、反馈页、公开说明页。可以使用更完整的顶部、底部、侧栏和内容间广告，但仍需要控制单屏广告占比。

推荐广告位：

- 全站顶部：窄高度横幅，不能挤压主标题或导航。
- 公开日程结果页：结果摘要下方、较优时间槽列表下方、页面底部。
- 创建、填写和编辑页：只放外框广告，例如顶部、底部、桌面左右 rail；不放进表单或时间格之间。
- 提交成功状态：参与者提交后展示编辑链接和确认信息，再展示广告。
- 桌面端侧栏：左右 rail 都可以启用，宽屏时常驻，窄屏隐藏。
- 移动端底部 anchor ad：可关闭，不能遮挡提交按钮、日期导航、时间格或上传预览；移动端同一时刻只保留一个 sticky 边缘广告。
- 公开说明页、隐私页、反馈页：可以使用低密度展示广告，但不要把页面做成专门展示广告的内容页。

当前实现状态：

- `DisplayAd` / `AdPageChrome` 已接入首页、创建页、公开日程页、管理页、编辑页、隐私页和反馈页。
- 默认关闭；本地可用 `NEXT_PUBLIC_DISPLAY_ADS_PREVIEW=true` 和 `NEXT_PUBLIC_DISPLAY_ADS_PLACEHOLDERS=true` 查看布局占位。
- provider 为 `placeholder` 时只显示一方占位；provider 为 `adsense` 时还需要 client ID、slot ID、域名白名单和第三方脚本安全检查。
- 管理页和编辑页传入 `thirdPartyAllowed=false`，带 `?key=` 的敏感页面不会加载第三方广告脚本。

首期不建议放广告的位置：

- 参与者正在填写的时间格区域。
- 候选投票按钮区域。
- 图片、CSV、ICS 或文本导入预览区域。
- 广告请求或第三方脚本可能接触管理密钥或编辑密钥 URL 的页面；除非已经确认第三方脚本无法读到完整密钥 URL。
- 任何用户可能误以为广告是“提交”“复制”“导出”“继续”的位置。

展示规则：

- 广告必须有清楚的广告标识，不能伪装成站内按钮、候选时间或系统提示。
- 不使用“点击广告支持我们”“看广告支持本站”等诱导文案。
- 不把广告放进浮层脚本、弹窗、下载按钮附近或容易误触的位置。
- 如果广告显著降低提交率、造成移动端遮挡或让页面布局跳动，应优先降广告密度。
- 默认以 `NEXT_PUBLIC_DISPLAY_ADS_ENABLED` 做全站开关，以页面类型、视口、密钥泄露风险和广告密度决定具体位置。
- 首期关闭 vignette / interstitial 这类全屏或页面跳转间广告，直到创建率、填写完成率和移动端遮挡数据稳定。
- 如果启用 Auto ads，需要配置 page exclusion 或局部禁用清单，不能让平台自动把广告插入表单、时间格、上传预览、候选按钮和复制/导出区域。

## AdSense 上线准备

AdSense 更像“网站内容和流量审核”，不是接上代码就能长期稳定出广告。公开开放前需要先准备：

- 生产域名、HTTPS 和基础导航已经稳定。当前正式域名可以作为审核入口。
- 首页不能只有空表单，要有可被搜索引擎和广告审核理解的原创内容：这个工具解决什么问题、适合谁、如何处理时区、隐私如何保护、用户如何反馈。
- 已提供稳定可访问的 `/about`、`/privacy`、`/feedback` 和 `/terms` 基础页面；正式开放广告前仍需要做法律和广告政策审阅。
- 动态日程页属于用户生成内容和临时链接，不应作为广告审核的主要内容来源；审核重点放在公开首页、说明页、隐私页和真实可用的创建入口。
- 隐私说明需要明确广告 cookie、Google 和其他第三方广告供应商、个性化广告退出方式、地区化 consent、广告请求会包含哪些设备/网络/页面信息。
- `/ads.txt` 路由已接入；拿到 publisher ID 后设置 `ADS_TXT_PUBLISHER_ID` 并确认根域可抓取。它不负责提高产品价值，但能减少“未授权库存”导致的广告投放问题。
- `robots.txt` 和 `sitemap.xml` 已接入，公开说明页可抓取；动态日程页、API 和带密钥 URL 首期不进入 sitemap。
- 本地、Vercel Preview、自动化测试、站长自测和内部 QA 不加载真实广告，避免无效流量。

广告审核前需要确认这些公开资产：

- `/about`：已接入基础产品定位、适合人群和核心功能说明；正式上线前补联系方式或运营主体。
- `/privacy`：已接入隐私说明基础版；真实广告前补第三方广告供应商、cookie、个性化广告退出和 consent。
- `/feedback`：已接入反馈和删除请求说明；正式上线前补专用邮箱或站内表单。
- `/terms`：已接入基础使用条款草案；正式上线前做法律审阅。
- `/ads.txt`：路由已接入；拿到 AdSense publisher ID 后配置生产环境变量。
- `robots.txt` 和 `sitemap.xml`：已接入；继续避免密钥页进入索引。

## 密钥 URL 与第三方广告脚本

当前代码生成的 `ownerUrl` 和 `editUrl` 带有 `?key=` 查询参数。`Referrer-Policy` 可以减少跳转或资源请求时的 referrer 泄露，但加载到页面里的第三方广告脚本仍可能通过 `window.location.href` 读到完整 URL。因此：

- 带 `?key=` 的管理页和编辑页首期不能加载第三方广告脚本。
- 这类页面可以展示自营推广、无第三方脚本的静态赞助位，或完全不展示广告。
- `NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE` 默认应为 `off` 或 `internal`，不应默认为 `full`。
- 如果未来要在管理/编辑页放第三方广告，先把权限密钥从 URL 迁移到 httpOnly cookie、一次性交换 session、短期服务端状态或其他不暴露给第三方脚本的机制。
- 即使完成密钥迁移，也仍要设置 `Referrer-Policy: strict-origin-when-cross-origin` 或更严格策略，并监控页面是否引入未批准第三方脚本。

## 常驻广告收入模型

常驻展示广告更适合覆盖固定成本，不适合指望一开始带来强盈利。

粗略公式：

```text
monthlyDisplayAdRevenue = monthlyPageViews / 1000 * pageRpm
```

按单个日程看毛利时，需要把常驻广告和图片识别成本放在同一张表里：

```text
revenuePerSchedule =
  schedulePageViews / 1000 * pageRpm
  + rewardedAdCompletions * rewardedRevenuePerCompletion
  - imageRecognitionAttempts * averageAiCostPerAttempt
```

示例：

| 月 PV     | Page RPM `$1` | Page RPM `$3` | Page RPM `$5` |
| --------- | ------------- | ------------- | ------------- |
| `10,000`  | `$10`         | `$30`         | `$50`         |
| `100,000` | `$100`        | `$300`        | `$500`        |
| `500,000` | `$500`        | `$1,500`      | `$2,500`      |

因此常驻广告的目标应该是：

- 覆盖 Vercel、Neon、域名、监控和少量维护成本。
- 给免费用户路径创造被动收入。
- 不直接承担所有 AI 图片识别成本。

AI 图片识别仍应通过激励广告额度或未来付费额度单独控制。

判断口径：

- 纯手动、文本、CSV、ICS 日程主要看 `schedulePageViews / 1000 * pageRpm` 能否覆盖基础流量成本。
- 图片识别日程必须额外看 `rewardedAdCompletions * rewardedRevenuePerCompletion` 是否覆盖 `imageRecognitionAttempts * averageAiCostPerAttempt`。
- 如果图片识别尝试次数增长，但 rewarded ad 收入没有同步覆盖成本，就要降低免费额度、提高兑换门槛、限制图片尺寸/重试次数，或临时关闭图片识别。

## AI 图片识别激励广告机制

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

## 后续组织者增值方向

这些能力不适合第一天就收费，但适合作为真实使用后的付费方向：

- 移除广告：组织者可为某个日程或自己的活动空间移除常驻展示广告。
- 自定义品牌：活动页 logo、主题色、组织名称和固定说明。
- 常用群组：保存常见参与者群组、默认时区和默认活动窗口。
- 批量活动：一次创建多场面试、课程讨论、社群活动或志愿者排班。
- 提醒和通知：邮件、日历或后续小程序提醒。
- 统计和导出：历史活动、参与率、最佳时间偏好和更完整的 CSV/ICS 导出。

付费对象优先是组织者、社团、老师、小团队或高频活动发起人，而不是普通参与者。

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
- `provider`：广告或额度来源，例如 `google_ad_manager`、`rewarded_web_network`、`internal_free_quota`。
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

## 环境变量

以下常驻展示广告变量已被当前代码读取，但默认关闭，不属于当前生产部署必填项。真实广告上线前必须通过广告平台审核、配置生产域名白名单，并跑通 `corepack pnpm deployment:config`：

常驻展示广告：

| 变量                                      | 说明                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DISPLAY_ADS_ENABLED`         | 是否启用常驻展示广告。默认 false；真实广告上线前保持关闭。                      |
| `NEXT_PUBLIC_DISPLAY_ADS_PREVIEW`         | 本地或 Preview 检查广告位布局用；可配合占位展示。                               |
| `NEXT_PUBLIC_DISPLAY_ADS_PROVIDER`        | 常驻广告提供商：`placeholder` 或 `adsense`。                                    |
| `NEXT_PUBLIC_DISPLAY_ADS_PLACEHOLDERS`    | 是否显示一方占位广告框，不加载第三方脚本。                                      |
| `NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE`  | 带管理/编辑密钥页面的广告模式：`off`、`internal` 或 `full`。生产不应设 `full`。 |
| `NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS`   | 允许加载真实 AdSense 脚本的生产域名白名单。                                     |
| `NEXT_PUBLIC_DISPLAY_ADS_TEST_MODE`       | 是否使用广告平台测试模式；本地、Preview、自动化测试应避免真实请求。             |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID`           | AdSense client ID，例如 `ca-pub-...`。                                          |
| `NEXT_PUBLIC_ADSENSE_SLOT_TOP_BANNER`     | 顶部横幅广告位 ID。                                                             |
| `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM_BANNER`  | 底部横幅广告位 ID。                                                             |
| `NEXT_PUBLIC_ADSENSE_SLOT_INLINE_RESULTS` | 结果或说明内容间广告位 ID。                                                     |
| `NEXT_PUBLIC_ADSENSE_SLOT_POST_SUBMIT`    | 提交成功后广告位 ID。                                                           |
| `NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_RAIL`   | 桌面左右侧栏广告位 ID。                                                         |
| `NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_ANCHOR`  | 移动端可关闭底部 anchor 广告位 ID。                                             |
| `ADS_TXT_PUBLISHER_ID`                    | 生成 `/ads.txt` 时使用的广告发布商 ID。                                         |

以下变量仍属于后续激励广告和额度系统计划，当前代码尚未读取，不需要在 Vercel 里立即配置：

AI 图片识别和激励广告：

| 变量                                     | 说明                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `AI_IMAGE_IMPORT_ENABLED`                | 图片识别总开关。默认 false；即使配置 `OPENAI_API_KEY` 也不会自动开放。     |
| `AI_IMAGE_IMPORT_RELEASE_MODE`           | `off`、`local_only`、`internal_test` 或 `public`；当前 public 被代码阻断。 |
| `AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN`    | 内测请求头 `x-ai-image-import-test-token` 需要匹配该值。                   |
| `AI_IMAGE_IMPORT_MAX_BYTES`              | 图片上传大小上限，只能低于或等于代码硬上限 4MB。                           |
| `OPENAI_IMAGE_IMPORT_TIMEOUT_MS`         | OpenAI 图片识别请求超时，代码硬上限 30 秒。                                |
| `OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS`  | 图片识别最大输出 token，代码硬上限 3000。                                  |
| `OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE`     | 低于该整体置信度时返回低置信度错误，不生成可提交结果。                     |
| `AI_IMAGE_AD_GATE_READY`                 | 广告门槛是否已准备好；公开开放前必须由真实实现和运营检查支撑。             |
| `AI_IMAGE_CREDITS_ENFORCED`              | 额度账本和原子消耗是否已强制执行。                                         |
| `AI_IMAGE_COST_GUARDRAIL_ENABLED`        | 全站成本护栏和紧急关闭是否已启用。                                         |
| `AI_IMAGE_REWARDED_ADS_ENABLED`          | 是否启用激励广告换图片识别额度。                                           |
| `AI_IMAGE_FREE_CREDITS_PER_SCHEDULE`     | 每个日程默认发放的免费图片识别额度。                                       |
| `AI_IMAGE_CREDIT_DAILY_LIMIT`            | 同一匿名 session、设备或用户每日可获得/使用的额度上限。                    |
| `AI_IMAGE_MAX_RECOGNITIONS_PER_SCHEDULE` | 单个日程最多允许的图片识别次数。                                           |
| `AI_IMAGE_COST_GUARDRAIL_USD`            | 单日或单周期 AI 图片识别成本上限。                                         |
| `REWARDED_AD_PROVIDER`                   | 激励广告提供商标识。                                                       |
| `REWARDED_AD_UNIT_ID`                    | 广告单元 ID。                                                              |
| `REWARDED_AD_VERIFICATION_SECRET`        | 服务端验证广告完成事件所需的密钥或签名 secret。                            |
| `REWARDED_AD_MIN_EFFECTIVE_ECPM_USD`     | 低于该有效 eCPM 时暂停广告换额度。                                         |
| `REWARDED_AD_CREDIT_EXCHANGE_RATE_DENOM` | 兑换比例分母，例如设置为 `2` 表示 2 次广告换 1 次识别。                    |

## 隐私和合规原则

- 常驻广告平台可能会接收广告请求所需的页面 URL、浏览器、设备、网络和地区等信息；产品不得主动把日程标题、参与者姓名、上传图片、识别文本或可用时间作为广告定向字段传递。
- 带管理密钥或编辑密钥的页面只有在完成 URL 密钥迁移、并确认第三方脚本无法读到完整密钥 URL 后，才允许展示第三方广告；否则只能展示自营占位、内部推广或不展示广告。
- 上传预览和高密度个人排期内容区域不放第三方广告，但页面外围可以展示广告。
- 图片内容只发送给配置的 AI provider，并且只用于生成本次可编辑预览。
- 用户必须主动选择观看激励广告；不能把广告伪装成继续按钮，也不能把广告插入无关流程。
- 不能承诺点击广告获得更多额度，也不能诱导点击广告。
- 上线前需要按目标地区和广告平台政策确认 rewarded ad 是否适用于网页、学生场景和匿名用户。
- 隐私说明页需要补充常驻广告 SDK、rewarded ad、奖励验证、额度记录、AI provider、广告 cookie、第三方供应商和个性化广告退出方式的公开说明。
- 如果进入需要 cookie / consent 管理的地区，需要在上线前补充同意、拒绝和撤回机制。
- 真实广告只在生产域名启用；本地开发、Preview 部署、自动化测试和内部 QA 必须关闭真实广告或使用测试模式。

## 风控和成本护栏

- 对常驻广告记录页面类型、展示位置、展示次数、估算收入、CLS 和提交转化影响。
- 对常驻广告做位置禁用清单，先保护表单、时间格、上传预览、提交按钮、复制/导出按钮和可能泄露密钥的 URL。
- 对异常展示、异常刷新、异常点击和可疑流量做监控，避免广告账号被限制。
- 对站长自测、自动化测试、Preview 流量和内部 QA 流量默认禁用真实广告，减少无效流量风险。
- 对带密钥页面建立第三方脚本检查，把 `?key=` 页面加载外部广告脚本作为上线阻断项。
- 监控 `/ads.txt` 是否能被生产域名访问，以及广告后台是否识别为已授权库存。
- 对匿名 session、IP、日程和全站分别做频率限制。
- 对广告事件做防重放：同一个 `reward_event_id` 只能发放一次额度。
- 对 OpenAI provider 设置超时、图片大小限制和总成本限额。
- 识别失败要区分可退款失败和不可退款结果，避免用户重复刷退款。
- 记录每次识别的估算成本、置信度、用户最终是否提交，以及提交前修改比例。
- 当全站成本超过阈值、广告填充率过低、无效流量升高或 OpenAI key 异常时，自动关闭广告换额度。

## 指标

上线小流量实验时，至少观察：

- 常驻广告曝光、可见率、Page RPM、广告加载失败率和广告拦截比例。
- 常驻广告对创建率、填写完成率、提交耗时和移动端滚动/遮挡的影响。
- 真实广告是否误出现在本地、Preview、自动化测试、内部 QA 或带 `?key=` 的页面。
- `/ads.txt` 可访问性、广告后台授权状态和广告审核状态。
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
2. 审核准备阶段：基础 `/about`、`/terms`、`/privacy`、`robots.txt`、`sitemap.xml` 和 `/ads.txt` 已接入；继续补法律审阅、联系方式、广告版隐私披露、publisher / slot ID 和生产域名白名单。
3. 常驻广告试水阶段：默认全站外围广告框架已接入且关闭。真实广告开启时，核心操作页只启用顶部、底部、桌面 rail 或移动 anchor；结果页、提交成功页和说明页可以增加内容间广告。带 `?key=` 页面只允许 `off` 或 `internal`。
4. 密钥安全阶段：如果要在管理/编辑页展示第三方广告，先把 URL 密钥迁移到不暴露给第三方脚本的机制，并增加第三方脚本检查。
5. 免费额度阶段：做本机或匿名 session 的少量免费图片识别额度和全站限额，不接 rewarded ad。
6. 小流量激励广告阶段：接入 rewarded ad provider，使用服务端验证发放额度，并保留手动 fallback。
7. 动态兑换阶段：按真实 eCPM、填充率、AI 成本和风控情况调整 1 广告换 1 次或多广告换 1 次。
8. 组织者增值阶段：只有在真实用户证明有高频组织需求后，再考虑移除广告、品牌页、群组、批量活动、付费额度或会员。

## 打开条件

公开开放常驻广告前，至少需要满足：

- 广告平台账号、站点审核、广告位置和政策要求已经确认。
- 公开首页、`/about`、`/privacy`、`/feedback`、`/terms`、`robots.txt`、`sitemap.xml` 和 `/ads.txt` 已能从生产根域访问；拿到 publisher ID 后 `/ads.txt` 返回正式记录。
- 生产环境有 `NEXT_PUBLIC_DISPLAY_ADS_ENABLED`、`NEXT_PUBLIC_DISPLAY_ADS_PROVIDER`、`NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS`、`NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE`、`NEXT_PUBLIC_DISPLAY_ADS_TEST_MODE` 和必要的 AdSense client / slot ID；`deployment:config` 不报错。
- 创建、填写、编辑、上传预览和密钥页面可以有外围广告，但不会被广告遮挡、诱导误触或泄露完整密钥 URL；带 `?key=` 页面不加载第三方广告脚本。
- 隐私说明已经补充广告平台、广告请求数据、广告 cookie、个性化广告退出方式和用户同意/拒绝规则。
- 有创建率、填写完成率、广告收入、广告加载失败和布局稳定性监控。
- 本地、Preview、自动化测试、站长自测和内部 QA 不会产生真实广告请求。

公开开放广告换图片识别前，至少需要满足：

- `OPENAI_API_KEY` 已在生产环境配置并通过真实样本调优。
- `AI_IMAGE_IMPORT_ENABLED=true` 和 `AI_IMAGE_IMPORT_RELEASE_MODE=public` 只在最后开放时设置；当前代码仍会阻断 public，必须在额度账本、广告验证和成本护栏实现后再专门提交解除阻断。
- 有 `AiRecognitionCreditGrant` 和 `AiRecognitionAttempt` 账本，额度消耗是原子的。
- 广告完成事件通过服务端验证，不能只信任前端回调。
- 隐私说明已经补充广告和 AI provider 数据处理边界。
- 有全站开关、每日成本上限、单日程上限和紧急关闭流程。
- 手动填写、文本导入、CSV/ICS 导入在广告关闭时仍可正常使用。

## 参考资料

- Google AdSense Auto ads：`https://support.google.com/adsense/answer/9261805`
- Google AdSense ad placement policies：`https://support.google.com/adsense/answer/1346295`
- Google AdSense Program policies：`https://support.google.com/adsense/answer/48182`
- Google AdSense required privacy policy content：`https://support.google.com/adsense/answer/1348695`
- Google AdSense ads.txt guide：`https://support.google.com/adsense/answer/12171612`
- Google Publisher Tag rewarded ad sample：`https://developers.google.com/publisher-tag/samples/display-rewarded-ad`
