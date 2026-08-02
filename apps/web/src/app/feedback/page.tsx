import { ArrowLeft, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "反馈与删除请求 | 日程表共享",
  description: "了解如何在内测阶段提交问题反馈、体验建议、归档请求或删除请求。"
};

const feedbackItems = [
  "遇到问题的页面链接、浏览器和设备类型。",
  "你原本想完成的操作，以及实际发生了什么。",
  "如果问题和时间结果有关，请补充日程时区、日期范围和时间粒度。",
  "如果方便，可以附上不包含管理密钥或编辑密钥的截图。"
];

const deletionItems = [
  "组织者可以通过管理链接进入日程页并先归档日程，避免新参与者继续提交。",
  "需要人工删除时，请提供公开日程链接和请求原因。",
  "如需证明组织者身份，只在私信或受信任渠道提供管理链接，不要发到公开群聊。",
  "参与者想删除自己的提交时，请联系日程组织者，并避免公开发送自己的编辑链接。"
];

function getSupportEmail() {
  const value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined;
}

export default function FeedbackPage() {
  const supportEmail = getSupportEmail();

  return (
    <main className={styles.page}>
      <AdPageChrome pageContext="feedback">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            返回首页
          </a>

          <header className={styles.header}>
            <p className={styles.eyebrow}>Feedback</p>
            <h1>反馈与删除请求</h1>
            <p>
              这里先作为内测阶段的处理说明。正式公开测试前，应补充专用联系邮箱或站内表单，并明确处理时限。
            </p>
          </header>

          <DisplayAd pageContext="feedback" placement="top-banner" />

          <section className={styles.notice} aria-label="当前状态">
            <MessageSquareText aria-hidden="true" size={22} />
            <div>
              <h2>{supportEmail ? "当前联系渠道" : "当前还没有公开表单"}</h2>
              {supportEmail ? (
                <p>
                  反馈、归档或删除请求可以发送到{" "}
                  <a href={`mailto:${supportEmail}`}>{supportEmail}</a>。
                  不要在邮件主题、公开群聊、论坛或评论区发布管理链接、编辑链接或含有密钥的截图。
                </p>
              ) : (
                <p>
                  内测期间请通过组织者提供的私下渠道提交反馈。正式公开测试前会补充专用联系邮箱或站内表单。
                  不要在公开群聊、论坛或评论区发布管理链接、编辑链接或含有密钥的截图。
                </p>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h2>提交问题反馈时请包含</h2>
            <ul>
              {feedbackItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <DisplayAd pageContext="feedback" placement="inline-results" />

          <section className={styles.section}>
            <h2>归档或删除请求</h2>
            <ul>
              {deletionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>请不要发送</h2>
            <p>
              不要发送数据库连接、后台配置、与日程无关的身份证件信息，或包含管理链接和编辑链接完整地址的公开截图。
            </p>
          </section>

          <footer className={styles.footer}>
            <a href="/about">关于本工具</a>
            <a href="/privacy">查看隐私与数据保留说明</a>
            <a href="/terms">使用条款</a>
          </footer>
          <DisplayAd pageContext="feedback" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
