# 真实广告上线清单

更新日期：2026-08-03

本清单只覆盖常驻展示广告从“准备审核”到“小流量上线”的执行步骤。激励广告换 AI 图片识别额度属于后续单独链路，不能用普通展示广告替代。

## 当前状态

- 真实广告默认关闭，不会向第三方广告平台发请求。
- `/contact` 已作为公开联系主入口，`/feedback` 继续作为兼容说明页。
- Vercel Production/Preview 已配置 `NEXT_PUBLIC_SUPPORT_EMAIL=hello@tonimakes.com`，生产 `/contact` 已验证能显示该公开支持邮箱。
- Vercel Production/Preview 已配置 `NEXT_PUBLIC_SITE_OPERATOR_NAME=Toni Liu` 和 `NEXT_PUBLIC_SITE_OPERATOR_REGION=Australia`；生产 `/contact`、`/about`、`/privacy`、`/terms` 和 `/zh/contact` 已验证能显示公开运营主体。
- `/about`、`/privacy`、`/contact`、`/feedback`、`/terms`、`/robots.txt`、`/sitemap.xml` 和 `/ads.txt` 已有公开路由。
- 带 `?key=` 的管理页和编辑页不会加载第三方广告脚本。
- `deployment:config` 已把真实 AdSense 开启前置条件变成硬闸门。

## Phase 1：公开资产准备

- 确认生产域名 `https://schedule.tonimakes.com` 可访问。
- 专用公开支持邮箱已使用 `hello@tonimakes.com`，后续站内表单可在用户反馈管理系统稳定后再接入。
- Vercel Production 和 Preview 已设置 `NEXT_PUBLIC_SUPPORT_EMAIL` 并重新部署。
- `/contact` 已展示公开联系方式，且页面提示不要公开发送管理密钥、编辑密钥或隐私截图。
- 公开运营主体已按个人主体试水方案配置为 `Toni Liu` / `Australia`，并已重新部署；这些信息会公开展示，后续如改为公司主体再同步更新 Vercel 环境变量和公开页面。
- 检查 `/privacy` 和 `/terms` 的广告、cookie、AI 图片识别和数据保留说明。
- 继续保持 `NEXT_PUBLIC_DISPLAY_ADS_ENABLED=false`。

## Phase 2：AdSense 申请

- 当前建议按个人主体申请，降低一人零流水公司带来的税务和资料复杂度；如后续改为公司收款，再重新评估账号主体、银行账户和税务资料。
- 在 AdSense 添加站点 `schedule.tonimakes.com`。
- 只填写广告平台要求的账号、地址、网站和公开政策页面信息。
- 不在广告后台填写数据库 URL、OpenAI key、Vercel/Neon 凭证或其他密钥。
- 站点审核期间仍保持真实广告关闭，除非平台要求放置审核代码且代码路径经过检查。

## Phase 3：ads.txt 和广告配置

- 拿到 publisher ID 后，在 Vercel 设置 `ADS_TXT_PUBLISHER_ID`。
- 设置 AdSense client 和广告位 slot 环境变量。
- 设置 `NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS=schedule.tonimakes.com`。
- 确认 `/ads.txt` 在生产域名返回正式记录。
- 只有完成隐私披露、政策审阅和 consent 策略后，才把以下确认项设为 `true`：
  - `ADS_PRIVACY_DISCLOSURE_READY`
  - `ADS_POLICY_REVIEW_READY`
  - `ADS_CONSENT_STRATEGY_READY`

## Phase 4：小流量真实广告

- 先只在公开说明页、首页和低风险结果页启用真实广告。
- 创建、填写、编辑、导入预览和提交区继续保持无广告。
- 管理页和编辑页在密钥 URL 迁移前继续不加载第三方广告脚本。
- 不自点广告，不请朋友点击广告，不在页面诱导点击。
- 观察真实广告请求、页面布局、移动端遮挡、创建率和填写完成率。
- 若出现无效流量、遮挡、布局跳动或提交率明显下降，立即关闭 `NEXT_PUBLIC_DISPLAY_ADS_ENABLED`。

## Phase 5：后续再接激励广告

- 普通 AdSense 展示广告不能用于“看广告换 AI 识别次数”。
- 激励广告必须使用支持用户主动 opt-in、奖励事件和服务端验证的 provider。
- 接入激励广告前，先完成免费额度发放、广告事件去重、动态成本计数和紧急关闭开关。
