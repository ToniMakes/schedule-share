# ADR 0006: ORM 和数据库迁移

## 状态

采用。

## 背景

项目第一阶段使用 Postgres，需要明确数据库 schema、migration 和代码类型之间的关系。数据库层应当透明、可审查，并避免把业务计算逻辑写进持久化层。

## 决策

使用 Drizzle 作为 ORM 和 schema 工具：

- `packages/db/src/schema.ts` 定义表结构。
- `packages/db/migrations/` 存放 SQL migration。
- `drizzle-kit` 用于后续生成和执行 migration。
- 运行时 Postgres 驱动使用 `postgres`。
- API 层通过 `packages/db` 暴露的连接和 schema 访问数据库。

## 结果

优点：

- schema 接近 SQL，便于审查。
- migration 文件可读，不依赖黑盒生成状态。
- TypeScript 类型可以直接从 schema 推导。

代价：

- 相比 Prisma，Drizzle 对应用层约定要求更高。
- 复杂查询需要开发者更熟悉 SQL。

## 后续检查

当出现以下情况时重新评估：

- 团队更需要 Prisma Studio 和高级模型生成能力。
- 数据访问层出现大量重复查询。
- 小程序后端接口需要更复杂的权限模型。
