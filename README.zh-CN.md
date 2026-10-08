# Schedule Share

**一起找出适合大家的时间。** Schedule Share 帮助不同日期、不同地区的人比较可用时间，再一起确定安排。

[English](README.md) · [简体中文](README.zh-CN.md) · [打开网页版](https://schedule.tonimakes.com/zh)

## 使用流程

1. 创建日程，选择开放可用时间网格或候选时间投票。
2. 分享参与者填写链接。参与者无需注册账号即可回应。
3. 查看时间重叠或投票结果，再确认最终时间。

网页版支持开放时间网格、候选时间三态投票、从粘贴文本、CSV/ICS 文件或每周模板预填、查看共享结果和导出日历。日期和时间范围按日程时区解释。

## 手机应用

原生 Expo 应用目前处于 MVP 阶段，可加入已有日程、提交或更新回应并查看共享结果；暂不支持创建日程和组织者管理。直接打开分享链接、设备时区/夏令时和触控体验仍需真机验收。运行方法与限制见 [apps/mobile/README.md](apps/mobile/README.md)。

## 本地运行

网页版开发需要 Node.js、通过 Corepack 使用 pnpm，并使用 Docker 启动本地 Postgres。

```powershell
corepack pnpm install --ignore-scripts
corepack pnpm env:init
corepack pnpm db:up
corepack pnpm db:migrate:local
corepack pnpm dev:local
```

启动后访问 `http://localhost:3000`。环境配置选项见[环境文档](docs/environment.md)，部署检查见[部署文档](docs/deployment.md)。

## 仓库结构

```text
apps/
  web/                 Next.js 网页应用
  mobile/              Expo + React Native 手机应用
packages/
  core/                共享时间和可用性逻辑
  db/                  PostgreSQL 结构和数据访问
  api-client/          类型化 API 客户端与契约
docs/                  产品、API、架构和运行文档
scripts/               开发和部署工具
```

## 项目文档

- [产品范围](docs/product.md)
- [架构与模块边界](docs/architecture.md)
- [API 契约](docs/api.md)
- [本地环境配置](docs/environment.md)
- [项目状态与已知限制](docs/project-status.md)

## 反馈

可以通过[应用内反馈页](https://schedule.tonimakes.com/zh/feedback)提交意见，也可以查看[联系页面](https://schedule.tonimakes.com/zh/contact)。
