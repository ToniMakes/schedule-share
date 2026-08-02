import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "关于日程表共享 | 日程表共享",
  description: "了解日程表共享如何帮助跨时区团队、同学、社群和朋友快速协调可用时间。"
};

const featureItems = [
  {
    title: "跨时区共享",
    description: "组织者设置活动时区，参与者按同一份日程填写，结果用统一时间格汇总，减少来回确认。"
  },
  {
    title: "多种填写方式",
    description:
      "当前支持手动时间格、候选时间投票、文本粘贴、CSV、ICS 和受闸门保护的图片导入预览路径。"
  },
  {
    title: "自动推荐时间",
    description:
      "系统会优先展示全员可用时间；没有全员共同时间时，也会列出覆盖人数最多的较优时间槽。"
  },
  {
    title: "轻量分享",
    description:
      "参与者不需要注册账号，打开链接即可填写；组织者用管理链接查看结果、导出日历或确认最终时间。"
  }
];

const audienceItems = [
  "海外同学约小组作业、社团活动或周末聚会。",
  "跨城市朋友协调聚餐、旅行讨论或线上语音时间。",
  "小团队安排一次性会议、面试、志愿者排班或临时值班。",
  "老师、助教、社群组织者收集一组人的可用时间。"
];

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <AdPageChrome pageContext="about">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            返回首页
          </a>
          <LanguageSwitcher chineseHref="/about" current="zh-CN" englishHref="/en/about" />

          <header className={styles.header}>
            <p className={styles.eyebrow}>About</p>
            <h1>一个轻量的跨时区多人日程共享工具</h1>
            <p>
              日程表共享用于快速收集大家的可用时间，并自动找出最适合沟通、见面或协作的时间段。它优先服务一次性排期场景：不用建账号，不用安装应用，把链接发出去就能开始。
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="/new">
                <CalendarPlus aria-hidden="true" size={17} />
                创建日程
              </a>
              <a className={styles.secondary} href="/privacy">
                查看隐私说明
              </a>
            </div>
          </header>

          <DisplayAd pageContext="about" placement="top-banner" />

          <section className={styles.section}>
            <h2>这个工具解决什么问题</h2>
            <p>
              群聊里问“大家什么时候有空”很容易变成一串时间、截图和时区换算。这个网站把这些信息收进一个共享页面，参与者只提交自己的可用时间，组织者直接查看重叠结果和推荐时间。
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
            <h2>当前商业化状态</h2>
            <p>
              网站已经预留常驻广告位框架和 <code>/ads.txt</code>{" "}
              路由，但真实广告默认关闭。未来如果开放展示广告，也会避开表单、时间格、上传预览、提交按钮和带管理/编辑密钥的敏感页面。
            </p>
            <p>
              图片识别属于可能产生成本的高级入口，目前仍受功能开关、release
              mode、成本护栏和广告额度方案限制；手动填写、文本、CSV 和 ICS 方式仍保持免费可用。
            </p>
          </section>

          <footer className={styles.footer}>
            <a href="/terms">使用条款</a>
            <a href="/feedback">反馈与删除请求</a>
            <a href="/en/about">English</a>
          </footer>

          <DisplayAd pageContext="about" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
