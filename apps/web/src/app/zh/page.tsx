import { CalendarPlus } from "lucide-react";
import Image from "next/image";
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

const mobileHighlights = [
  {
    title: "随时创建和管理日程",
    description: "用手机创建活动、查看回应，让安排随时跟进。"
  },
  {
    title: "通过分享链接加入",
    description: "粘贴邀请链接或输入日程码即可进入日程，填写或更新可用时间。"
  },
  {
    title: "快速找到合适时段",
    description: "点按或拖动选择时间，比较共同空闲时段，也能随时回到最近日程。"
  }
];

const mobileScreens = [
  {
    src: "/mobile/availability-grid.png",
    alt: "Schedule Share 手机界面，已选中的可用时间格",
    title: "标记方便的时间"
  },
  {
    src: "/mobile/common-free-results.png",
    alt: "Schedule Share 手机界面，显示大家共同空闲的时段",
    title: "比较共同空闲时段"
  },
  {
    src: "/mobile/my-schedules.png",
    alt: "Schedule Share 手机界面，显示可打开的最近日程",
    title: "随时继续安排"
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

          <section className={styles.mobileShowcase} aria-labelledby="mobile-title">
            <div className={styles.mobileIntro}>
              <p className={styles.eyebrow}>Schedule Share 手机端</p>
              <h2 id="mobile-title">走到哪里，都能安排大家的时间</h2>
              <p>
                用手机创建和管理日程，通过分享链接或日程码加入；填写可用时间、查看结果，都能一气呵成。
              </p>
              <ul className={styles.mobileHighlights}>
                {mobileHighlights.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.mobileScreens}>
              {mobileScreens.map((screen) => (
                <figure className={styles.mobileScreen} key={screen.src}>
                  <div className={styles.mobileScreenImage}>
                    <Image src={screen.src} alt={screen.alt} width={1170} height={2370} />
                  </div>
                  <figcaption>{screen.title}</figcaption>
                </figure>
              ))}
            </div>
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
