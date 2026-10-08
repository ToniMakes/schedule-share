import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "./ads/display-ad";
import { LanguageSwitcher } from "./i18n/language-switcher";
import { PageLanguage } from "./i18n/page-language";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Schedule Share | Find a time that works for your group",
  description:
    "Share a schedule, collect your group's availability, compare overlapping times, and choose a time together."
};

const workflowSteps = [
  {
    title: "Create a schedule",
    description: "Choose an availability grid or suggest a few time options."
  },
  {
    title: "Share the link",
    description: "Participants can respond without creating an account."
  },
  {
    title: "Compare and decide",
    description: "See where your group's availability overlaps, then confirm a time."
  }
];

export default function EnglishHomePage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome pageContext="home">
        <div className={styles.shell}>
          <LanguageSwitcher chineseHref="/zh" current="en" englishHref="/" />
          <p className={styles.eyebrow}>Schedule Share</p>
          <h1 className={styles.title}>Find a time that works for your group</h1>
          <p className={styles.intro}>
            Share a schedule, collect everyone's availability, and compare the times that work best.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/new">
              <CalendarPlus aria-hidden="true" size={18} />
              Create a schedule
            </a>
          </div>

          <DisplayAd pageContext="home" placement="top-banner" />

          <section className={styles.workflow} aria-label="How it works">
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
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/contact">Contact</a>
            <a href="/terms">Terms</a>
            <a href="/zh">中文</a>
          </footer>

          <DisplayAd pageContext="home" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
