import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../../ads/display-ad";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import { PageLanguage } from "../../i18n/page-language";
import { formatPublicOperator, getPublicSiteInfo } from "../../site/public-site-info";
import styles from "../../about/page.module.css";

export const metadata: Metadata = {
  title: "关于 Schedule Share | 跨时区多人日程协调",
  description: "了解 Schedule Share 如何帮助大家收集可用时间、比较重叠时段并一起确定安排。"
};

const featureItems = [
  {
    title: "跨时区协调",
    description: "组织者设置活动时区，参与者按同一份日程填写，结果用统一时间格汇总，减少来回确认。"
  },
  {
    title: "选择回应方式",
    description:
      "可以在网格中标记方便的时间、投票选择候选时间，或从粘贴文本、CSV/ICS 文件、每周模板预填。提交前可以检查预填结果。"
  },
  {
    title: "比较可用时间",
    description: "先查看全员都方便的时间；如果没有，再查看多数人方便的时段。"
  },
  {
    title: "轻量分享",
    description: "参与者无需注册账号即可回应。组织者通过单独的链接查看结果、导出日历或确认时间。"
  }
];

const audienceItems = [
  "海外同学约小组作业、社团活动或周末聚会。",
  "跨城市朋友协调聚餐、旅行讨论或线上语音时间。",
  "小团队安排一次性会议、面试、志愿者排班或临时值班。",
  "老师、助教、社群组织者收集一组人的可用时间。"
];

export default function AboutPage() {
  const publicSiteInfo = getPublicSiteInfo();
  const operatorLine = formatPublicOperator(publicSiteInfo, "zh-CN");

  return (
    <main className={styles.page}>
      <PageLanguage lang="zh-CN" />
      <AdPageChrome pageContext="about">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/zh">
            <ArrowLeft aria-hidden="true" size={17} />
            返回首页
          </a>
          <LanguageSwitcher chineseHref="/zh/about" current="zh-CN" englishHref="/about" />

          <header className={styles.header}>
            <p className={styles.eyebrow}>About</p>
            <h1>一起找出适合大家的时间</h1>
            <p>
              Schedule Share
              帮助大家收集可用时间、比较重叠时段，并一起确定安排。无需注册账号，创建日程后分享链接即可开始。
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="/zh/new">
                <CalendarPlus aria-hidden="true" size={17} />
                创建日程
              </a>
              <a className={styles.secondary} href="/zh/privacy">
                隐私说明
              </a>
            </div>
          </header>

          <DisplayAd pageContext="about" placement="top-banner" />

          <section className={styles.section}>
            <h2>少一些来回确认</h2>
            <p>
              在群聊里协调时间，常常会遇到截图、时区换算和反复确认。Schedule Share
              把大家的回应放在同一页面，组织者可以直接比较时间重叠。
            </p>
            <div className={styles.featureGrid}>
              {featureItems.map((item) => (
                <article className={styles.feature} key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <DisplayAd pageContext="about" placement="inline-results" />

          <section className={styles.section}>
            <h2>适合谁使用</h2>
            <ul>
              {audienceItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>隐私与可选预填</h2>
            <p>
              目前未启用广告。可选预填会先生成预览，供你检查后再提交。分享日程信息前，请阅读
              <a href="/zh/privacy">隐私与数据说明</a>。
            </p>
          </section>

          {operatorLine ? (
            <section className={styles.section}>
              <h2>联系</h2>
              <p>
                公开运营主体：<strong>{operatorLine}</strong>。反馈、归档请求和删除请求可以通过
                <a href="/zh/contact">联系页面</a>发送。
              </p>
            </section>
          ) : null}

          <footer className={styles.footer}>
            <a href="/zh/terms">使用条款</a>
            <a href="/zh/contact">联系</a>
            <a href="/about">English</a>
          </footer>

          <DisplayAd pageContext="about" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
