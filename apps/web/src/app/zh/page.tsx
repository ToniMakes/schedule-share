import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { PageLanguage } from "../i18n/page-language";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "一起找出适合大家的时间 | Schedule Share",
  description: "分享日程，收集大家方便的时间，查看重叠最多的时段。"
};

const workflowSteps = [
  {
    title: "创建日程",
    description: "选择收集大家的可用时间，或提供几个候选时间。"
  },
  {
    title: "分享链接",
    description: "参与者无需注册账号即可回应。"
  },
  {
    title: "比较并确定",
    description: "查看大家可用时间的重叠，再确认一个时间。"
  }
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="zh-CN" />
      <AdPageChrome pageContext="home">
        <div className={styles.shell}>
          <LanguageSwitcher chineseHref="/zh" current="zh-CN" englishHref="/" />
          <p className={styles.eyebrow}>Schedule Share</p>
          <h1 className={styles.title}>一起找出适合大家的时间</h1>
          <p className={styles.intro}>
            分享一份日程，收集每个人方便的时间，再看看哪些时段最适合大家。
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/zh/new">
              <CalendarPlus aria-hidden="true" size={18} />
              创建日程
            </a>
          </div>

          <DisplayAd pageContext="home" placement="top-banner" />

          <section className={styles.workflow} aria-label="使用流程">
            {workflowSteps.map((step, index) => (
              <article className={styles.step} key={step.title}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </article>
            ))}
          </section>

          <DisplayAd pageContext="home" placement="inline-results" />

          <footer className={styles.footer}>
            <a href="/zh/about">关于本工具</a>
            <a href="/zh/privacy">隐私与数据保留说明</a>
            <a href="/zh/contact">联系</a>
            <a href="/zh/terms">使用条款</a>
            <a href="/">English</a>
          </footer>

          <DisplayAd pageContext="home" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
