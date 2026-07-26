# DB Package

`packages/db` 存放数据库 schema、migration 和数据库访问基础封装。

## 边界

- 负责表结构定义。
- 负责 migration。
- 负责基础 repository。
- 不重复实现排期算法。
- 不直接暴露数据库内部字段给 UI。

## 已选方案

- ORM：Drizzle。
- 数据库：Postgres。
- 驱动：`postgres`。
- Migration：`drizzle-kit` + `migrations/` SQL 文件。

## 命令

- `corepack pnpm --filter @schedule-share/db db:generate`
- `corepack pnpm --filter @schedule-share/db db:migrate`
- `corepack pnpm --filter @schedule-share/db db:check`
- `corepack pnpm --filter @schedule-share/db db:studio`

这些命令需要 `DATABASE_URL`。环境变量说明见 `docs/environment.md`。

项目根目录提供本地 Docker Postgres 辅助命令：

- `corepack pnpm db:up`
- `corepack pnpm db:check`
- `corepack pnpm db:migrate:local`
- `corepack pnpm db:down`

`db:migrate:local` 会在没有显式 `DATABASE_URL` 时使用根目录 `.env.example` 中的默认本地连接串。
