# Web App

`apps/web` 是海外网页版入口，负责页面路由、表单交互、移动端体验和结果展示。

## 边界

- 可以调用 `packages/api-client`。
- 可以使用 `packages/core` 暴露的纯函数做本地预览和展示辅助。
- 不直接实现排期交集算法。
- 服务端代码只通过 `src/server` 仓库层操作数据库；页面和客户端组件不直接依赖表结构。

## 首批页面

- `/`：首页入口。
- `/new`：创建日程。
- `/s/[publicId]`：查看日程配置、提交可用时间和查看当前结果。
- `/s/[publicId]/manage`：组织者查看结果和锁定日程。
- `/s/[publicId]/edit/[participantId]`：参与者编辑已提交的可用时间。
