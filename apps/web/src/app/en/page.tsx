import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { PageLanguage } from "../i18n/page-language";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Schedule Share | Cross-time-zone availability planner",
  description:
    "Create a shared scheduling page, collect availability across time zones, vote on candidate times, and export the final time to a calendar."
};

const workflowSteps = [
  {
    title: "Create",
    description: "Set the date range, time zone, daily time window, and slot length."
  },
  {
    title: "Share",
    description:
      "Invite people with a link. Participants can fill in availability without an account."
  },
  {
    title: "Decide",
    description:
      "See overlapping availability, best partial matches, candidate votes, and calendar exports."
  }
];

export default function EnglishHomePage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome pageContext="home">
        <div className={styles.shell}>
          <LanguageSwitcher chineseHref="/" current="en" englishHref="/en" />
          <p className={styles.eyebrow}>Schedule Share</p>
          <h1 className={styles.title}>Find the time everyone can make</h1>
          <p className={styles.intro}>
            A lightweight shared scheduling tool for cross-time-zone groups. Create a schedule,
            collect availability, compare the group overlap, and export the final time.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/en/new">
              <CalendarPlus aria-hidden="true" size={18} />
              Create Schedule
            </a>
          </div>

          <DisplayAd pageContext="home" placement="top-banner" />

          <section className={styles.workflow} aria-label="Core workflow">
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
            <a href="/en/about">About</a>
            <a href="/en/privacy">Privacy</a>
            <a href="/en/feedback">Feedback and deletion requests</a>
            <a href="/en/terms">Terms</a>
            <a href="/">中文</a>
          </footer>

          <DisplayAd pageContext="home" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
