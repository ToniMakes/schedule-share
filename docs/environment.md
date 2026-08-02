# 环境变量说明

## 原则

- 真实生产密钥只放在部署平台的环境变量里，不提交到 Git。
- 本地开发先运行 `corepack pnpm env:init` 生成 `.env.local`，再按实际数据库连接修改。
- 命令行脚本会自动读取项目根目录的 `.env.local` 和 `.env`；已经在当前 shell 设置的变量优先级最高。
- 改动环境变量后，需要重启本地 dev server 或重新部署生产环境。

## 变量清单

| 变量                        | 必填 | 使用位置                                              | 示例                                        | 说明                                                                                                                             |
| --------------------------- | ---- | ----------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | 是   | Web API、`db:check`、`smoke:api`、`verify:deployment` | `postgres://user:password@host:5432/dbname` | Postgres 连接串。本地 Docker 默认值见 `.env.example` 和 `compose.yaml`。Neon 可使用 pooled 连接串。                              |
| `DATABASE_MIGRATION_URL`    | 否   | Drizzle migration、`db:setup`                         | `postgres://user:password@host:5432/dbname` | migration 专用直连 Postgres 连接串。不设置时使用 `DATABASE_URL`。Neon pooled host 含 `-pooler`，migration 建议使用 direct host。 |
| `APP_BASE_URL`              | 否   | Web API、`deployment:config`                          | `https://schedule.tonimakes.com`            | 生成 `shareUrl`、`ownerUrl` 和 `editUrl` 时使用的正式站点地址。不设置时按请求 Host 推断。                                        |
| `OPENAI_API_KEY`            | 否   | Web API                                               | `sk-...`                                    | 启用图片课表/排班导入识别。未设置时图片导入返回 `IMPORT_PROVIDER_UNAVAILABLE`，文本粘贴和手动填写不受影响。                      |
| `OPENAI_IMAGE_IMPORT_MODEL` | 否   | Web API                                               | `gpt-5.6-luna`                              | 图片导入识别使用的 OpenAI Responses API 模型。不设置时默认使用 `gpt-5.6-luna`。                                                  |
| `SMOKE_BASE_URL`            | 否   | `smoke:api`、`deployment:config`、`verify:deployment` | `https://schedule.tonimakes.com`            | 要验证的站点地址。不设置时 `smoke:api` 默认访问 `http://localhost:3000`；部署验证必须显式设置为远程站点。                        |

## 计划中的 AI 图片识别额度和激励广告变量

以下变量属于 `docs/monetization.md` 里的后续方案，当前代码尚未读取，不需要在 Vercel 里立即配置：

| 变量                                     | 说明                                                    |
| ---------------------------------------- | ------------------------------------------------------- |
| `AI_IMAGE_REWARDED_ADS_ENABLED`          | 是否启用激励广告换图片识别额度。                        |
| `AI_IMAGE_FREE_CREDITS_PER_SCHEDULE`     | 每个日程默认发放的免费图片识别额度。                    |
| `AI_IMAGE_CREDIT_DAILY_LIMIT`            | 同一匿名 session、设备或用户每日可获得/使用的额度上限。 |
| `AI_IMAGE_MAX_RECOGNITIONS_PER_SCHEDULE` | 单个日程最多允许的图片识别次数。                        |
| `AI_IMAGE_COST_GUARDRAIL_USD`            | 单日或单周期 AI 图片识别成本上限。                      |
| `REWARDED_AD_PROVIDER`                   | 激励广告提供商标识。                                    |
| `REWARDED_AD_UNIT_ID`                    | 广告单元 ID。                                           |
| `REWARDED_AD_VERIFICATION_SECRET`        | 服务端验证广告完成事件所需的密钥或签名 secret。         |
| `REWARDED_AD_MIN_EFFECTIVE_ECPM_USD`     | 低于该有效 eCPM 时暂停广告换额度。                      |
| `REWARDED_AD_CREDIT_EXCHANGE_RATE_DENOM` | 兑换比例分母，例如设置为 `2` 表示 2 次广告换 1 次识别。 |

## 检查配置状态

运行：

```powershell
corepack pnpm env:status
```

这个命令只读取配置，不连接数据库。它会打码显示 `DATABASE_URL` 和 `DATABASE_MIGRATION_URL`，并在连接串仍然指向默认本地数据库时返回警告。

部署前还可以运行更严格的检查：

```powershell
corepack pnpm deployment:config
```

这个命令同样只读取配置，不连接数据库。它要求 `DATABASE_URL` 指向托管 Postgres，且 `SMOKE_BASE_URL`
指向远程部署站点；如果设置了 `APP_BASE_URL`，也必须是远程 `http://` 或 `https://` 站点。如果仍然是本地默认值，会直接失败。

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
# 修改 .env.local 里的 DATABASE_URL 后再执行。
# 如果 DATABASE_URL 是 Neon pooled 连接串，也设置 DATABASE_MIGRATION_URL 为 direct 连接串。
corepack pnpm env:status
corepack pnpm db:setup
corepack pnpm dev
```

也可以不写 `.env.local`，直接在当前 PowerShell 会话中设置：

```powershell
$env:DATABASE_URL="postgres://..."
# 如果 DATABASE_URL 是 Neon pooled 连接串，也设置：
$env:DATABASE_MIGRATION_URL="postgres://..."
corepack pnpm env:status
corepack pnpm db:setup
corepack pnpm dev
```

## 生产部署

当前 MVP 推荐使用 Neon Postgres Singapore 和 `https://schedule.tonimakes.com`。部署平台至少需要设置：

```text
DATABASE_URL=postgres://...
DATABASE_MIGRATION_URL=postgres://...
APP_BASE_URL=https://schedule.tonimakes.com
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_IMPORT_MODEL=gpt-5.6-luna
```

部署后验证生产站点：

```powershell
# 可以写进 .env.local，也可以在当前 shell 设置：
$env:DATABASE_URL="postgres://..."
$env:DATABASE_MIGRATION_URL="postgres://..."
$env:SMOKE_BASE_URL="https://schedule.tonimakes.com"
corepack pnpm deployment:config
corepack pnpm verify:deployment
```

`verify:deployment` 会创建一条归档的 smoke-test 日程。不要在真实用户已经开始使用的生产环境里高频运行。

## 安全注意

- `DATABASE_URL` 和 `DATABASE_MIGRATION_URL` 包含数据库用户名和密码，不能截图、公开贴出或写进 issue。
- `OPENAI_API_KEY` 是第三方 API 密钥，也只能放在本地 `.env.local` 或部署平台环境变量里。
- `ownerUrl` 和 `editUrl` 带有管理或编辑密钥，也不能公开记录。
- 如果怀疑连接串泄露，先在数据库平台轮换密码，再更新部署平台环境变量并重新部署。
