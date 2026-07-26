# 项目状态基线

更新日期：2026-07-26

## 当前阶段

项目已经从纯架构骨架推进到“海外网页版 MVP 主链路已实现，等待真实 Postgres 跑通内测链路”的阶段。

当前本机限制：

- 本机未安装 Docker。
- 本机未安装 `psql` 或 `pg_isready`。
- 因此当前环境可以预览页面、运行单元测试和构建，但不能直接跑通真实数据库写入链路。

## 已完成能力

- 创建日程页面和 API。
- 公开日程详情页和 API。
- API 错误码共享列表和文档一致性测试。
- API JSON 请求解析和校验统一封装。
- API route 错误边界统一封装。
- 参与者提交可用时间。
- 参与者使用编辑密钥查看和修改自己的提交。
- 组织者管理页。
- 组织者锁定日程。
- 组织者归档日程。
- 组织者导出 CSV。
- 健康检查 API：`GET /api/health`。
- Postgres schema、初始 migration 和数据库自检：`corepack pnpm db:setup`、`corepack pnpm db:check`。
- API smoke test：`corepack pnpm smoke:api`。
- 部署配置预检：`corepack pnpm deployment:config`。
- 根目录脚本 lint：`corepack pnpm lint:scripts`。
- 部署配置检查逻辑测试：`corepack pnpm test:scripts`。
- 部署验证编排：`corepack pnpm verify:deployment`，包含数据库检查、健康检查、公开说明页和 API smoke test。
- 环境变量模板和配置说明：`.env.example`、`docs/environment.md`。
- 命令行脚本自动读取本地 `.env.local` / `.env`。
- 隐私与数据保留说明草案：`docs/privacy.md`、`/privacy`。
- 反馈与删除请求说明：`docs/feedback.md`、`/feedback`。
- GitHub Actions CI：format、脚本和 workspace lint、typecheck、test、build。

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
corepack pnpm build
```

当前测试总数：95。

浏览器预览验证：

- `http://127.0.0.1:3000/new` 可打开。
- 未配置数据库时，创建页会显示“暂时无法保存日程”。
- 管理页错误态可打开，无横向溢出。
- 归档和导出 API 在未配置数据库时返回 `DATABASE_UNAVAILABLE`。

## 已知缺口

- 尚未接入真实 Postgres，因此真实创建、提交、编辑、锁定、导出、归档链路还未在数据库上跑通。
- 尚未部署到公开 URL。
- 尚未配置生产日志、监控、告警和备份演练。
- 隐私与数据保留说明仍需正式法律审阅，正式反馈联系渠道和删除请求处理时限尚未确定。
- 尚未做微信小程序版。
- 尚未做广告、商业化或支付能力。

## 下一步建议

1. 按 `docs/environment.md` 准备托管 Postgres 连接串。
2. 运行 `env:status -> db:setup`。
3. 启动带 `DATABASE_URL` 的 Web 服务。
4. 运行 `smoke:api`。
5. 找 3 到 5 个朋友按内测清单试用。
6. 整理反馈后再决定是否进入公开部署。

## Git 基线

当前已经有首个基线提交：

- `ae9d215 feat: scaffold schedule share MVP`

后续功能建议继续保持小步提交：每轮改动先跑相关验证，再提交清晰的功能或文档变更。
