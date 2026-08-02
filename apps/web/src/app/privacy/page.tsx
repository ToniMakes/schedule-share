import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "隐私与数据保留说明 | 日程表共享",
  description: "了解日程表共享 MVP 会保存哪些数据、用途、链接权限和默认保留时间。"
};

const dataItems = [
  "组织者填写的日程标题、说明、时区、日期范围和可选时间窗口。",
  "参与者填写的显示名称和选择的可用时间。",
  "浏览器本机会保存上次成功提交或编辑的显示名称，用于下次预填。",
  "浏览器本机会按日程保存自己的编辑链接，用于同一浏览器再次修改提交。",
  "浏览器本机会保存上次成功使用的每周模板星期和时间段，也会保存用户主动保存的多个本机每周模板，用于下次模板预填。",
  "浏览器本机会保存上次成功创建日程时使用的模式、时区、时间粒度和开放网格时间范围，用于下次预填。",
  "系统生成的分享链接、管理链接和编辑链接所需的随机标识或密钥哈希。",
  "创建时间、更新时间、过期时间和日程状态。"
];

const usageItems = [
  "创建和展示日程房间。",
  "让参与者提交或修改自己的可用时间。",
  "计算所有人都有空或多数人有空的候选时间。",
  "让组织者查看结果、导出 CSV、锁定或归档日程。"
];

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <a className={styles.backLink} href="/">
          <ArrowLeft aria-hidden="true" size={17} />
          返回首页
        </a>

        <header className={styles.header}>
          <p className={styles.eyebrow}>Privacy</p>
          <h1>隐私与数据保留说明</h1>
          <p>
            这是海外网页版 MVP
            的简版说明，用来解释这个工具会保存哪些数据、为什么保存，以及链接权限意味着什么。正式公开上线前仍需要按目标地区做法律审阅。
          </p>
        </header>

        <section className={styles.section}>
          <h2>我们收集什么</h2>
          <p>当前版本不要求注册账号，不主动收集邮箱、手机号、微信号或日历账号。</p>
          <ul>
            {dataItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>这些数据用来做什么</h2>
          <ul>
            {usageItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>当前 MVP 不会把核心填写流程中的数据用于广告定向、第三方营销或训练模型。</p>
        </section>

        <section className={styles.section}>
          <h2>链接就是权限</h2>
          <p>
            拿到公开分享链接的人可以查看日程和提交可用时间；拿到管理链接的人可以导出、锁定或归档日程；拿到编辑链接的人可以修改对应参与者的提交。
          </p>
          <p>请不要把管理链接或编辑链接公开发布。</p>
        </section>

        <section className={styles.section}>
          <h2>保留时间</h2>
          <p>
            MVP 默认日程在创建后 90
            天过期。过期日程可先归档，后续再删除。当前版本没有自助删除按钮；需要处理时请查看
            <a href="/feedback">反馈与删除请求</a>。
          </p>
        </section>

        <section className={styles.section}>
          <h2>安全原则</h2>
          <p>
            数据库存储精确时间统一使用 UTC。服务端只保存管理密钥和编辑密钥的哈希，不保存明文密钥。
          </p>
        </section>
      </div>
    </main>
  );
}
