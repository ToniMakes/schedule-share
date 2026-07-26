# 部署与运维草案

## MVP 部署部件

- Web 应用：运行 `apps/web` 的 Next.js 服务。
- Postgres 数据库：保存日程、参与者和可用时间。
- 环境变量：生产环境至少需要设置 `DATABASE_URL`。
- 域名：先使用托管平台分配的临时域名验证流程，再绑定正式域名。

## 环境变量

完整变量说明见 `docs/environment.md`。

- 生产 Web 运行时必须设置 `DATABASE_URL`。
- 本地或部署验证终端需要设置 `DATABASE_URL`，用于 `db:check`、migration 和 `verify:deployment`。
- 命令行脚本会自动读取项目根目录的 `.env.local` 和 `.env`；当前 shell 中已设置的变量优先级最高。
- `SMOKE_BASE_URL` 只用于本地验证脚本，指向要测试的站点地址；不需要作为 Web 应用的生产运行时变量。
- 不要把真实 `DATABASE_URL`、`ownerUrl` 或 `editUrl` 写进公开日志、截图或文档。

## 上线流程

1. 确认 CI 通过：`format`、`lint`、`typecheck`、`test`、`build`。
2. 创建生产 Postgres 数据库，并配置备份策略。
3. 在部署平台设置 `DATABASE_URL`。
4. 对生产数据库做连接自检：`corepack pnpm db:check`。第一次可能提示缺少表，这是 migration 前的正常状态。
5. 对生产数据库执行 migration：`corepack pnpm db:migrate`。
6. 再次执行 `corepack pnpm db:check`，确认扩展、枚举和核心表存在。
7. 部署 Web 应用。
8. 访问 `/api/health`，确认返回 `200` 和 `database: "ok"`。
9. 设置 `SMOKE_BASE_URL` 后，对生产地址运行 API 烟雾测试：`corepack pnpm smoke:api`。
10. 或在 `DATABASE_URL` 和 `SMOKE_BASE_URL` 都已设置后运行完整部署验证：`corepack pnpm verify:deployment`。

## 健康检查

`GET /api/health` 用于部署平台探活和上线后快速诊断。

健康响应：

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok"
  }
}
```

## 部署验证

`corepack pnpm verify:deployment` 会按顺序执行：

1. `corepack pnpm db:check`
2. 请求 `SMOKE_BASE_URL` 对应站点的 `/api/health`
3. 执行 `corepack pnpm smoke:api`

运行前需要设置：

```powershell
$env:DATABASE_URL="postgres://..."
$env:SMOKE_BASE_URL="https://your-domain.example"
```

这个命令会创建一条归档的 smoke-test 日程，用于验证创建、提交、编辑、锁定、锁定后拒绝修改和归档的完整 API 链路。

如果缺少 `DATABASE_URL` 或数据库查询失败，会返回 `503`：

```json
{
  "status": "unhealthy",
  "checks": {
    "database": "unavailable"
  }
}
```

## 平台选择建议

- 海外 Web MVP：优先选择 Vercel、Render、Fly.io 或 Railway 这类能直接部署 Next.js 并绑定 Postgres 的平台。
- 数据库：使用托管 Postgres，先从低规格实例开始，重点确认自动备份、地区、迁移流程和连接上限。
- 国内访问：如果后续做微信小程序，建议复用现有 API contract，再根据国内部署、备案和微信登录规则单独设计适配层。

## 运维注意

- `ownerUrl` 和 `editUrl` 带有密钥，不要写入公开日志、截图或客服对话。
- 数据库 migration 要先在测试环境跑过，再用于生产。
- 每次修改环境变量后重新部署或重启服务，确保运行时拿到新配置。
- 先保留简单的错误日志和健康检查，等有真实用户后再补充监控、告警和埋点。
