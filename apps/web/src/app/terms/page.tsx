import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "使用条款 | 日程表共享",
  description: "了解使用日程表共享 MVP 时的基本规则、内容边界和服务限制。"
};

const acceptableUseItems = [
  "不要提交违法、骚扰、歧视、侵权、恶意软件或明显垃圾信息。",
  "不要上传或粘贴与排期无关的敏感身份材料、财务信息、医疗记录或他人的私密内容。",
  "不要公开发布管理链接、编辑链接、数据库连接、API key 或其他密钥。",
  "不要用自动化脚本刷创建、提交、广告展示、图片识别或导出接口。"
];

const organizerItems = [
  "组织者负责确认分享范围，并妥善保存管理链接。",
  "组织者应在公开群聊中只分享普通填写链接，不分享管理链接。",
  "如果参与者要求修改或删除自己的提交，组织者应协助处理或通过反馈入口联系维护者。"
];

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <AdPageChrome pageContext="terms">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            返回首页
          </a>

          <header className={styles.header}>
            <p className={styles.eyebrow}>Terms</p>
            <h1>使用条款</h1>
            <p>
              这是日程表共享海外网页版 MVP
              的基础使用规则。它用于说明当前内测服务的边界，不替代正式法律条款；正式公开运营前仍需要按目标地区、广告平台和运营主体做法律审阅。
            </p>
          </header>

          <DisplayAd pageContext="terms" placement="top-banner" />

          <section className={styles.section}>
            <h2>服务用途</h2>
            <p>
              本工具用于创建一次性或短期的多人排期页面，让组织者收集参与者的可用时间、候选时间偏好，并导出或确认最终时间。请只把它用于合法、低风险、与排期相关的场景。
            </p>
          </section>

          <section className={styles.section}>
            <h2>可接受使用</h2>
            <ul>
              {acceptableUseItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <DisplayAd pageContext="terms" placement="inline-results" />

          <section className={styles.section}>
            <h2>组织者责任</h2>
            <ul>
              {organizerItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>数据和链接权限</h2>
            <p>
              公开填写链接、管理链接和参与者编辑链接承担不同权限。拿到管理链接的人可以查看结果、锁定、归档和导出；拿到编辑链接的人可以修改对应参与者的提交。更多说明见{" "}
              <a href="/privacy">隐私与数据保留说明</a>。
            </p>
          </section>

          <section className={styles.section}>
            <h2>广告和付费状态</h2>
            <p>
              当前真实广告、激励广告、付费能力和图片识别公开模式都没有开放。网站保留低干扰外围广告位框架，用于未来覆盖基础服务成本；普通手动填写、文本、CSV
              和 ICS 导入不应被广告强制阻断。
            </p>
          </section>

          <section className={styles.section}>
            <h2>服务限制</h2>
            <p>
              MVP
              可能出现功能调整、临时不可用、数据迁移或内测清理。请不要把它作为医疗、法律、财务、安全生产或其他高风险决策的唯一依据。遇到问题、归档或删除请求，请查看{" "}
              <a href="/feedback">反馈与删除请求</a>。
            </p>
          </section>

          <footer className={styles.footer}>
            <a href="/about">关于本工具</a>
            <a href="/privacy">隐私与数据保留说明</a>
          </footer>

          <DisplayAd pageContext="terms" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
