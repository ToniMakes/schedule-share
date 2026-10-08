import { CalendarPlus } from "lucide-react";
import Image from "next/image";
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

const mobileHighlights = [
  {
    title: "Create and manage on the go",
    description: "Set up a schedule, review responses, and keep your event moving from your phone."
  },
  {
    title: "Join from a shared link",
    description: "Paste an invitation link or enter a schedule code to open a schedule in the app."
  },
  {
    title: "Find the time that works",
    description:
      "Tap or drag across time slots, compare the overlap, and return to recent schedules."
  }
];

const mobileScreens = [
  {
    src: "/mobile/availability-grid.png",
    alt: "Schedule Share mobile screen with selected availability time slots",
    title: "Mark your availability"
  },
  {
    src: "/mobile/common-free-results.png",
    alt: "Schedule Share mobile screen showing common free times",
    title: "Compare common free times"
  },
  {
    src: "/mobile/my-schedules.png",
    alt: "Schedule Share mobile screen with a recent schedule ready to open",
    title: "Pick up where you left off"
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

          <section className={styles.mobileShowcase} aria-labelledby="mobile-title">
            <div className={styles.mobileIntro}>
              <p className={styles.eyebrow}>Schedule Share for mobile</p>
              <h2 id="mobile-title">Your group schedule, wherever you are</h2>
              <p>
                Create and manage schedules on your phone, join with a shared link or schedule code,
                and find a time that works wherever you are.
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
