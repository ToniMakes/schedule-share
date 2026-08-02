# 日程表共享网站

一个面向跨时区多人协调的日程共享工具。组织者创建日程房间并分享链接，参与者通过手动填写、课表/排班导入、长期模板或候选时间投票等方式提供可用时间后，系统自动找出所有人或多数人都有空的时间段。

## 当前阶段

项目处于“海外网页版 MVP 主链路已实现，已部署到正式域名并进入内测与 MVP+ 差异化设计”的阶段。

正式域名：

- `https://schedule.tonimakes.com`

第一阶段目标是通过移动优先的海外网页版 MVP 验证核心流程：

1. 创建日程。
2. 分享链接。
3. 参与者填写可用时间。
4. 自动计算共同空闲时间。

微信小程序和国内部署作为后续阶段处理。

当前已完成：

- TypeScript monorepo 骨架。
- Next.js Web 入口。
- 创建日程页面。
- 日程详情页面。
- 组织者管理页面。
- 参与者可用时间提交表单。
- 参与者可用时间编辑页面。
- 共享 API contract、`createSchedule`、`getSchedule`、`createParticipantAvailability`、`getParticipantAvailability`、`updateParticipantAvailability`、`lockSchedule` 和 `confirmFinalTime` API client。
- `POST /api/schedules` 创建日程 API。
- `GET /api/schedules/:publicId` 获取日程 API。
- `POST /api/schedules/:publicId/participants` 提交可用时间 API。
- `GET/PUT /api/schedules/:publicId/participants/:participantId` 查看和更新参与者可用时间 API。
- `POST /api/schedules/:publicId/lock` 锁定日程 API。
- `POST /api/schedules/:publicId/final-time` 组织者确认最终时间 API。
- `POST /api/schedules/:publicId/archive` 归档日程 API。
- `GET /api/schedules/:publicId/export` 组织者 CSV 和 `.ics` 日历导出 API。
- `GET /api/health` 健康检查 API。
- Drizzle + Postgres 数据库 schema 和初始 migration。
- Neon Postgres Singapore 托管数据库接入。
- Vercel production 部署和正式子域名 `schedule.tonimakes.com`。
- 核心时间格生成。
- 核心可用时间统计和交集计算。
- 核心逻辑测试。
- GitHub Actions CI 门禁。
- 多种可用时间添加方式的产品和架构文档基线。
- `AvailabilityDraft` 归一化和忙碌时间块求差集核心逻辑。
- 参与者填写页和编辑页的手动时间格支持点按选择、拖拽涂选、每天全选/清空、总进度、每日已选计数、日期快速跳转、移动端两列布局和基础热力强度。
- 参与者填写页会在本机浏览器记住上次成功提交或编辑的显示名，用于下次预填姓名。
- 公开日程页会在本机浏览器记住当前日程下上次成功提交或编辑的编辑链接，方便同一浏览器再次修改。
- 参与者填写页和开放网格编辑页会在本机浏览器记住上次成功使用的每周模板星期和时间段，也可保存多个本机每周模板用于下次预填。
- 创建页会在本机浏览器记住上次成功创建时使用的模式、时区、时间粒度和开放网格时间范围，用于下次预填。
- 文本粘贴导入预览 API 和参与者填写页、开放网格编辑页预填入口，支持常见中英文日期、英文月份日期、日期/星期逗号上下文（如 `Mon, 9-11 COMP101`、`Monday, Aug 3, 6pm-7pm Dinner`）、时间段、`from 9 to 11 on Monday`、`between 9 and 11 on Monday`、`noon-1pm`、`midnight to 1am`、`6 to 7pm`、`9am until 11am`、`2pm till 4pm`、`9am for 2 hours`、`14:30 for 90 min` 这类英文自然句、列表/编号和 `Busy:`/`忙碌:` 状态前缀、tab/逗号分隔课表/排班表格、Markdown 表格、复制自合并日期表头的多行表头、日期/星期 + 时间的双层表头、`Start/End` 拆分表头行、左右并排区域各自独立 `Time/时间` 列的课表、导出标题行后的 `Date/Start/End/Title` 和 `Date/Time/Title` 这类行式排班表格、合并单元格复制后空白日期/时间的上下文继承、独立 `Notes/备注` 列的纯备注续行、常见导出标题/汇总/页脚/说明行跳过、带明确钟点的课程节次写法，以及无明确钟点课程节次按用户粘贴的自定义节次表、裸数字自定义节次定义、`Period/节次` 列裸 `1-2` 范围或默认作息表换算并提示复核。
- 图片课表/排班导入预览 API、上传限制、OpenAI provider 适配器和参与者填写页、开放网格编辑页图片预填入口。
- 每周可用模板投影核心逻辑、内联模板预览 API，以及参与者填写页、开放网格编辑页的模板预填、本机模板保存、选择和删除入口。
- `.ics` 日历文件预览 API、基础 ICS 事件解析、`VFREEBUSY` 忙闲区间、UTC / `TZID` / 常见 Windows 时区别名、`DTSTART` + `DURATION`、全天事件（含缺少 `DTEND` 的 date-only `DTSTART`）、每日、每周、常见月度重复（同日、指定月份、月内日期、月末、每月所有指定星期几、顺数/倒数第 N 个星期几、`BYSETPOS` 位置过滤）和常见年度重复（同月同日、`BYMONTH`、`BYMONTHDAY`、每年某月所有指定星期几、顺数/倒数第 N 个星期几、`BYSETPOS` 位置过滤）、`COUNT` / `UNTIL` / `RDATE`（含 `VALUE=PERIOD`）/ `EXDATE` / `RECURRENCE-ID` 处理和参与者填写页、开放网格编辑页日历预填入口。
- CSV 排班/课表文件预览 API、基础 CSV 解析和参与者填写页、开放网格编辑页 CSV 预填入口，支持时间 x 星期课表、复制自合并日期表头的多行表头、日期/星期 + 时间的双层表头、`Start/End` 拆分表头行、左右并排区域各自独立 `Time/时间` 列的课表、导出标题行后的 `Date/Start/End/Title` 和 `Date/Time/Title` 这类行式排班导出、`Period/节次` 课程节次列裸 `1-2` 范围、自定义节次表、裸数字自定义节次定义、空白日期/时间单元格的上一行继承、独立 `Notes/备注` 列纯备注续行，以及常见导出标题/汇总/页脚/说明行跳过。
- 参与者填写页和开放网格编辑页统一预填反馈会展示来源、忙碌段数、可用时间数、置信度、需复核状态、常见 warnings 中文提示，以及逐条识别出的忙碌时间明细，方便提交前手动修正。
- 候选时间投票三态 v1：创建页候选模式、候选时间表、参与者选择方便/也许/不方便、方便/也许候选偏好顺位、拖拽调整偏好顺位、结果汇总复用、首选/平均顺位辅助排序、排序依据解释、候选项洞察、缺口标签、对比最佳分析、专门结果视图和管理页逐条复制候选。
- 开放网格结果热力图：公开页和管理页按日期展示每格可用人数、峰值和重合比例，并支持全部/有人可用/只看峰值筛选和长日期折叠。
- 管理页 `.ics` 导出入口，可把所有全员可用连续时间段、某一个共同时间段或已确认最终时间下载为日历文件。
- 管理页最终时间确认入口，可从开放网格的全员可用连续时间段或候选投票的候选项中选择最终时间并锁定日程。
- 公开页和管理页的开放网格结果会同时展示全员可用时间和按可用人数排序的当前较优时间槽，并列出方便和未选此时间的参与者，方便没有全员共同时间时继续沟通。
- 管理页结果摘要复制入口和开放网格单个较优时间槽复制入口，可把关键结果或某个备选时间复制到群聊或邮件，且不会包含管理密钥。

## 文档

- `docs/product.md`：产品定位、MVP 范围和成功标准。
- `docs/availability-entry-methods.md`：手动拖拽、图片/文本导入、长期模板、候选时间投票和文件轻导入的产品规格。
- `docs/monetization.md`：常驻广告、AI 图片识别成本、激励广告换额度和风控护栏方案。
- `docs/domain-model.md`：核心实体、时间规则和权限规则。
- `docs/architecture.md`：推荐技术栈、目录结构和模块边界。
- `docs/api.md`：API 草案。
- `docs/environment.md`：环境变量、本地配置和生产配置说明。
- `docs/deployment.md`：部署流程、健康检查和运维注意事项。
- `docs/privacy.md`：隐私与数据保留说明草案。
- `docs/feedback.md`：反馈、归档和删除请求说明。
- `docs/project-status.md`：当前项目基线、完成项、缺口和下一步。
- `docs/internal-test-checklist.md`：真实内测前后的检查清单。
- `docs/adr/`：架构决策记录。
- `AGENTS.md`：人类和 AI 的开发协作规则。

## 推荐开发流程

1. 先确认需求属于 `docs/product.md` 的 MVP、MVP+ 或后续范围。
2. 涉及数据、时间、权限时先更新 `docs/domain-model.md`。
3. 涉及技术栈或架构选择时新增 ADR。
4. 先实现 `packages/core` 的领域逻辑和测试。
5. 再实现 API。
6. 最后实现 Web 页面。

## 本地真实链路验证

需要本机安装 Docker。默认本地数据库连接是：

```text
postgres://schedule_share:schedule_share@localhost:5432/schedule_share
```

启动数据库并迁移：

```powershell
corepack pnpm db:up
corepack pnpm db:migrate:local
```

启动带本地数据库环境变量的 Web 服务：

```powershell
corepack pnpm dev:local
```

另开一个终端跑 API 烟雾测试：

```powershell
corepack pnpm smoke:api
```

烟雾测试会通过 HTTP 跑通创建日程、提交可用时间、编辑提交、锁定日程，并确认锁定后不能再提交或修改。

如果使用云端或托管 Postgres，不需要本机 Docker。先设置 `DATABASE_URL`，再检查连接和 schema。如果
`DATABASE_URL` 是 Neon pooled 连接串，建议同时设置 migration 专用的 direct 连接串：

```powershell
$env:DATABASE_URL="postgres://..."
$env:DATABASE_MIGRATION_URL="postgres://..."
corepack pnpm env:status
corepack pnpm db:setup
corepack pnpm dev
```

部署后可针对真实站点运行烟雾测试：

```powershell
$env:SMOKE_BASE_URL="https://your-domain.example"
corepack pnpm smoke:api
```

也可以运行完整部署验证。它会执行 `db:check`，检查 `/api/health`、`/privacy` 和 `/feedback`，并创建一条归档的
smoke-test 日程：

```powershell
$env:DATABASE_URL="postgres://..."
$env:DATABASE_MIGRATION_URL="postgres://..."
$env:SMOKE_BASE_URL="https://your-domain.example"
corepack pnpm deployment:config
corepack pnpm verify:deployment
```

## 暂定架构

```text
apps/
  web/
packages/
  core/
  db/
  api-client/
docs/
  adr/
```

图片导入需要配置 `OPENAI_API_KEY`；可选 `OPENAI_IMAGE_IMPORT_MODEL` 覆盖默认识别模型。未配置时，图片预填会返回
`IMPORT_PROVIDER_UNAVAILABLE`，文本粘贴和手动填写仍可使用。
如果后续接入常驻展示广告，默认方向是每个页面尽量保留外围广告位；但上线前需要先补齐广告审核公开内容、隐私披露、`/ads.txt` 和测试流量禁用。带管理/编辑密钥的页面在完成 URL 密钥迁移前不加载第三方广告脚本；通过激励广告换取图片识别额度时，广告位、成本、额度、隐私和风控方案见 `docs/monetization.md`。

## 下一步

- 收集真实文本/表格粘贴和 CSV 样本，继续扩展更复杂自然语言、更复杂嵌套表头、更多学校特殊节次格式和真实样本 warnings。
- 根据真实 `.ics` 样本继续补更复杂 Recurrence、更多时区边界和低置信度 warnings。
- 在登录方案确定后实现用户、模板数据表，并把当前本机模板升级为账号保存型个人长期模板。
- 根据真实候选投票使用情况评估参与者自定义偏好权重。
- 继续改进移动端手动拖拽手感和更长日期范围下的结果密度体验。
- 先补齐广告审核资产和密钥 URL 安全边界，再用默认全站外围常驻广告试水基础收入；随后实现 AI 图片识别的免费额度、成本护栏和激励广告验证闭环。
- 找 3 到 5 个朋友按 `docs/internal-test-checklist.md` 做真实内测。
