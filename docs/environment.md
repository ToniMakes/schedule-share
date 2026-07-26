# 环境变量说明

## 原则

- 真实生产密钥只放在部署平台的环境变量里，不提交到 Git。
- 本地开发先运行 `corepack pnpm env:init` 生成 `.env.local`，再按实际数据库连接修改。
- 命令行脚本会自动读取项目根目录的 `.env.local` 和 `.env`；已经在当前 shell 设置的变量优先级最高。
- 改动环境变量后，需要重启本地 dev server 或重新部署生产环境。

## 变量清单

| 变量             | 必填 | 使用位置                                                                 | 示例                                        | 说明                                                                      |
| ---------------- | ---- | ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`   | 是   | Web API、Drizzle migration、`db:check`、`smoke:api`、`verify:deployment` | `postgres://user:password@host:5432/dbname` | Postgres 连接串。本地 Docker 默认值见 `.env.example` 和 `compose.yaml`。  |
| `SMOKE_BASE_URL` | 否   | `smoke:api`、`verify:deployment`                                         | `https://your-domain.example`               | 要验证的站点地址。不设置时 `smoke:api` 默认访问 `http://localhost:3000`。 |

## 本地开发

如果本机有 Docker：

```powershell
corepack pnpm env:init
corepack pnpm db:up
corepack pnpm db:migrate:local
corepack pnpm dev:local
```

另开一个终端运行：

```powershell
corepack pnpm smoke:api
```

如果使用托管 Postgres 或云端数据库：

```powershell
corepack pnpm env:init
# 修改 .env.local 里的 DATABASE_URL 后再执行：
corepack pnpm db:check
corepack pnpm db:migrate
corepack pnpm db:check
corepack pnpm dev
```

也可以不写 `.env.local`，直接在当前 PowerShell 会话中设置：

```powershell
$env:DATABASE_URL="postgres://..."
corepack pnpm db:check
corepack pnpm db:migrate
corepack pnpm db:check
corepack pnpm dev
```

## 生产部署

部署平台至少需要设置：

```text
DATABASE_URL=postgres://...
```

部署后验证生产站点：

```powershell
# 可以写进 .env.local，也可以在当前 shell 设置：
$env:DATABASE_URL="postgres://..."
$env:SMOKE_BASE_URL="https://your-domain.example"
corepack pnpm verify:deployment
```

`verify:deployment` 会创建一条归档的 smoke-test 日程。不要在真实用户已经开始使用的生产环境里高频运行。

## 安全注意

- `DATABASE_URL` 包含数据库用户名和密码，不能截图、公开贴出或写进 issue。
- `ownerUrl` 和 `editUrl` 带有管理或编辑密钥，也不能公开记录。
- 如果怀疑连接串泄露，先在数据库平台轮换密码，再更新部署平台环境变量并重新部署。
