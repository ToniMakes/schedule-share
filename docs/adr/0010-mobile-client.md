# ADR 0010: Expo 手机客户端

## 状态

采用（移动端创建和组织者管理能力已实现；Android 模拟器验收和真机验收均已完成）。

## 背景

schedule-share 需要一个可演示的原生手机客户端，同时复用现有时间领域逻辑和 API。Web 端继续使用自己的 React 版本，移动端必须使用与其 Expo SDK 配套的 React Native 版本。

## 决策

- 新客户端放在 `apps/mobile`，使用 Expo SDK 57、React Native 0.86 和 TypeScript；不使用 WebView。
- 保留 pnpm 默认 isolated workspace。Metro 在这台 Windows 开发机上无法解析 pnpm hardlink 导入的 React 入口；设置仓库 `.npmrc` 的 `package-import-method=copy` 后，Android bundle 成功。未添加手写 `metro.config.js`、`watchFolders` 或 `nodeModulesPaths`。
- `packages/core` 负责生成日程时间格和规范提交草稿；共同空闲结果直接使用现有 API 响应，避免第二套汇总计算。
- `apps/mobile` 通过 API 的公开日程 ID 读取日程，使用已有参与者接口提交和编辑。服务端仍是共享日程和可用时间的唯一权威来源。
- 手机端可创建开放网格或候选时间日程；持有组织者密钥时可锁定、归档和确认最终时间，权限继续由现有 API 校验。
- 手机端接受分享码或粘贴的网页分享/管理链接。普通 HTTPS 链接直接唤起 App 的系统级关联尚未配置；不将自定义 scheme 解析等同于已发布域名关联。
- 自定义 scheme `scheduleshare://s/<id>`（及 `…/manage?key=`）经 `src/app/+native-intent.tsx` 转给首页，与粘贴链接共用 `src/share-link.ts` 的解析；组织者链接里的密钥只在 `/manage` 路径下读取。
- 组织者密钥与参与者编辑密钥一样只存设备 SecureStore（Web 预览退回 AsyncStorage），不写入 Firestore，也不进入 `SavedRoom` 的云端副本。
- Firebase Auth 匿名身份和 Firestore 只用于手机用户资料与最近加入日程列表。规则只允许认证用户访问 `users/{uid}` 和其 `rooms` 子集合。API 返回的参与者编辑密钥只存设备 SecureStore，不同步到 Firestore。
- AsyncStorage 保存资料、最近日程列表和未提交草稿；Firebase 未配置或不可用时，客户端核心 API 流程继续工作。
- 时间格支持点按；长按 300ms 后进入连续涂选。涂选从时间格区域开始，以释放滚动为优先的单一手势方案；时间计算仍交由 core。

## 兼容性检查

- Expo SDK 57 模板使用 React 19.2.3 / React Native 0.86.3；Web 使用 React 19.1.1。两个应用各自声明对应依赖，不共享 React Native runtime。
- core 只依赖 Luxon；api-client 使用 fetch、URL、URLSearchParams 和 DOM 型别，没有 Node、Next.js、DOM 渲染或浏览器存储导入。SDK 57 Hermes 的时区和夏令时已在 Expo Go 中验证（见下文后续验证）。
- Expo 官方 monorepo 指南确认 SDK 54 起支持 pnpm isolated 安装，SDK 55 起自动执行原生模块解析检查。此 Windows 工作区的 Metro 无法识别 pnpm hardlink 文件入口；保留 isolated linker，仅把包从 store 复制到 virtual store 来解决。当前机器上的 pnpm 10 构建脚本审批策略阻止了依赖安装脚本，安装时显式使用 `--ignore-scripts`，没有修改脚本审批列表。
- 2026-10-08 复查：上述 Metro 读取失败的根因是 `node_modules` 里的文件带有 OneDrive 云文件重解析点（标记 `0x9000601a`；该项目曾在 OneDrive 目录中安装），Windows 上 Node 的目录读取会把它们当成符号链接，Metro 对其调用 `readlink` 得到 `EINVAL`。删除全部 `node_modules` 后用 `corepack pnpm install --ignore-scripts` 重装，文件不再带标记，Metro 开发服务器和 Android 开发包均正常。若依赖再次从 OneDrive 同步目录带入，会复发；应把 `node_modules` 排除出 OneDrive 同步。

## 后续验证

- 已通过（既有基线）：移动端 TypeScript 检查、lint、单元测试、Android Expo bundle 导出、Expo Doctor（21/21）、Firestore Emulator 规则测试（2 项）、仓库测试、lint、类型检查和 Web production build。新增的创建/管理能力及其测试以本次提交的 CI 结果为准。
- 已在 Android 16（API 36）模拟器 + Expo Go 验收（2026-10-08，Windows WHPX 加速，API 为本机内存假服务）：
  `scheduleshare://` 深链（经 Expo Go 的 `exp://…/--/` 形式）、点按与长按拖动涂选、拖动不抢纵向滚动、软键盘不遮挡输入框、系统字体 1.6 倍布局，以及 Sydney 夏令时切换日（2026-10-04 少 1 个小时格，2027-04-04 多 1 个，数量均与预期一致）。
  验收中修复了三处：Android 上状态栏和手势条压住内容（改用 `react-native-safe-area-context` 的 `SafeAreaView`）；时间格触点映射因宽度按外层容器估算而整体错位一格（改为测量手势区域本身）；大字体下时间格文字被固定高度裁切（文字上限 1.3 倍，格高随之增长）。
- 真机验收已于 2026-10-08 完成（由项目负责人确认；具体设备、系统版本和逐项结果未在此记录）。
- 已知展示：秋季回拨日重复的小时会显示为两个 02:00，与网站一致，暂未区分。
- Firebase 项目已于 2026-10-08 配置（Spark 免费方案）：启用匿名认证（未启用匿名账号自动清理，避免 30 天后断开云端记录）；Cloud Firestore 标准版，生产模式，区域 australia-southeast1（悉尼，创建后不可更改）；已发布与仓库 `firestore.rules` 相同的规则；已注册一个 Web 应用，配置值通过 `apps/mobile/.env` 的 `EXPO_PUBLIC_FIREBASE_*` 提供（公开客户端配置，`.env` 不入库）。用真实项目验证：匿名登录、写读自己的 `users/{uid}/rooms` 记录、读取他人记录被拒绝、写入未列出的集合被拒绝，均符合预期。未启用 Firebase 的构建（四个变量留空）仍可正常使用。
- 仍待产品验收：普通 HTTPS 分享链接的系统级直达唤起仍未接通；创建和组织者管理已进入当前 MVP，真机验收已完成。
