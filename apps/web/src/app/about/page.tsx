import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { PageLanguage } from "../i18n/page-language";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About Schedule Share | Cross-time-zone scheduling",
  description:
    "Learn how Schedule Share helps groups collect availability, compare overlap, vote on candidate times, and export calendar files."
};

const featureItems = [
  {
    title: "Cross-time-zone planning",
    description:
      "Organizers choose the event time zone, while participants fill one shared schedule. Results stay aligned to the same time grid."
  },
  {
    title: "Multiple entry methods",
    description:
      "The current MVP supports manual availability grids, candidate time voting, text import, CSV import, ICS import, and a guarded image-import preview path."
  },
  {
    title: "Best-time recommendations",
    description:
      "The results page highlights full-group overlap first, then lists the best partial matches when no time works for everyone."
  },
  {
    title: "Lightweight sharing",
    description:
      "Participants do not need an account. Organizers use a private management link to review results, export calendars, or confirm the final time."
  }
];

const audienceItems = [
  "Students planning group projects, club events, or weekend meetups across countries.",
  "Friends coordinating meals, trips, calls, or online hangouts across cities.",
  "Small teams arranging interviews, volunteer shifts, community events, or one-off meetings.",
  "Teachers, tutors, and community organizers collecting availability from a small group."
];

export default function EnglishAboutPage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome pageContext="about">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to home
          </a>
          <LanguageSwitcher chineseHref="/zh/about" current="en" englishHref="/about" />

          <header className={styles.header}>
            <p className={styles.eyebrow}>About</p>
            <h1>A lightweight shared scheduling tool for cross-time-zone groups</h1>
            <p>
              Schedule Share helps organizers collect availability from a group and quickly find
              time slots that work for everyone, or for the largest number of people. It is built
              for one-off scheduling where a link is faster than asking everyone to create an
              account.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="/new">
                <CalendarPlus aria-hidden="true" size={17} />
                Create Schedule
              </a>
              <a className={styles.secondary} href="/privacy">
                View Privacy
              </a>
            </div>
          </header>

          <DisplayAd pageContext="about" placement="top-banner" />

          <section className={styles.section}>
            <h2>What problem does it solve?</h2>
            <p>
              Group chats often turn into a messy stream of screenshots, time-zone conversions, and
              tentative answers. Schedule Share turns that into one shared page: participants submit
              availability, and organizers see a clear overlap summary.
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
            <h2>Who is it for?</h2>
            <ul>
              {audienceItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Advertising and AI status</h2>
            <p>
              The site has a reserved display-ad framework and an <code>/ads.txt</code> route, but
              real ads are off by default. Future display ads should stay outside form fields, time
              grids, upload previews, submit buttons, and URLs that contain management or edit keys.
            </p>
            <p>
              Image schedule recognition is treated as a cost-sensitive advanced feature. It remains
              behind feature flags, release-mode checks, cost guardrails, and future credit or
              rewarded-ad validation. Manual entry, text import, CSV import, and ICS import remain
              available as non-AI paths.
            </p>
          </section>

          <footer className={styles.footer}>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
            <a href="/zh/about">中文</a>
          </footer>

          <DisplayAd pageContext="about" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
