# 项目状态基线

更新日期：2026-07-31

## 当前阶段

项目已经从纯架构骨架推进到“海外网页版 MVP 主链路已实现，已通过 `https://schedule.tonimakes.com`
正式域名在 Vercel 生产部署上跑通 API smoke test”的阶段。

当前部署决策已经补充到 `docs/adr/0007-hosting-database-and-domain.md`：MVP 优先使用 Vercel + Neon Postgres Singapore，并通过 `https://schedule.tonimakes.com` 对外访问。

下一阶段的产品差异化决策已经补充到 `docs/adr/0008-availability-import-and-templates.md` 和 `docs/adr/0009-multiple-availability-entry-methods.md`：优先把课表/排班导入、登录用户长期可用模板、When2meet 风格手动拖拽网格和 Doodle/Rallly 风格候选时间投票纳入“多种可用时间添加方式”策略。除手动拖拽外，这些能力只生成预填建议，不绕过用户确认，也不替代当前匿名主流程。

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
- 组织者导出 CSV。
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
- 隐私与数据保留说明草案：`docs/privacy.md`、`/privacy`。
- 反馈与删除请求说明：`docs/feedback.md`、`/feedback`。
- GitHub Actions CI：format、脚本和 workspace lint、typecheck、test、build。
- 多种可用时间添加方式的产品规格：`docs/availability-entry-methods.md`。
- 多种可用时间添加方式的领域、API、隐私和架构边界文档。

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

最近一次完整验证通过：

```powershell
corepack pnpm format
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm db:setup
$env:SMOKE_BASE_URL="http://127.0.0.1:3001"; corepack pnpm smoke:api
$env:SMOKE_BASE_URL="https://schedule-share-lime.vercel.app"; corepack pnpm verify:deployment
$env:SMOKE_BASE_URL="https://schedule.tonimakes.com"; $env:APP_BASE_URL="https://schedule.tonimakes.com"; corepack pnpm verify:deployment
```

当前测试总数：136。

真实数据库验证：

- `corepack pnpm db:setup` 已对 Neon Postgres Singapore 执行 migration。
- `corepack pnpm db:check` 已确认 `pgcrypto`、`schedule_status`、`schedules`、`participants`、`availability_slots` 存在。
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

## 已知缺口

- 尚未做多人手动内测和浏览器端真实用户路径检查。
- 尚未配置生产日志、监控、告警和备份演练。
- 隐私与数据保留说明仍需正式法律审阅，正式反馈联系渠道和删除请求处理时限尚未确定。
- 尚未做微信小程序版。
- 尚未做广告、商业化或支付能力。
- 尚未实现课表/排班导入、AI/OCR provider、导入确认 UI。
- 尚未实现登录账号和个人长期可用模板。
- 尚未打磨 When2meet 风格拖拽网格和群体热力图体验。
- 尚未实现候选时间投票模式。

## 下一步建议

1. 以 `docs/availability-entry-methods.md` 为产品规格，为多种添加方式实现 `packages/core` 中的 `AvailabilityDraft` 归一化逻辑，并补时间边界测试。
2. 为课表/排班导入实现忙碌时间块到可用时间槽转换。
3. 为个人长期模板实现每周可用窗口投影逻辑，并补跨时区测试。
4. 改进参与者填写页的手动拖拽网格和群体热力图体验。
5. 在决定登录方案前新增或更新认证 ADR，再实现用户和模板数据库表。
6. 把当前代码推到远程 Git 仓库，并接入 Vercel Git 自动部署。
7. 找 3 到 5 个朋友按内测清单试用，重点观察手动填写是否已经够用、导入是否明显降低填写成本。
8. 配置生产日志、监控、告警和备份演练。

## Git 基线

当前已经有首个基线提交：

- `ae9d215 feat: scaffold schedule share MVP`

后续功能建议继续保持小步提交：每轮改动先跑相关验证，再提交清晰的功能或文档变更。
