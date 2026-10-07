# ADR 0010: Expo 手机客户端

## 状态

采用（MVP 已实现；真机和实际 Firebase 项目验收待完成）。

## 背景

schedule-share 需要一个可演示的原生手机客户端，同时复用现有时间领域逻辑和 API。Web 端继续使用自己的 React 版本，移动端必须使用与其 Expo SDK 配套的 React Native 版本。

## 决策

- 新客户端放在 `apps/mobile`，使用 Expo SDK 57、React Native 0.86 和 TypeScript；不使用 WebView。
- 保留 pnpm 默认 isolated workspace。Metro 在这台 Windows 开发机上无法解析 pnpm hardlink 导入的 React 入口；设置仓库 `.npmrc` 的 `package-import-method=copy` 后，Android bundle 成功。未添加手写 `metro.config.js`、`watchFolders` 或 `nodeModulesPaths`。
- `packages/core` 负责生成日程时间格和规范提交草稿；共同空闲结果直接使用现有 API 响应，避免第二套汇总计算。
- `apps/mobile` 通过 API 的公开日程 ID 读取日程，使用已有参与者接口提交和编辑。服务端仍是共享日程和可用时间的唯一权威来源。
- Firebase Auth 匿名身份和 Firestore 只用于手机用户资料与最近加入日程列表。规则只允许认证用户访问 `users/{uid}` 和其 `rooms` 子集合。API 返回的参与者编辑密钥只存设备 SecureStore，不同步到 Firestore。
- AsyncStorage 保存资料、最近日程列表和未提交草稿；Firebase 未配置或不可用时，客户端核心 API 流程继续工作。
- 时间格支持点按；长按 300ms 后进入连续涂选。涂选从时间格区域开始，以释放滚动为优先的单一手势方案；时间计算仍交由 core。

## 兼容性检查

- Expo SDK 57 模板使用 React 19.2.3 / React Native 0.86.3；Web 使用 React 19.1.1。两个应用各自声明对应依赖，不共享 React Native runtime。
- core 只依赖 Luxon；api-client 使用 fetch、URL、URLSearchParams 和 DOM 型别，没有 Node、Next.js、DOM 渲染或浏览器存储导入。SDK 57 Hermes 真机时区和夏令时验证仍须在 Expo Go 中完成。
- Expo 官方 monorepo 指南确认 SDK 54 起支持 pnpm isolated 安装，SDK 55 起自动执行原生模块解析检查。此 Windows 工作区的 Metro 无法识别 pnpm hardlink 文件入口；保留 isolated linker，仅把包从 store 复制到 virtual store 来解决。当前机器上的 pnpm 10 构建脚本审批策略阻止了依赖安装脚本，安装时显式使用 `--ignore-scripts`，没有修改脚本审批列表。

## 后续验证

- 已通过：移动端 TypeScript 检查、lint、单元测试、Android Expo bundle 导出、Expo Doctor（21/21）、Firestore Emulator 规则测试（2 项）、仓库测试、lint、类型检查和 Web production build。
- 仍待真机：用 Expo Go 核对 Sydney 夏令时切换日的时间格与网站一致，并验证长按拖动与滚动冲突。
- 仍待项目配置：如需跨设备同步，在 Firebase 项目启用匿名认证、创建 Firestore 并部署 `firestore.rules`；不开启 Firebase 时，本机资料与草稿仍可用。
- 仍待产品验收：直接打开分享链接、日程创建和组织者管理不属于当前 MVP；需在后续迭代中决定范围。
