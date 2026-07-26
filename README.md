# 日程表共享网站

一个面向跨时区多人协调的日程共享工具。组织者创建日程房间并分享链接，参与者填写可用时间后，系统自动找出所有人或多数人都有空的时间段。

## 当前阶段

项目处于架构骨架和核心领域逻辑阶段。第一阶段目标是构建移动优先的海外网页版 MVP，验证核心流程：

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
- 共享 API contract、`createSchedule`、`getSchedule`、`createParticipantAvailability`、`getParticipantAvailability`、`updateParticipantAvailability` 和 `lockSchedule` API client。
- `POST /api/schedules` 创建日程 API。
- `GET /api/schedules/:publicId` 获取日程 API。
- `POST /api/schedules/:publicId/participants` 提交可用时间 API。
- `GET/PUT /api/schedules/:publicId/participants/:participantId` 查看和更新参与者可用时间 API。
- `POST /api/schedules/:publicId/lock` 锁定日程 API。
- `POST /api/schedules/:publicId/archive` 归档日程 API。
- `GET /api/schedules/:publicId/export` 组织者 CSV 导出 API。
- `GET /api/health` 健康检查 API。
- Drizzle + Postgres 数据库 schema 和初始 migration。
- 核心时间格生成。
- 核心可用时间统计和交集计算。
- 核心逻辑测试。
- GitHub Actions CI 门禁。

## 文档

- `docs/product.md`：产品定位、MVP 范围和成功标准。
- `docs/domain-model.md`：核心实体、时间规则和权限规则。
- `docs/architecture.md`：推荐技术栈、目录结构和模块边界。
- `docs/api.md`：API 草案。
- `docs/deployment.md`：部署流程、健康检查和运维注意事项。
- `docs/project-status.md`：当前项目基线、完成项、缺口和下一步。
- `docs/internal-test-checklist.md`：真实内测前后的检查清单。
- `docs/adr/`：架构决策记录。
- `AGENTS.md`：人类和 AI 的开发协作规则。

## 推荐开发流程

1. 先确认需求是否属于 `docs/product.md` 的 MVP 范围。
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

如果使用云端或托管 Postgres，不需要本机 Docker。先设置 `DATABASE_URL`，再检查连接和 schema：

```powershell
$env:DATABASE_URL="postgres://..."
corepack pnpm db:check
corepack pnpm db:migrate
corepack pnpm db:check
```

部署后可针对真实站点运行烟雾测试：

```powershell
$env:SMOKE_BASE_URL="https://your-domain.example"
corepack pnpm smoke:api
```

也可以运行完整部署验证。它会执行 `db:check`、检查 `/api/health`，并创建一条归档的 smoke-test 日程：

```powershell
$env:DATABASE_URL="postgres://..."
$env:SMOKE_BASE_URL="https://your-domain.example"
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

## 下一步

- 选择海外 Web MVP 的托管平台和生产 Postgres。
- 在真实部署环境跑通 `db:check`、migration 和 `verify:deployment`。
- 接真实 Postgres，跑通可保存、可分享的内测链路。
