# 环境变量说明

## 原则

- 真实生产密钥只放在部署平台的环境变量里，不提交到 Git。
- 本地开发先运行 `corepack pnpm env:init` 生成 `.env.local`，再按实际数据库连接修改。
- 命令行脚本会自动读取项目根目录的 `.env.local` 和 `.env`；已经在当前 shell 设置的变量优先级最高。
- 改动环境变量后，需要重启本地 dev server 或重新部署生产环境。

## 变量清单

| 变量                                    | 必填 | 使用位置                                              | 示例                                        | 说明                                                                                                                                               |
| --------------------------------------- | ---- | ----------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | 是   | Web API、`db:check`、`smoke:api`、`verify:deployment` | `postgres://user:password@host:5432/dbname` | Postgres 连接串。本地 Docker 默认值见 `.env.example` 和 `compose.yaml`。Neon 可使用 pooled 连接串。                                                |
| `DATABASE_MIGRATION_URL`                | 否   | Drizzle migration、`db:setup`                         | `postgres://user:password@host:5432/dbname` | migration 专用直连 Postgres 连接串。不设置时使用 `DATABASE_URL`。Neon pooled host 含 `-pooler`，migration 建议使用 direct host。                   |
| `APP_BASE_URL`                          | 否   | Web API、`deployment:config`                          | `https://schedule.tonimakes.com`            | 生成 `shareUrl`、`ownerUrl` 和 `editUrl` 时使用的正式站点地址。不设置时按请求 Host 推断。                                                          |
| `NEXT_PUBLIC_SUPPORT_EMAIL`             | 否   | Web 页面                                              | `support@example.com`                       | 公开反馈和删除请求邮箱。会进入前端 bundle；只填写准备公开展示的支持邮箱，不要填写私人邮箱或内部密钥。                                              |
| `OPENAI_API_KEY`                        | 否   | Web API                                               | `sk-...`                                    | 图片课表/排班导入识别的 OpenAI 凭证。这个 key 本身不会开放功能；还必须通过 `AI_IMAGE_IMPORT_ENABLED` 和 release mode。未配置时图片导入返回不可用。 |
| `OPENAI_IMAGE_IMPORT_MODEL`             | 否   | Web API                                               | `gpt-5.6-luna`                              | 图片导入识别使用的 OpenAI Responses API 模型。不设置时默认使用 `gpt-5.6-luna`。                                                                    |
| `AI_IMAGE_IMPORT_ENABLED`               | 否   | Web API                                               | `false`                                     | 图片识别总开关。默认 false；即使配置了 `OPENAI_API_KEY`，这里不是 true 也不会调用 OpenAI。                                                         |
| `AI_IMAGE_IMPORT_RELEASE_MODE`          | 否   | Web API                                               | `off`                                       | 图片识别开放模式：`off`、`local_only`、`internal_test`、`public`。当前 `public` 被代码挡住，直到额度账本和广告验证实现。                           |
| `AI_IMAGE_IMPORT_INTERNAL_TEST_TOKEN`   | 否   | Web API                                               | `change-me`                                 | `internal_test` 模式需要请求头 `x-ai-image-import-test-token` 匹配该值；不要用于公开前端。                                                         |
| `AI_IMAGE_IMPORT_MAX_BYTES`             | 否   | Web API                                               | `4194304`                                   | 图片上传大小上限，不能超过代码硬上限 4MB。                                                                                                         |
| `OPENAI_IMAGE_IMPORT_TIMEOUT_MS`        | 否   | Web API                                               | `15000`                                     | OpenAI 图片识别请求超时；代码硬上限 30 秒。                                                                                                        |
| `OPENAI_IMAGE_IMPORT_MAX_OUTPUT_TOKENS` | 否   | Web API                                               | `2000`                                      | OpenAI 图片识别最大输出 token；代码硬上限 3000。                                                                                                   |
| `OPENAI_IMAGE_IMPORT_MIN_CONFIDENCE`    | 否   | Web API                                               | `0.6`                                       | 低于该整体置信度时返回 `IMPORT_LOW_CONFIDENCE`，用户改用手动、文本、CSV 或 ICS。                                                                   |
| `AI_IMAGE_AD_GATE_READY`                | 否   | Web API                                               | `false`                                     | 公开开放图片识别前的广告门槛确认。当前仅作为硬闸门条件之一，实际广告验证实现前保持 false。                                                         |
| `AI_IMAGE_CREDITS_ENFORCED`             | 否   | Web API                                               | `false`                                     | 公开开放图片识别前的额度账本确认。当前仅作为硬闸门条件之一，实际额度原子消耗/退款实现前保持 false。                                                |
| `AI_IMAGE_COST_GUARDRAIL_ENABLED`       | 否   | Web API                                               | `false`                                     | 公开开放图片识别前的成本护栏确认。当前仅作为硬闸门条件之一，实际全站成本上限和紧急关闭实现前保持 false。                                           |
| `SMOKE_BASE_URL`                        | 否   | `smoke:api`、`deployment:config`、`verify:deployment` | `https://schedule.tonimakes.com`            | 要验证的站点地址。不设置时 `smoke:api` 默认访问 `http://localhost:3000`；部署验证必须显式设置为远程站点。                                          |

## 常驻展示广告变量

常驻展示广告框架已经接入页面和配置检查，但默认关闭，不会加载真实第三方广告脚本。上线真实广告前仍需要通过广告平台审核、补充公开说明页、完善广告版隐私披露，并确认 `deployment:config` 通过。

这些变量里 `NEXT_PUBLIC_*` 会进入前端 bundle，不要写任何 secret；AdSense client / slot ID 不是密钥，但仍建议只在正式准备启用时配置。

| 变量                                      | 必填 | 默认          | 说明                                                                             |
| ----------------------------------------- | ---- | ------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DISPLAY_ADS_ENABLED`         | 否   | `false`       | 常驻展示广告总开关。生产上线真实广告前保持 false。                               |
| `NEXT_PUBLIC_DISPLAY_ADS_PREVIEW`         | 否   | `false`       | 本地或 Preview 看广告位布局用；会显示占位，不代表真实广告可用。                  |
| `NEXT_PUBLIC_DISPLAY_ADS_PROVIDER`        | 否   | `placeholder` | `placeholder` 或 `adsense`。默认只渲染一方占位，不加载第三方脚本。               |
| `NEXT_PUBLIC_DISPLAY_ADS_PLACEHOLDERS`    | 否   | `false`       | 是否显示占位广告框，适合本地视觉检查和内部布局验收。                             |
| `NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE`  | 否   | `internal`    | 带管理/编辑密钥 URL 的广告策略：`off`、`internal` 或 `full`。生产不应设 `full`。 |
| `NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS`   | 否   | 空            | 允许加载真实 AdSense 脚本的域名白名单，例如 `schedule.tonimakes.com`。           |
| `NEXT_PUBLIC_DISPLAY_ADS_TEST_MODE`       | 否   | `false`       | 广告平台测试模式。本地、Preview 和自动化测试不要产生真实广告请求。               |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID`           | 否   | 空            | AdSense client ID，例如 `ca-pub-...`。仅 provider 为 `adsense` 时使用。          |
| `NEXT_PUBLIC_ADSENSE_SLOT_TOP_BANNER`     | 否   | 空            | 顶部横幅广告位 ID。                                                              |
| `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM_BANNER`  | 否   | 空            | 底部横幅广告位 ID。                                                              |
| `NEXT_PUBLIC_ADSENSE_SLOT_INLINE_RESULTS` | 否   | 空            | 结果或说明内容间广告位 ID。                                                      |
| `NEXT_PUBLIC_ADSENSE_SLOT_POST_SUBMIT`    | 否   | 空            | 提交成功后的广告位 ID。                                                          |
| `NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_RAIL`   | 否   | 空            | 桌面左右侧栏广告位 ID。                                                          |
| `NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_ANCHOR`  | 否   | 空            | 移动端可关闭底部 anchor 广告位 ID。                                              |
| `ADS_TXT_PUBLISHER_ID`                    | 否   | 空            | 生成 `/ads.txt` 的 publisher ID。不设置时 `/ads.txt` 返回未配置注释。            |

当前页面位置策略：

- 首页、隐私页、反馈页可以显示顶部、内容间、底部、桌面 rail 和移动 anchor。
- 创建、填写和编辑这类高摩擦页面只在外围或提交后显示广告，不插入表单、时间格、上传预览、候选投票按钮、提交按钮附近。
- 管理页和编辑页这类带 `?key=` 的页面传入 `thirdPartyAllowed=false`；即使将 provider 改成 `adsense`，也不会在这些页面加载第三方广告脚本。

## 计划中的 AI 图片识别额度和激励广告变量

以下变量属于 `docs/monetization.md` 里的后续方案，当前代码尚未读取，不需要在 Vercel 里立即配置：

AI 图片识别和激励广告：

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
AI_IMAGE_IMPORT_ENABLED=false
AI_IMAGE_IMPORT_RELEASE_MODE=off
```

正式公开测试前建议额外设置：

```text
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
```

`OPENAI_API_KEY` 不是当前公开生产必填项。可以先只配置到本地或 Preview 调优；如果已经配置到
Production，也必须保持 `AI_IMAGE_IMPORT_ENABLED=false` 或 `AI_IMAGE_IMPORT_RELEASE_MODE=off`，避免图片识别公开调用
OpenAI。

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
- `NEXT_PUBLIC_SUPPORT_EMAIL` 是公开展示变量，只能放准备公开接收反馈的邮箱。
- `OPENAI_API_KEY` 是第三方 API 密钥，也只能放在本地 `.env.local` 或部署平台环境变量里。
- `OPENAI_API_KEY` 不等于功能开放；公开开放前必须经过图片识别 release mode、额度账本、广告验证和成本护栏。
- `ownerUrl` 和 `editUrl` 带有管理或编辑密钥，也不能公开记录。
- 如果怀疑连接串泄露，先在数据库平台轮换密码，再更新部署平台环境变量并重新部署。
