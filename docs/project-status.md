# 项目状态基线

更新日期：2026-08-03

## 当前阶段

项目已经从纯架构骨架推进到“海外网页版 MVP 主链路已实现，已通过 `https://schedule.tonimakes.com`
正式域名在 Vercel 生产部署上跑通 API smoke test”的阶段。

当前部署决策已经补充到 `docs/adr/0007-hosting-database-and-domain.md`：MVP 优先使用 Vercel + Neon Postgres Singapore，并通过 `https://schedule.tonimakes.com` 对外访问。

下一阶段的产品差异化决策已经补充到 `docs/adr/0008-availability-import-and-templates.md` 和 `docs/adr/0009-multiple-availability-entry-methods.md`：优先把课表/排班导入、登录用户长期可用模板、When2meet 风格手动拖拽网格和 Doodle/Rallly 风格候选时间投票纳入“多种可用时间添加方式”策略。除手动拖拽外，这些能力只生成预填建议，不绕过用户确认，也不替代当前匿名主流程。

常驻展示广告、AI 图片识别成本控制和激励广告换额度方案已经补充到 `docs/monetization.md`。当前已接入默认关闭的常驻广告位框架、`/ads.txt` 路由、配置预检、真实广告上线硬闸门、广告/AI 基础隐私披露、公开支持邮箱入口、公开运营主体展示，以及 AI 额度账本数据库、服务层、只读额度状态 API 和 `image_import` 强制额度校验开关；Vercel Production/Preview 已配置 `NEXT_PUBLIC_SUPPORT_EMAIL=hello@tonimakes.com`、`NEXT_PUBLIC_SITE_OPERATOR_NAME=Toni Liu` 和 `NEXT_PUBLIC_SITE_OPERATOR_REGION=Australia`，生产 `/contact`、`/about`、`/privacy`、`/terms` 和 `/zh/contact` 已验证能显示公开邮箱或运营主体；真实广告和图片识别公开入口仍未开放。常驻广告默认每个页面尽量保留外围广告位，但避开核心操作区和密钥泄露风险；图片识别后续通过免费额度、用户主动触发的 rewarded ad、额度账本、失败退款和全站成本护栏控制成本；组织者侧保留移除广告、自定义品牌、群组和批量活动等后续增值方向。

数据保留目前处于“自动清理链路已接入并在生产环境验证通过”的阶段：新日程默认带 90 天 `expires_at`，数据库有按过期时间查询的索引，组织者可手动归档；新增 `/api/maintenance/cleanup-expired-schedules` 受 `CRON_SECRET` 保护的维护 API 和 Vercel Cron，每天自动归档过期日程，并在归档宽限期后硬删除。Vercel Production/Preview 已配置 `CRON_SECRET` 并重新部署；未授权访问返回 `401`，带授权手动调用已返回 `200` 和归档/删除统计。日程增多主要增长 Neon Postgres 存储，而不是 Vercel 运行内存；公开推广前还需要补生产 cron 日志巡检、备份保留和删除失败监控。

中英双语已从“只有导入解析支持部分英文时间表达”推进到“英文作为默认公开入口、中文迁移到 `/zh` 专属入口”的阶段：`/`、`/about`、`/privacy`、`/contact`、`/feedback`、`/terms`、`/new`、`/s/:publicId`、`/s/:publicId/edit/:participantId` 和 `/s/:publicId/manage` 现在是英文主流程；`/zh`、`/zh/new`、`/zh/about`、`/zh/privacy`、`/zh/contact`、`/zh/feedback`、`/zh/terms`、`/zh/s/:publicId`、`/zh/s/:publicId/edit/:participantId` 和 `/zh/s/:publicId/manage` 保留中文入口；旧 `/en/...` 路径会兼容重定向到新的英文根路径。公开日程的开放网格填写、手动涂选、结果热力图、候选投票填写、候选投票结果面板、图片/文本/CSV/ICS/模板预填面板、普通可用时间编辑、候选投票编辑，以及组织者侧分享链接、管理操作、结果摘要、较优时间槽、候选结果、最终时间确认和导出/复制入口已有英文主流程。图片识别入口仍受 `AI_IMAGE_IMPORT_ENABLED` / release mode / 额度闸门控制，公开环境默认不展示；语言切换会写入本地语言偏好，但根路径不再按偏好自动跳转，当前 API 错误码也已有中英文兜底文案。完整 i18n 字典、更多深层组件文案抽离和更广生产 smoke 覆盖仍未完成。

当前本机限制：

- 本机未安装 Docker。
- 本机未安装 `psql` 或 `pg_isready`。
- 本地数据库辅助命令仍不能直接使用，但已经可以通过托管 Neon Postgres 跑通真实数据库写入链路。

## 已完成能力

- 创建日程页面和 API。
- 公开日程详情页和 API。
- API 错误码共享列表和文档一致性测试。
- API JSON 请求解析和校验统一封装。
- API route 错误边界统一封装。
- API route 动态参数和访问密钥读取统一封装。
- API route 数据库仓库创建统一封装。
- API client JSON 请求、错误映射和响应解析统一封装。
- 服务端日程路径参数校验统一封装。
- 服务端组织者和参与者访问密钥校验统一封装。
- 可选 `APP_BASE_URL`，用于生产环境生成稳定分享、管理和编辑链接。
- 参与者提交可用时间。
- 参与者使用编辑密钥查看和修改自己的提交。
- 组织者管理页。
- 组织者锁定日程。
- 组织者归档日程。
- 组织者导出 CSV、全员可用时间 `.ics` 和已确认最终时间 `.ics` 日历文件。
- 健康检查 API：`GET /api/health`。
- Postgres schema、初始 migration 和数据库自检：`corepack pnpm db:setup`、`corepack pnpm db:check`。
- Neon pooled runtime URL 和 direct migration URL 分离配置：`DATABASE_URL`、`DATABASE_MIGRATION_URL`。
- 根目录 `corepack pnpm dev` 自动读取 `.env.local` 后启动 Web 服务。
- 托管 Neon Postgres Singapore 已完成 migration 和 schema 自检。
- API smoke test：`corepack pnpm smoke:api`。
- 使用本地 Web 服务 + Neon Postgres 跑通 API smoke test。
- Vercel project `schedule-share` 已创建并完成 production 部署。
- Vercel 生产临时域名 `https://schedule-share-lime.vercel.app` 已通过健康检查和完整部署验证。
- Vercel 环境变量已设置 `DATABASE_URL` 和 `DATABASE_MIGRATION_URL` 到 Production、Preview。
- Vercel 环境变量已设置 `APP_BASE_URL=https://schedule.tonimakes.com` 到 Production、Preview。
- Neon 数据库密码已轮换，本地 `.env.local` 和 Vercel Production/Preview 环境变量已更新。
- Vercel monorepo 部署配置：`vercel.json`、`.vercelignore`。
- `schedule.tonimakes.com` 已完成 DNS CNAME 配置、Vercel 验证和 production alias。
- 部署配置预检：`corepack pnpm deployment:config`。
- 根目录脚本 lint：`corepack pnpm lint:scripts`。
- 部署配置检查逻辑测试：`corepack pnpm test:scripts`。
- 部署验证编排：`corepack pnpm verify:deployment`，包含数据库检查、健康检查、公开说明页和 API smoke test。
- 环境变量模板和配置说明：`.env.example`、`docs/environment.md`。
- 命令行脚本自动读取本地 `.env.local` / `.env`。
- 隐私与数据保留说明草案：`docs/privacy.md`、`/privacy`，已补广告 cookie、第三方广告技术、无效流量防护和 AI 图片识别处理边界的基础披露。
- 日程生命周期基础字段和自动清理任务：新日程默认 90 天 `expires_at`，数据库有过期时间索引，组织者可手动归档日程；`vercel.json` 已配置每日调用受 `CRON_SECRET` 保护的维护 API，自动归档过期日程，并在归档宽限期后硬删除 archived 日程。
- 公开联系、反馈与删除请求说明：`docs/feedback.md`、`/contact` 和兼容 `/feedback`，已通过 `NEXT_PUBLIC_SUPPORT_EMAIL=hello@tonimakes.com` 配置公开支持邮箱并在生产验证可见。
- 公开运营主体展示：`NEXT_PUBLIC_SITE_OPERATOR_NAME=Toni Liu` 和 `NEXT_PUBLIC_SITE_OPERATOR_REGION=Australia` 已配置到 Vercel Production/Preview，并接入 About、Privacy、Terms、Contact 和 Feedback 页面；生产 `/contact`、`/about`、`/privacy`、`/terms` 和 `/zh/contact` 已验证可见。
- 英文公开审核资产、创建入口、公开日程入口、参与者编辑入口和组织者管理入口：英文主入口已从 `/en/...` 切换到根路径 `/`、`/new`、`/about`、`/privacy`、`/contact`、`/feedback`、`/terms`、`/s/:publicId`、`/s/:publicId/edit/:participantId` 和 `/s/:publicId/manage`；中文入口迁移到 `/zh/...`；旧 `/en/...` 路径保留兼容重定向。公开日程英文入口已覆盖开放网格手动填写、基础结果热力图、候选投票填写和候选投票结果面板；编辑英文入口已覆盖普通可用时间和候选投票修改，并会在英文提交成功后记住 `/s/.../edit/...` 编辑链接；组织者英文入口已覆盖分享链接、管理操作、开放网格结果摘要、较优时间槽、候选投票结果、最终时间确认、导出和复制入口，英文创建页生成的组织者链接会指向 `/s/.../manage`。sitemap 和 robots 已允许英文根路径公开说明/创建页面与 `/zh/...` 中文公开页面，动态日程页继续不进入 sitemap。
- GitHub Actions CI：format、脚本和 workspace lint、typecheck、test、build。
- 多种可用时间添加方式的产品规格：`docs/availability-entry-methods.md`。
- 多种可用时间添加方式的领域、API、隐私和架构边界文档。
- `packages/core` 中的 `AvailabilityDraft`、`ImportedBusyBlock` 和忙碌时间块求差集预填逻辑。
- `POST /api/schedules/:publicId/availability-preview` 的 `text_import` JSON 预览 API。
- 参与者填写页和开放网格编辑页的文本粘贴预填入口，支持简单中英文星期、明确日期、英文月份日期、日期/星期逗号上下文、无年份月日、12 小时制和同日多时间段续写。
- 文本粘贴导入支持中文上午/下午写法、英文 `from 9 to 11 on Monday`、`between 9 and 11 on Monday`、`noon-1pm`、`midnight to 1am`、`6 to 7pm`、`9am until 11am`、`2pm till 4pm`、`9am for 2 hours`、`14:30 for 90 min` 自然句、英文月份日期、`Mon, 9-11` 日期/星期逗号上下文、列表/编号和 `Busy:`/`忙碌:` 状态前缀归一化、tab 或逗号分隔课表/排班表格、Markdown 表格、复制自合并日期表头的多行表头、日期/星期 + 时间的双层表头、`Start/End` 拆分表头行、左右并排区域各自独立 `Time/时间` 列的课表、导出标题行后的 `Date/Start/End/Title`、`Date/Time/Title`、`Day/Time/Activity`、`Day of Week/Period/Activity` 这类行式排班表格、空白日期/时间单元格上一行继承、独立 `Notes/备注` 列纯备注续行、常见导出标题/汇总/页脚/说明行跳过、带明确钟点的课程节次行，以及无明确钟点课程节次按用户粘贴的自定义节次表、裸数字自定义节次定义、`Period/节次` 列裸 `1-2` 范围或默认作息表换算并提示复核。
- `POST /api/schedules/:publicId/availability-preview` 的 `image_import` multipart 图片预览 API。
- 图片课表/排班导入的 PNG、JPEG、WebP 文件类型限制、4MB 大小限制和 OpenAI provider 适配器。
- 参与者填写页和开放网格编辑页的图片上传预填代码路径；`OPENAI_API_KEY` 只是 provider 凭证，当前还有 `AI_IMAGE_IMPORT_ENABLED`、`AI_IMAGE_IMPORT_RELEASE_MODE`、内测 token、上传大小、超时、输出 token、置信度、单次估算成本、单次成本上限、每日请求上限、每日预算和 `AI_IMAGE_CREDITS_ENFORCED` 额度强制校验等运行时闸门；公开模式在代码层阻断，公开前端入口默认隐藏，直到广告验证、动态成本护栏和公开入口验收完成。
- `POST /api/schedules/:publicId/availability-preview` 的 `ics_import` multipart 日历文件预览 API，支持单个 `.ics` 文件、1MB 限制、基础 `VEVENT`、`VFREEBUSY` 忙闲区间、UTC/`TZID` 时间、常见 Windows 时区别名、`DTSTART` + `DURATION`（含周、日、时、分、秒，秒级时长向上折算到分钟）、`FREEBUSY` 的 `start/end` 与 `start/duration` 区间、全天事件（含缺少 `DTEND` 的 date-only `DTSTART`）、常见每日 `RRULE`、常见每周 `RRULE`、常见月度 `RRULE`（含 `BYMONTH` 指定月份和 `BYSETPOS` 位置过滤）、常见年度 `RRULE`（含 `BYSETPOS` 位置过滤）、`COUNT` / `UNTIL` 有限重复、`RDATE` 额外日期或 `VALUE=PERIOD` 额外时段、`EXDATE` 例外日期和同 `UID` 的 `RECURRENCE-ID` 单次取消/改期。
- 参与者填写页和开放网格编辑页的 `.ics` 日历文件预填入口；日历文件只生成可编辑草稿，不保存原文件。
- `POST /api/schedules/:publicId/availability-preview` 的 `csv_import` multipart CSV 文件预览 API，支持单个 `.csv` 文件、1MB 限制、“时间 x 星期/日期列”课表/排班 CSV、复制自合并日期表头的多行表头、日期/星期 + 时间的双层表头、`Start/End` 拆分表头行、左右并排区域各自独立 `Time/时间` 列的 CSV、多种常见行式排班 CSV 表头、导出标题行跳过、常见导出标题/汇总/页脚/说明行跳过、单列时间范围表头、`Period/节次` 课程节次表头裸 `1-2` 范围、自定义节次表、空白日期/时间单元格上一行继承和独立 `Notes/备注` 列纯备注续行。
- 参与者填写页和开放网格编辑页的 CSV 文件预填入口；CSV 文件只生成可编辑草稿，不保存原文件。
- 参与者填写页和开放网格编辑页的统一预填反馈条：文本、图片、`.ics`、CSV 和模板预填会显示来源、忙碌段数、可用时间数、置信度、需复核状态、常见 warnings 中文提示和逐条识别出的忙碌时间明细。
- 参与者填写页和编辑页的共享手动时间格组件，支持点按选择、拖拽涂选、反向清除、每天全选/清空、总进度、每日已选计数、日期快速跳转、移动端两列布局和基础群体热力强度。
- 参与者填写页会在本机浏览器记住上次成功提交或编辑的显示名称，并在下次填写时预填姓名。
- 公开日程页会在本机浏览器按日程记住当前参与者的编辑链接，并在同一浏览器再次打开日程时显示“打开编辑”和“复制”入口。
- 参与者填写页和开放网格编辑页会在本机浏览器记住上次成功使用的每周模板星期和时间段，并支持保存、选择和删除多个本机每周模板。
- 创建页会在本机浏览器记住上次成功创建日程时使用的模式、时区、时间粒度和开放网格时间范围，并在下次创建时预填。
- 开放网格公开页和管理页的只读结果热力图，支持按日期分组、可用人数、峰值时间格、重合比例、全部/有人可用/只看峰值筛选和长日期默认折叠。
- `packages/core` 中的每周可用模板投影逻辑，支持模板时区、跨日窗口和完整时间格匹配。
- `POST /api/schedules/:publicId/availability-preview` 的 `template` 内联模板预览 API。
- 参与者填写页和开放网格编辑页的每周模板预填入口，支持选择星期和起止时间后生成本次日程可用时间草稿，并在本机浏览器记住上次成功使用的模板控件值，也可保存、选择和删除多个本机模板。
- `schedule_mode`、`candidate_time_options`、`candidate_vote_response`、`candidate_votes` 和 `candidate_votes.preference_rank` 数据库结构及 migration。
- AI 图片识别额度账本数据库结构、migration、服务层和只读状态 API：`ai_recognition_credit_grants`、`ai_recognition_attempts`、`rewarded_ad_verifications`，`apps/web/src/server/ai-credits.ts` 的额度状态汇总、发放、原子消耗、成功标记、失败标记、退款和广告验证事件去重方法，以及 `GET /api/ai-credits/status?schedulePublicId=...` 的日程 scope 额度状态查询；`image_import` 已在 `AI_IMAGE_CREDITS_ENFORCED=true` 时按日程 scope 先扣额度，成功后标记 succeeded，provider 不可用或内部失败时退款，低置信度只标记 `low_confidence` 不自动退款；当前尚未实现免费额度自动发放、广告服务端验证、动态成本计数或前端兑换入口。
- 创建页的候选时间投票模式，支持组织者添加明确候选时间。
- 参与者页和编辑页的三态候选投票 v1，支持对每个候选项选择方便、也许或不方便，并可为方便/也许的候选项通过按钮或拖拽设置偏好顺位；`available` 继续复用现有提交、编辑、汇总、锁定、归档和导出链路。
- 公开日程页和管理页的候选投票专门结果视图，支持最佳候选、排序依据、综合支持度、每项支持率、候选项洞察、缺口标签、对比最佳分析、方便名单、也许名单、不方便/未选择名单、首选名单和平均偏好顺位展示；公开英文入口 `/s/:publicId` 和组织者英文入口 `/s/:publicId/manage` 的候选投票结果面板已接入英文文案，中文入口为 `/zh/s/:publicId` 和 `/zh/s/:publicId/manage`。
- `packages/core` 中的候选投票综合排序逻辑，默认按 `available = 1`、`maybe = 0.5` 计算决策分；综合分相同时依次优先确定可用人数更多、也许人数更多、首选人数更多、平均偏好顺位更靠前的候选。
- `GET /api/schedules/:publicId/export?format=ics` 组织者日历导出 API，按全员可用连续时间段生成 `VEVENT`，支持通过 `startUtc` / `endUtc` 精确导出其中某一段，并支持通过 `target=final-time` 导出已确认最终时间。
- 管理页支持同时下载 CSV 结果、`.ics` 全员可用时间日历文件、单个全员可用时间段 `.ics`，以及确认后的最终时间 `.ics`。
- `POST /api/schedules/:publicId/final-time` 组织者确认最终时间 API；开放网格确认时间必须来自全员可用连续时间段，候选投票确认时间必须来自组织者预设候选时间，确认后会保存最终时间并锁定日程。
- 公开页和管理页会展示已确认最终时间，管理页可从全员可用时间段中直接“设为最终”。
- 候选投票管理页可从候选项中直接“设为最终”，也可逐条复制候选时间、投票摘要、缺口摘要和对比最佳摘要，并保留方便、也许和不方便名单辅助组织者决策。
- 管理页支持重新查看并复制公开填写链接和管理链接；浏览器不允许自动复制时会提示手动选中链接。
- 公开页和管理页的开放网格结果会同时展示全员可用时间和按可用人数排序的当前较优时间槽；较优时间槽会显示可用人数比例、方便名单和未选此时间名单。
- 管理页支持复制结果摘要：开放网格会优先列出全员可用时间段，没有全员共同时间时列出当前较优时间格；候选投票会列出当前最佳候选、综合支持度、首选人数和平均偏好顺位。摘要不包含管理密钥。
- 管理页开放网格的当前较优时间槽支持逐条复制，复制内容包含日程标题、备选时间、可用人数比例、方便名单和未选此时间名单，不包含管理密钥。
- 默认关闭的常驻展示广告位框架：`DisplayAd` / `AdPageChrome` 已接入首页、创建页、公开日程页、管理页、编辑页、关于页、隐私页、反馈页和使用条款页；创建、填写、编辑等核心操作区不插广告，管理/编辑密钥页不加载第三方广告脚本。
- 广告审核基础公开资产：英文根路径 `/`、`/about`、`/privacy`、`/contact`、`/feedback`、`/terms`、中文 `/zh/...` 公开页、`/robots.txt` 和 `/sitemap.xml` 已接入；首页 footer 已连接关于、隐私、联系、条款和中文入口。
- 公开隐私和条款披露已补充：真实广告当前关闭、广告平台可能使用 cookie / web beacon / IP / 设备 / 浏览器 / 页面 URL / 展示互动数据、普通广告不发放奖励、不要诱导广告点击、图片识别只生成可编辑预览且公开模式继续受闸门阻断。
- `/ads.txt` 路由已接入；Vercel Production/Preview 已设置 `ADS_TXT_PUBLISHER_ID=pub-1161635953139243`，根域和日程子域当前都能返回同一正式 publisher 记录；`verify:deployment` 会在设置该变量时检查日程应用 `/ads.txt`。
- 部署配置预检已覆盖常驻展示广告：真实 AdSense 开启时必须配置公开支持邮箱、公开运营主体、`ADS_TXT_PUBLISHER_ID`、隐私披露确认、广告政策审阅确认、consent 策略确认、client、slot、生产域名白名单，并阻断 `NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE=full` 和生产 test mode。
- GitHub 远程仓库 `https://github.com/isToniLiu/schedule-share.git` 已接入，本地 `main` 已推送到 `origin/main`。
- Vercel project 已连接 GitHub 仓库 `isToniLiu/schedule-share`，后续 push 到 `main` 可触发自动部署。
- 常驻展示广告、AI 图片识别成本与激励广告换额度方案文档：`docs/monetization.md`。

## 代码结构

```text
apps/
  web/          Next.js Web 应用、API routes、页面和服务端用例
packages/
  core/         时间格生成、可用时间统计、领域错误
  db/           Drizzle schema、migration、数据库连接和自检脚本
  api-client/   前后端共享 API 契约和客户端
docs/
  adr/          架构决策记录
scripts/        本地和部署验证脚本
```

## 当前验证基线

本轮代码验证通过：

```powershell
corepack pnpm format
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm db:setup
```

当前测试总数：507。

真实数据库验证：

- `corepack pnpm db:setup` 已对 Neon Postgres Singapore 执行 migration。
- `corepack pnpm db:check` 已确认 `pgcrypto`、`schedule_status`、`schedule_mode`、`candidate_vote_response`、`schedules`、`participants`、`availability_slots`、`candidate_time_options`、`candidate_votes` 存在，并额外确认 `candidate_votes.preference_rank`、`schedules.final_start_utc` 和 `schedules.final_end_utc` 三列存在。
- 本轮 candidate preference rank 迁移已应用到数据库，并保留 final time 两列自检。
- `corepack pnpm smoke:api` 已通过真实数据库跑通创建、提交、编辑、锁定、锁定后拒绝修改和归档。
- 远程 `https://schedule-share-lime.vercel.app/api/health` 已返回 `database: "ok"`。
- 远程 `verify:deployment` 已通过 `/api/health`、`/privacy`、`/feedback` 和 API smoke test。
- 正式域名 `https://schedule.tonimakes.com/api/health` 已返回 `database: "ok"`。
- 正式域名 `verify:deployment` 已在数据库密码轮换前后通过 `/api/health`、`/privacy`、`/feedback` 和 API smoke test。

浏览器预览验证：

- `http://127.0.0.1:3000/new` 可打开。
- 未配置数据库时，创建页会显示“暂时无法保存日程”。
- 管理页错误态可打开，无横向溢出。
- 归档和导出 API 在未配置数据库时返回 `DATABASE_UNAVAILABLE`。
- 本地临时日程已验证每周模板预填：默认周一到周五 18:00-21:00 模板会在周一 18:00-22:00 日程中选中前三个 60 分钟时间格，21:00-22:00 保持未选中；临时日程已归档。
- 本地参与者每周模板记忆已验证：`participant-template-memory` 单元测试覆盖最近一次模板读写、多模板保存/更新/删除、星期排序去重、无效时间清理、坏 JSON 清理、重复 ID 去重、数量上限和浏览器 storage 不可用降级；浏览器中成功使用模板预填后，再打开新的参与者填写页会自动带回上次的星期和时间段。本地临时本机模板日程已验证：参与者页可把默认“工作日晚上”保存到本机，刷新后可在“保存的本机模板”中选择套用，模板预填显示“模板预填已应用到时间格”、中文范围 warning 和 `3/4` 已选；测试后本机模板已删除，临时日程已归档。
- 本地临时候选投票日程已验证：`candidate_poll` 创建成功，参与者选择 Option A 后，详情 API 返回 1 名参与者、Option A 为 `1/1` 可用，Option B 为 `0/1` 可用；临时日程已归档。
- 本地临时三态候选投票日程已验证：两位参与者分别提交 `available/maybe/unavailable` 后，公开页和管理页均显示 `1/2 可用 · 1 也许`、方便名单、也许名单和不方便/未选名单；编辑页能恢复并保存 Ada 的三态投票，保存后 Option C 正确变为 `0/2 可用 · 1 也许`；临时日程已归档。
- 本地临时候选投票综合排序日程已验证：三位参与者投票后，公开页候选结果按 Option B、Option C、Option A 排序，分别显示 `综合支持 67%`、`综合支持 50%`、`综合支持 33%`；临时日程已归档。
- 本地临时候选投票偏好顺位日程已验证：三位参与者投票后 Option A 和 Option B 均为 `1/3 可用 · 2 也许`，Option B 因首选人数 `2`、平均顺位 `1.3` 在候选结果面板排到 Option A 前，并在公开页显示 `排序依据：首选人数领先（2 对 1）` 和候选项洞察 `所有参与者至少可接受（1 方便 · 2 也许）`；CSV 导出包含候选名称、首选人数、平均偏好顺位和首选参与者列；重复偏好顺位提交返回 `400 VALIDATION_ERROR`；浏览器中参与者表单可自动显示 `偏好 #1/#2`，点击“提高 Option B 的偏好顺位”后顺位交换并可成功提交；当前参与者表单已验证拖拽 Option B 到 Option A 前会交换为 `偏好 #1/#2` 并保持可提交；临时日程已归档。
- 本地候选投票管理页逐条复制已验证：两位参与者提交 `available/maybe/unavailable` 和偏好顺位后，管理页显示 2 个“复制此候选”按钮；点击 Option B 后自动化浏览器拦截剪贴板时显示“无法自动复制，可手动选中文本。”降级提示和精确候选文本，内容包含候选名、时间、`1/2 可用 · 1 也许`、`综合支持 75%`、首选名单、方便名单和也许名单，未发现管理密钥外泄；临时日程已归档。
- 本地临时候选投票缺口标签日程已验证：三位参与者对两个候选分别形成 1 人方便、1 人也许、1 人不方便/未选后，公开页和管理页均显示 `1 人不方便/未选`、`还差 2 人确定方便`、`1 人也许` 和 `1 人首选` 缺口标签；管理页保留“复制此候选”入口；临时日程已归档。
- 本地临时候选投票对比最佳分析已验证：三位参与者投票后 Option B 成为最佳，Option A 在公开页和管理页均显示 `对比最佳`、`综合支持少 16 个百分点`、`新增方便：Lin`、`流失方便：Grace`、`首选转入：Ada` 和 `首选落后：Grace`；管理页保留 2 个“复制此候选”按钮，复制文本对比摘要由专项测试覆盖；临时日程已归档。
- 本地临时文本表格导入日程已验证：`text_import` 预览可从 tab 分隔表格读取 `Time x Sat` 忙碌单元格，返回 `COMP101 (Sat 09:00-10:00)`、置信度 `0.7` 和剩余两个可用时间格；临时日程已归档。
- 本地临时导入样本增强日程已验证：`text_import` 可通过 API 解析逗号分隔 `Time,Sat,Sun` 课表粘贴，`csv_import` 可通过 multipart API 解析 `Day of Week,Shift Start,Shift End,Activity` 这类真实导出表头；临时日程已归档。
- 本地文本/CSV 单列时间范围导入已验证：`text_import` 可解析 `Date,Time,Title` 和 `Day,Time,Activity` 这类粘贴表格，`csv_import` 可解析 `Date,Time,Title` 和 `Day of Week,Time,Activity` 这类 CSV 导出；专项测试覆盖单列时间范围、日期/星期上下文、英文 am/pm 和 CSV 置信度；本地临时日程通过 `availability-preview` API 验证 `Date,Time,Title` 文本和 CSV 均返回 1 段忙碌、2 个可用时间格且无 warnings；临时日程已归档。
- 本地合并单元格式导入已验证：文本粘贴和 CSV 上传均支持行式表格中空白日期或空白时间继承上一行上下文，专项测试覆盖 `Date,Time,Title` 中第二行空白日期、第三行空白日期和时间的复制形态；本地临时日程通过 `availability-preview` API 验证文本和 CSV 均返回 3 段忙碌、2 个可用时间格且无 warnings；临时日程已归档。
- 本地备注续行导入已验证：文本粘贴和 CSV 上传均支持行式表格独立 `Notes/备注` 列里的纯备注续行追加到上一段忙碌说明；专项测试覆盖文本、CSV 和带引号换行备注的 CSV 单元格；本地临时日程通过 `availability-preview` API 验证文本和 CSV 均返回 2 段忙碌、2 个可用时间格且无 warnings；临时日程已归档。
- 本地表格区域导入增强已验证：文本粘贴和 CSV 上传均支持复制自合并日期表头的多行表头，并能把空白日期表头列继承到同一天；行式表格前多一行导出标题时会跳过标题行；专项测试覆盖文本和 CSV 两类输入；本地临时日程通过 `availability-preview` API 验证文本和 CSV 均返回 5 段忙碌、4 个可用时间格且无 warnings；临时日程已归档。
- 本地日期/时间双层表头导入已验证：文本粘贴和 CSV 上传均支持 `Day/Date` 行在上、`Time` 行在下、实际活动在数据行里的课表/排班导出格式；表头里的时间会直接作为单元格忙碌时间，并避免在来源标签里重复显示；专项测试覆盖文本和 CSV 两类输入；本地临时日程通过 `availability-preview` API 验证，文本粘贴返回 `COMP101` 与 `Lab` 2 段忙碌、8 个可用时间格且 0 warnings，CSV multipart 上传返回 `Briefing` 与 `Lab` 2 段忙碌、8 个可用时间格、confidence `0.75` 且 0 warnings；临时日程均已归档。
- 本地 `Start/End` 拆分表头行导入已验证：文本粘贴和 CSV 上传均支持 `Date`、`Room`、`Start`、`End` 等多行表头在上、实际活动在数据行里的宽表格式；解析器会把同一列的开始和结束时间合并为忙碌区间，并把地点等非时间表头保留在来源标签里；专项测试覆盖文本和 CSV 两类输入；本地临时日程通过 `availability-preview` API 验证，文本粘贴和 CSV multipart 上传均返回 `Briefing` 与 `Practical` 2 段忙碌、8 个可用时间格且 0 warnings，CSV confidence 为 `0.75`；临时日程均已归档。
- 本地跨区域时间列导入已验证：文本粘贴和 CSV 上传均支持左右并排区域各自独立 `Time/时间` 列，避免右侧区域误用左侧时间；专项测试覆盖文本和 CSV 两类输入；本地临时日程通过 `availability-preview` API 验证文本和 CSV 均返回 4 段忙碌、8 个可用时间格且无 warnings；临时日程已归档。
- 本地导出标题/汇总说明/页脚容错已验证：文本粘贴和 CSV 上传会静默跳过 `Schedule for Week 1`、`Summary`、`Generated by ...`、`Total hours`、`Page 1 of 1` 这类常见导出元信息，避免产生无意义 warnings；专项测试覆盖文本和 CSV 两类输入；本地临时日程通过 `availability-preview` API 验证带 `Schedule for Week 1` 标题和 `Summary` 汇总行的文本与 CSV 均返回 `Seminar` 1 段忙碌、2 个可用时间格且 0 warnings，CSV confidence 为 `0.75`；临时日程已归档。
- 本地文本列表前缀导入已验证：自由文本粘贴支持 `- Busy: ...`、`2. blocked: ...` 和 `• 忙碌：...` 这类项目符号、编号和状态前缀归一化；专项测试覆盖英文和中文前缀；本地临时日程通过 `availability-preview` API 验证返回 3 段忙碌、28 个可用时间格且无 warnings；临时日程已归档。
- 本地英文自然句时间范围导入已验证：自由文本粘贴支持 `Meeting from 9 to 11 on Monday`、`14 to 16 Lab` 和 `Wed from 6pm to 7pm Shift` 这类带英文 `to` 的时间范围，并继续支持上一段星期上下文复用；专项测试覆盖 12 小时制和上下文复用；本地临时日程通过 `availability-preview` API 验证返回 3 段忙碌、28 个可用时间格且无 warnings；临时日程已归档。
- 本地英文 `between ... and ...` 自然句时间范围导入已验证：自由文本粘贴支持 `Meeting between 9 and 11 on Monday`、`between 14 and 16 Lab` 和 `Wed between 6 and 7pm Shift`，并继续支持上一段星期上下文复用和结束 am/pm 反推开始时间；专项测试覆盖 24 小时制、12 小时制和上下文复用。本地临时日程通过 availability-preview API 验证返回 3 段忙碌、28 个可用时间格且无 warnings，开始时间分别为 `09:00`、`14:00`、`18:00`；临时日程已归档。
- 本地英文省略开始 am/pm 时间范围已验证：自由文本粘贴支持 `Mon 6 to 7pm Dinner`、`9-11am Standup`，会按结束时间的 am/pm 推断开始时间；`Wed 11-12pm Brunch` 保持 `11:00-12:00` 的午前到中午边界；专项测试覆盖晚间推断、上午推断和中午边界。本地临时日程通过 availability-preview API 验证返回 3 段忙碌、29 个可用时间格且无 warnings，开始时间分别为 `18:00`、`09:00`、`11:00`；临时日程已归档。
- 本地开始时间加时长文本导入已验证：自由文本粘贴支持 `Mon 9am for 2 hours Lecture`、`Tue 14:30 for 90 min Lab`、`Thu 10am for 1 hour 30 min Workshop` 和 `周三 下午2点 1.5小时 排班`，会用开始时间加数字时长生成结束时间；专项测试覆盖英文小时、分钟、复合时长和中文小数小时。本地临时日程通过 availability-preview API 验证返回 4 段忙碌、51 个可用时间格且无 warnings，开始/结束时间分别为 `09:00-11:00`、`14:30-16:00`、`14:00-15:30`、`10:00-11:30`；临时日程已归档。
- 本地英文 `noon/midnight` 时间词文本导入已验证：自由文本粘贴支持 `Mon noon-1pm Lunch`、`Tue midnight to 1am Maintenance`、`Wed between 11am and noon Review` 和 `Thu noon for 1 hour Break`；专项测试覆盖普通时间范围、`between ... and ...` 范围和开始时间加时长三条路径。本地临时日程通过 availability-preview API 验证返回 4 段忙碌、52 个可用时间格且无 warnings，开始/结束时间分别为 `12:00-13:00`、`00:00-01:00`、`11:00-12:00`、`12:00-13:00`；临时日程已归档。
- 本地英文 `until/till` 自然句时间范围导入已验证：自由文本粘贴支持 `Mon from 9am until 11am Class`、`2pm till 4pm Lab` 和 `Wed 6pm until 7pm Shift`，并继续支持上一段星期上下文复用；专项测试覆盖 12 小时制和上下文复用；本地临时日程通过 `availability-preview` API 验证返回 3 段忙碌、28 个可用时间格且无 warnings；临时日程已归档。
- 本地英文月份日期导入已验证：自由文本粘贴支持 `Aug 3, 9am-10:30am Work`、`3 Aug, 14:00-16:00 Lab` 和 `September 4, 2026 6pm-7pm Shift` 这类月份在前、日期在前、无年份日期逗号和带年份逗号的英文日期写法；专项测试覆盖默认日程年份、明确年份、12 小时制和日期逗号不拆段；本地临时日程通过 `availability-preview` API 验证返回 3 段忙碌、0 warnings 且日期分别为 `2026-08-03`、`2026-08-03`、`2026-09-04`；临时日程已归档。
- 本地日期/星期逗号上下文文本导入已验证：自由文本粘贴支持 `Mon, 9-11 COMP101, 14-16 Lab` 和 `Monday, Aug 3, 6pm-7pm Dinner` 这类日期或星期后用逗号连接时间段的写法；专项测试覆盖星期逗号续写、同一行后续时间段继承和英文月份日期逗号；本地临时日程通过 `availability-preview` API 验证返回 3 段忙碌、6 个可用时间格且无 warnings，开始/结束时间分别为 `09:00-11:00`、`14:00-16:00`、`18:00-19:00`；临时日程已归档。
- 本地无明确钟点课程节次导入已验证：自由文本、粘贴课表和 CSV 的 `Period/节次` 表头可把 `第1-2节`、`第3-4节`、`1-2 periods` 或节次列裸 `1-2` 按用户粘贴的自定义节次表、裸数字自定义节次定义或默认节次表换算为忙碌时间；仅回退默认节次表时返回复核 warning。专项测试覆盖默认自由文本、默认列式课表、默认行式 CSV、默认裸数字列式课表、默认裸数字行式 CSV、自定义自由文本、自定义列式课表、裸数字自定义节次定义和自定义 CSV。本地临时日程通过 `availability-preview` API 验证 `节次\t周一` / `3-4\t物理` 返回 `10:00-11:40` 一段忙碌、0 个剩余可用时间格、置信度 `0.7` 和 1 条默认作息表复核 warning；本地临时日程通过 multipart `csv_import` API 验证 `Day of Week,Period,Activity` / `Mon,1-2,COMP101` 返回 `08:00-09:40` 一段忙碌、0 个剩余可用时间格、置信度 `0.68` 和 1 条默认作息表复核 warning；本地临时日程通过 `availability-preview` API 验证 `1\t08:30-09:15`、`2\t09:25-10:10` 加 `节次\t周一` / `1-2\t高数` 返回 `08:30-10:10` 一段忙碌、0 个剩余可用时间格、置信度 `0.7` 且无 warnings；本地临时日程通过 multipart `csv_import` API 验证 `Period,Time` / `1,08:30-09:15` / `2,09:25-10:10` 加 `Day of Week,Period,Activity` / `Mon,1-2,COMP101` 返回 `08:30-10:10` 一段忙碌、0 个剩余可用时间格、置信度 `0.75` 且无 warnings；临时日程均已归档。
- 本地临时逗号表格导入页面已验证：参与者页粘贴 `Time,Sat,Sun` 表格后会选中当前日程内的时间格，并把超出当前日程范围的忙碌块 warning 显示为中文；临时日程已归档。
- 本地临时 ICS 日历导入日程已验证：`ics_import` 预览可从 `.ics` 文件读取 `VEVENT` 忙碌事件，返回 `Calendar Busy` 的 `2026-08-01 09:30-10:30` 忙碌块，并把本次 09:00-11:00 日程预填为剩余两个可用时间格；临时日程已归档。
- 本地 ICS `VFREEBUSY` 忙闲区间导入已验证：支持 `FREEBUSY` 的 `start/end` 和 `start/duration` 区间，并会跳过 `FBTYPE=FREE` 空闲段；本地临时日程通过 multipart `ics_import` API 验证隐私忙闲导出返回 `2026-08-01 09:30-10:30` 和 `11:30-12:00` 两段忙碌、5 个可用时间格且无 warnings；临时日程已归档。
- 本地 ICS `DURATION` 推断结束时间已验证：支持 `P1W` 周时长和带秒时长，秒级时长会向上折算到分钟；本地临时日程通过 multipart `ics_import` API 验证 `DTSTART;VALUE=DATE:20260801` + `DURATION:P1W` 返回 `2026-08-01` 至 `2026-08-07` 七段全天忙碌、0 个可用时间格且无 warnings；临时日程已归档。
- 本地 ICS 缺少 `DTEND` 的 date-only 全天事件已验证：`DTSTART;VALUE=DATE:20260801` 会按 RFC 语义推断为一天全日忙碌；本地临时日程通过 multipart `ics_import` API 验证返回 `2026-08-01 00:00-23:59` 一段忙碌、0 个可用时间格且无 warnings；临时日程已归档。
- 本地临时 ICS 有限重复和例外日期日程已验证：`ics_import` multipart 预览可从 `RRULE:FREQ=WEEKLY;COUNT=3` 加 `EXDATE;TZID=Australia/Sydney:20260808T093000` 读取忙碌事件，只返回 `2026-08-01` 和 `2026-08-15` 两段忙碌块，warnings 为空，可用时间格数为 8；临时日程已归档。
- 本地 ICS `RECURRENCE-ID` 单次取消/改期已验证：同 `UID` 的取消事件会从原重复序列排除对应 occurrence；同 `UID` 的改期事件会导入新时间并排除原时间；专项测试覆盖每日取消和每周改期两条路径。本地临时日程通过 multipart `ics_import` API 验证每周重复的 `2026-08-08 09:30-10:30` 原 occurrence 被排除，改期事件 `2026-08-08 11:00-11:30` 被导入，返回 2 段忙碌、45 个可用时间格且无 warnings；临时日程已归档。
- 本地 ICS 月度重复预览已验证：`RRULE:FREQ=MONTHLY` 可在日程日期范围内展开；`BYMONTH=8,12`、`BYMONTHDAY=1,15`、`BYMONTHDAY=-1`、无序号 `BYDAY=MO` 的每月所有周一、`BYDAY=2TU`、`BYMONTH=9;BYDAY=1MO`、`BYDAY=-1FR`、`BYSETPOS=1,-1`、`COUNT`、`INTERVAL`、`UNTIL` 和 `EXDATE` 均有单元测试覆盖；本地临时日程通过 multipart `ics_import` API 验证无序号 `BYDAY=MO` 返回 5 段忙碌、20 个可用时间格且无 warnings，日期为 `2026-08-03`、`2026-08-10`、`2026-08-17`、`2026-08-24`、`2026-08-31`；本地临时日程通过 multipart `ics_import` API 验证 `BYMONTH=8,12;BYMONTHDAY=10` 返回 `2026-08-10`、`2026-12-10`、`2027-08-10` 和 `2027-12-10` 四段忙碌、2064 个可用时间格且无 warnings；本地临时日程通过 multipart `ics_import` API 验证 `BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1,-1` 返回 `2026-08-03`、`2026-08-31`、`2026-09-01` 和 `2026-09-30` 四段忙碌、236 个可用时间格且无 warnings；临时日程均已归档。
- 本地 ICS 年度重复预览已验证：`RRULE:FREQ=YEARLY` 支持同月同日、`BYMONTH`、`BYMONTHDAY`、无序号 `BYDAY` 的每年某月所有指定星期几、顺数/倒数第 N 个星期几的 `BYDAY`、`BYSETPOS` 位置过滤、`COUNT`、`INTERVAL`、`UNTIL` 和 `EXDATE`，并会跳过无效日期；本地临时日程通过 multipart `ics_import` API 验证 `BYMONTH=8;BYMONTHDAY=1` 返回 `2026-08-01`、`2027-08-01`、`2028-08-01` 三段忙碌、1461 个可用时间格且无 warnings；本地临时日程通过 multipart `ics_import` API 验证 `BYMONTH=9;BYDAY=1MO` 返回 `2026-09-07`、`2027-09-06`、`2028-09-04` 三段忙碌、3038 个可用时间格且无 warnings；临时日程均已归档。
- 本地 ICS Windows 时区别名导入已验证：`AUS Eastern Standard Time` 会映射为 `Australia/Sydney`，普通 `VEVENT` 和带同别名 `EXDATE` 的每周重复事件均有专项测试覆盖；本地临时日程通过 multipart `ics_import` API 验证返回 1 段忙碌、4 个可用时间格且无 warnings，忙碌块时区为 `Australia/Sydney`、时间为 `09:30-10:30`；临时日程已归档。
- 本地 ICS 每日重复预览已验证：`RRULE:FREQ=DAILY` 可映射为每周 7 天忙碌块，带 `COUNT` 和 `EXDATE` 的每日重复可展开为具体日期，带 `INTERVAL` 的每日重复会按当前日程日期范围和跨夜缓冲截断；专项测试覆盖三条路径；本地临时日程通过 multipart `ics_import` API 验证 `FREQ=DAILY;COUNT=3` 加 `EXDATE` 返回 `2026-08-01` 和 `2026-08-03` 两段忙碌、14 个可用时间格且无 warnings；临时日程已归档。
- 本地 ICS `RDATE` 额外日期预览已验证：普通 `VEVENT` 可通过 `RDATE` 添加额外发生日期，`EXDATE` 可继续排除这些额外 occurrence；专项测试覆盖多值 `RDATE` 和 `RDATE` 加 `EXDATE` 两条路径；本地临时日程通过 multipart `ics_import` API 验证 `RDATE` 加出 `2026-08-03`、`EXDATE` 排除 `2026-08-05` 后返回 `2026-08-01` 和 `2026-08-03` 两段忙碌、26 个可用时间格且无 warnings；临时日程已归档。
- 本地 ICS `RDATE;VALUE=PERIOD` 额外时段已验证：支持 `start/end` 和 `start/duration` 两种 period 写法，且 `EXDATE` 可继续排除 period 的开始时间；专项测试覆盖 explicit period、duration period 和 period exclusion。本地临时日程通过 multipart `ics_import` API 验证返回 `2026-08-01 09:30-10:30`、`2026-08-03 11:00-12:30` 和 `2026-08-05 09:00-09:45` 三段忙碌、33 个可用时间格且无 warnings；临时日程已归档。
- 本地临时 CSV 导入日程已验证：`csv_import` multipart 预览可从 `Date,Start,End,Title` CSV 文件读取 `CSV Busy` 的 `2026-08-01 09:30-10:30` 忙碌块，返回置信度 `0.75` 和剩余两个可用时间格；浏览器中参与者页已显示“上传 CSV 排班”和“CSV 预填”，未选择文件时按钮禁用；临时日程已归档。
- 本地临时 `.ics` 导出日程已验证：两位参与者只有 `2026-08-01 09:00-09:30` 全员重叠时，`GET /api/schedules/:publicId/export?format=ics` 返回 `text/calendar; charset=utf-8`、1 个 `VEVENT`，`DTSTART:20260731T230000Z` 和 `DTEND:20260731T233000Z` 正确；管理页已显示“导出 CSV”和“导出日历”；临时日程已归档。
- 本地临时单段 `.ics` 导出日程已验证：`GET /api/schedules/:publicId/export?format=ics&startUtc=...&endUtc=...` 对全员可用段返回 `text/calendar; charset=utf-8`、1 个 `VEVENT` 和文件名 `schedule-...-available-20260731T230000Z.ics`；请求非全员可用时间段返回 `400 VALIDATION_ERROR`；管理页已显示“导出此时间”且链接包含 `format=ics`、`startUtc` 和 `endUtc`；临时日程已归档。
- 本地临时最终时间确认日程已验证：两位参与者只有 `2026-08-01 09:00-09:30` 全员重叠时，`POST /api/schedules/:publicId/final-time` 返回 `status: "locked"` 和 `finalTime`，公开详情 API 返回同一最终时间，锁定后新参与者提交返回 `409 SCHEDULE_LOCKED`；浏览器中管理页可点击“设为最终”，公开页和管理页均显示“已确认最终时间”；临时日程已归档。
- 本地临时候选投票最终时间日程已验证：`candidate_poll` 下非候选时间确认返回 `400 VALIDATION_ERROR`，候选 Option A 可通过 `POST /api/schedules/:publicId/final-time` 保存为 `finalTime` 并锁定；浏览器中管理页显示 2 个候选“设为最终”按钮，点击后公开页显示“已确认最终时间”；临时日程已归档。
- 本地临时最终时间 `.ics` 导出日程已验证：`candidate_poll` 候选 Option A 即使只有 `maybe` 投票，也可由组织者确认最终时间；`GET /api/schedules/:publicId/export?format=ics&target=final-time` 返回 `text/calendar; charset=utf-8`、1 个 `VEVENT`、文件名 `schedule-...-final-20260803T080000Z.ics`、`DTSTART:20260803T080000Z`、`DTEND:20260803T090000Z` 和 `TRANSP:OPAQUE`；管理页已显示“导出最终时间”且链接包含 `format=ics` 和 `target=final-time`；临时日程已归档。
- 本地临时预填反馈日程已验证：参与者页粘贴无法解析的文本后，会显示统一预填反馈条、“需复核”状态、忙碌段数/可用时间数摘要和常见 warnings 中文提示；识别明细 helper 单元测试覆盖逐条忙碌时间的标题、日期/星期、时间、单段 warning 和置信度文案；本地临时日程在桌面和 375px 移动宽度下验证 `节次\t周一` / `3-4\t物理` 预填后显示识别明细、默认节次 warning、`10:00-11:40` 时间和 `4/8` 已选时间格，移动端无横向溢出；开放网格编辑页复用同一预填面板，文本预填后会刷新原有选择并保留提交前可手动修正，保存后参与者详情 API 读回 4 个可用时间格；临时日程已归档。
- 本地临时开放网格日程已验证：两位参与者提交后，公开页和管理页均显示“结果热力图”，峰值为 `2/2`，`09:30-10:00` 正确显示 `2/2 可用`，候选投票结果区没有误显示；临时日程已归档。
- 本地临时候选投票英文公开页已验证：两位参与者提交 `available/maybe/unavailable` 和偏好顺位后，英文公开页显示 `Candidate Poll Results`、`Current Best`、`Weighted support`、`Yes`、`Maybe` 和 `No/not selected`，且未混入中文候选结果标题；中文入口保留中文候选投票结果；临时日程已归档。英文入口现为 `/s/:publicId`，中文入口现为 `/zh/s/:publicId`。
- 本地临时参与者英文编辑页已验证：普通开放网格和候选投票的英文编辑页均可打开，显示 `Back to Schedule`、`Your Name`、`Save Changes`、英文手动网格或 `Yes` / `Maybe` / `No` 候选投票控件；中文编辑页仍保留中文文案。英文公开页提交成功后生成并记住 `/s/:publicId/edit/:participantId?key=...` 编辑链接；中文提交会生成 `/zh/s/:publicId/edit/:participantId?key=...` 编辑链接；临时日程已归档。
- 本地临时英文组织者管理页已验证：开放网格和候选投票的英文管理页均可打开，页面 `lang="en"`，显示 `Manage Schedule`、`Share Links`、`Organizer Link`、英文锁定/归档/导出/复制、开放网格 `Result Summary` / `Best Available Slots` 和候选投票 `Candidate Poll Results` / `Current Best`；英文创建页生成的组织者链接使用 `/s/:publicId/manage?key=...`；中文管理页仍保留中文文案并使用 `/zh/s/:publicId/manage?key=...`；临时日程已归档。
- 本地临时开放网格热力图密度日程已验证：5 天 20 个时间格、两位参与者提交后，公开页和管理页默认展开前 3 天并折叠后 2 天；“只看峰值”显示 `1/20` 格，“有人可用”显示 `4/20` 格；临时日程已归档。
- 本地移动端手动时间格已验证：390px 视口下页面声明 `device-width` 后无横向溢出，时间格为两列布局；移动端默认“点按”模式并保持 `touch-action: pan-y`，点击首个时间格后当天计数从 `0/4 已选` 变为 `1/4 已选`；切换“涂选”模式后 `touch-action: none`，从第一个时间格拖到第二个时间格后两格均选中且当天计数为 `2/4 已选`；临时日程已归档。
- 本地长日期手动时间格已验证：10 天 60 个时间格的临时日程在 390px 视口下显示 `0/60 已选` 和 `0/10 天有选择`，横向日期快速跳转包含 `9/1` 到 `9/10`；点击最后一天后日期导航保持 sticky 吸顶，`2026-09-10` 标题显示在导航下方且无横向溢出；点选最后一天首个时间格后总进度变为 `1/60 已选`，日期 chip 和当天标题均同步为 `1/6`；临时日程已归档。
- 本地管理页分享链接面板已验证：管理页显示完整公开填写链接和管理链接；自动化浏览器不支持剪贴板时会显示“无法自动复制，可以手动选中链接。”降级提示。
- 本地管理页结果摘要面板已验证：两位参与者提交共同可用时间后，管理页显示“结果摘要”、`2 人`、`2026-08-25 09:00-09:30` 全员可用时间和“复制摘要”按钮；自动化浏览器不支持剪贴板时会显示手动选中摘要文本的降级提示；临时日程已归档。
- 本地公开页和管理页较优时间槽已验证：两位参与者分别选择不同半小时时间后，公开页和管理页均显示“暂时没有全员都可用的时间”，同时在“当前最优/较优时间槽”中显示 `09:00-09:30`、`09:30-10:00`、`1/2 可用`、`方便：Ada/Grace` 和 `未选此时间：Grace/Ada`；结果摘要文本也包含 `未选：Grace/Ada`；临时日程已归档。
- 本地管理页较优时间槽逐条复制已验证：两位参与者分别选择不同半小时时间后，管理页显示 2 个“复制此备选”按钮；点击后自动化浏览器拦截剪贴板时显示“无法自动复制，可手动选中文本。”降级提示和精确备选文本，复制检查未发现管理密钥外泄；临时日程已归档。
- 本地参与者显示名记忆已验证：`participant-name-memory` 单元测试覆盖读写、trim、超长值清理和浏览器 storage 不可用降级；浏览器中预置本机显示名后，参与者填写页会自动预填姓名。
- 本地参与者编辑链接记忆已验证：`participant-edit-link-memory` 单元测试覆盖读写、路径校验、坏 JSON 清理、无效条目清理和浏览器 storage 不可用降级；浏览器中提交可用时间后，同一浏览器再次打开公开日程页会显示自己的编辑入口。
- 本地创建页默认设置记忆已验证：`schedule-form-memory` 单元测试覆盖读写、模式、时区、时间粒度、星期排序、坏 JSON 清理和浏览器 storage 不可用降级；浏览器中创建一个临时开放网格日程后，再打开创建页会自动预填上次的时区、时间粒度和时间范围。
- 本地广告审核公开资产已验证：`/about`、`/terms`、`/robots.txt` 和 `/sitemap.xml` 均可打开；本地广告占位预览下 `/about` 和 `/terms` 显示外围广告位，且未加载真实第三方广告脚本。

## 已知缺口

- 尚未做多人手动内测；浏览器端验证目前以本机临时日程核心路径为主，仍缺少真实用户手动走查。
- 尚未配置生产日志、监控、告警和备份演练。
- 隐私与数据保留说明仍需正式法律审阅，删除请求处理时限尚未确定；公开支持邮箱 `hello@tonimakes.com` 已配置并生产可见，站内反馈表单可后置接入。
- 自动数据清理已接入代码和 `vercel.json`，Vercel Production/Preview 已设置 `CRON_SECRET` 并完成生产 redeploy；2026-08-02 带授权手动调用 `/api/maintenance/cleanup-expired-schedules` 已返回 `200` 和归档/删除统计，未授权调用返回 `401`。公开推广前仍需用生产日志确认每日 cron 实际触发，并补删除失败告警、备份保留周期和人工删除请求处理时限。
- 尚未实现完整中英双语：英文默认根路径、英文创建页、`/s/:publicId` 公开日程主流程、`/s/:publicId/edit/:participantId` 参与者编辑主流程和 `/s/:publicId/manage` 组织者管理主流程已接入；中文入口迁移到 `/zh/...`；开放网格手动填写、基础结果热力图、候选投票填写、候选投票结果面板、图片/文本/CSV/ICS/模板预填面板、普通可用时间编辑、候选投票编辑、组织者分享链接、管理操作、结果摘要、导出/复制和语言切换可用；本地语言偏好记忆和当前 API 错误码中英文兜底已接入。海外用户正式推广前仍应补完整 `zh-CN` / `en` 文案字典、更多深层组件文案抽离和更广生产 smoke 覆盖。
- 尚未做微信小程序版。
- 尚未开放真实广告、激励广告、商业化或支付能力；默认关闭的常驻展示广告位框架、中文/英文公开审核资产、基础广告/AI 隐私披露、真实广告上线硬闸门、AI 图片识别静态成本闸门、AI 额度账本数据库结构、额度账本服务层、图片识别 API 额度强制校验开关、公开支持邮箱、公开运营主体生产配置和 `/ads.txt` 路由已实现。AdSense 已按根域 `tonimakes.com` 提交审核，`schedule.tonimakes.com` 作为审核通过后的真实投放子域，publisher 记录已在根域和日程子域验证；当前外部阻塞项是 AdSense 审核结果，仍缺正式法律审阅、实际广告供应商披露、slot ID、真实广告平台接入验收、密钥 URL 迁移、广告 consent、真实广告监控、站内反馈表单或工单系统接入、免费额度自动发放、广告服务端验证、动态成本计数和前端兑换流程。
- 图片课表/排班导入已接入基础 provider，但公开模式被代码层阻断；本地或内测需要配置 `OPENAI_API_KEY`、功能开关、release mode 和必要 token 后才能真实识别截图，仍缺少真实课表/排班样本调优。
- 文本粘贴导入目前支持常见结构化时间文本、英文月份日期、日期/星期逗号上下文保留、英文 `from/to/until/till/between ... and ...` 自然句、英文 `noon/midnight` 时间词、结束时间 am/pm 反推开始时间、开始时间加数字时长、列表/编号和忙碌状态前缀、基础课表/排班表格粘贴、复制自合并日期表头的多行表头、日期/星期 + 时间双层表头、`Start/End` 拆分表头行、左右并排区域独立时间列、`Date/Start/End/Title`、`Date/Time/Title`、`Day/Time/Activity`、`Day of Week/Period/Activity` 这类行式排班表格、空白日期/时间继承、独立备注续行、常见导出标题/汇总/说明/页脚跳过、带明确钟点的课程节次、用户粘贴的自定义节次表、裸数字自定义节次定义、`Period/节次` 列裸数字范围和无明确钟点课程节次默认作息表预填；更复杂自然语言、更多学校特殊节次格式、更多深层分组表头和非结构化多行说明待真实样本评估。
- `.ics` 日历导入已支持基础事件、`VFREEBUSY` 忙闲区间、常见 Windows 时区别名、`DTSTART` + `DURATION`（含周、日、时、分、秒，秒级时长向上折算到分钟）、全天事件（含缺少 `DTEND` 的 date-only `DTSTART`）、常见每日重复事件、常见每周重复事件、常见月度重复事件（含指定月份、月内日期、月末、每月所有指定星期几、顺数/倒数第 N 个星期几、`BYSETPOS` 位置过滤）、常见年度重复事件（含同月同日、指定月份、指定月内日期、每年某月所有指定星期几、顺数/倒数第 N 个星期几、`BYSETPOS` 位置过滤）、有限重复、`RDATE` 额外日期或 `VALUE=PERIOD` 额外时段、例外日期和同 `UID` 的 `RECURRENCE-ID` 单次取消/改期；更复杂 recurrence、更多非 IANA 时区和真实日历样本仍待补充验证。
- CSV 文件导入已支持基础课表/排班 CSV、复制自合并日期表头的多行表头、日期/星期 + 时间双层表头、`Start/End` 拆分表头行、左右并排区域独立时间列、多种常见行式排班表头、导出标题行跳过、常见导出标题/汇总/说明/页脚跳过、单列时间范围表头、`Period/节次` 课程节次表头裸数字范围、自定义节次表、裸数字自定义节次定义、空白日期/时间继承和独立备注续行；更多学校特殊节次格式、更多深层分组表头和真实排班样本仍待补充验证。
- 尚未实现登录账号和账号保存型个人长期可用模板；当前已有参与者页、开放网格编辑页临时内联模板预填和本机多模板保存。
- When2meet 风格手动网格已具备点按/涂选切换、移动端两列布局、参与者日期快速跳转、只读结果热力图、结果筛选和长日期默认折叠，但真实移动设备上的边缘滚动、惯性滚动和超长日期范围密度仍待打磨。
- 候选时间投票已实现 `available/maybe/unavailable` 三态 v1、独立 `candidateVotes` 提交结构、偏好顺位 v1、按钮/拖拽排序、专门结果展示、候选项洞察、缺口标签、对比最佳分析和默认综合排序；尚未支持参与者自定义偏好权重。

## 下一步建议

1. 先不要公开启用图片识别；如需调优，用 `local_only` 或 `internal_test` 模式配合 `OPENAI_API_KEY` 和测试 token 处理真实课表/排班截图，继续调优 prompt、低置信度判定和 warnings 内容。
2. 收集真实文本/表格粘贴和 CSV 样本，继续扩展更复杂自然语言、更复杂嵌套表头、更多学校特殊节次格式和真实样本 warnings。
3. 根据真实 `.ics` 样本继续补复杂 recurrence、更多非 IANA 时区和低置信度 warnings。
4. 根据真实候选投票使用情况评估是否需要参与者自定义偏好权重。
5. 继续用真实移动设备走查手动网格的边缘滚动、惯性滚动和超长日期范围下的结果密度体验。
6. 跟踪下一次 Vercel Cron 自动触发日志，确认 `/api/maintenance/cleanup-expired-schedules` 每日任务不是只靠手动调用跑通；随后补删除失败告警、备份保留说明和人工删除请求处理时限。
7. 在决定登录方案前新增或更新认证 ADR，再实现用户、模板数据库表，并把当前本机模板升级为账号保存型模板选择。
8. 继续完善广告审核资产的正式内容：公开支持邮箱已配置为 `hello@tonimakes.com`，公开运营主体已配置为 `Toni Liu` / `Australia`；AdSense 第一版已按个人主体和根域 `tonimakes.com` 提交审核，`schedule.tonimakes.com` 只作为后续真实广告允许加载的生产子域。publisher 和根域/子域 `/ads.txt` 已验证；等待审核期间继续保持 `NEXT_PUBLIC_DISPLAY_ADS_ENABLED=false`，补法律审阅、实际广告供应商、个性化广告退出方式、地区化 consent、slot ID、生产域名白名单和 AdSense 后台识别状态。后续站内反馈表单可在用户反馈管理系统稳定后接入。通过 AdSense 审核后，再把当前默认关闭的常驻广告位框架切到小流量真实广告。带 `?key=` 的管理/编辑页继续只允许内部广告或关闭第三方广告。之后补免费额度自动发放、单日程/全站限额、动态成本计数和紧急关闭开关，确认有效 eCPM 后接入可服务端验证的激励广告。
9. 继续补完整中英双语基础设施：`zh-CN` / `en` 文案字典抽离、剩余深层组件文案和更广生产 smoke 覆盖；语言偏好记忆和当前 API 错误码兜底已接入，图片/文本/CSV/ICS/模板预填面板已进入英文主流程，但图片识别公开入口仍保持成本闸门关闭。
10. 找 3 到 5 个朋友按内测清单试用，重点观察手动填写是否已经够用、导入是否明显降低填写成本。
11. 配置生产日志、监控、告警和备份演练。

## Git 基线

当前已经有首个基线提交：

- `ae9d215 feat: scaffold schedule share MVP`

后续功能建议继续保持小步提交：每轮改动先跑相关验证，再提交清晰的功能或文档变更。
