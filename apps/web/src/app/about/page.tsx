import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { PageLanguage } from "../i18n/page-language";
import { formatPublicOperator, getPublicSiteInfo } from "../site/public-site-info";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About Schedule Share | Group scheduling across time zones",
  description:
    "Learn how Schedule Share helps groups collect availability, compare times, and choose a time together."
};

const featureItems = [
  {
    title: "Plan across time zones",
    description:
      "Organizers choose the event time zone, while participants fill one shared schedule. Results stay aligned to the same time grid."
  },
  {
    title: "Choose how to respond",
    description:
      "Mark your availability on a grid, vote on proposed times, or prefill from pasted text, a CSV or ICS file, or a weekly template. Review suggested times before submitting."
  },
  {
    title: "Compare available times",
    description:
      "See times that work for everyone first, followed by options that work for the most people."
  },
  {
    title: "Lightweight sharing",
    description:
      "Participants do not need an account. Organizers use a separate link to review results, export calendars, or confirm a time."
  }
];

const audienceItems = [
  "Students planning group projects, club events, or weekend meetups across countries.",
  "Friends coordinating meals, trips, calls, or online hangouts across cities.",
  "Small teams arranging interviews, volunteer shifts, community events, or one-off meetings.",
  "Teachers, tutors, and community organizers collecting availability from a small group."
];

export default function EnglishAboutPage() {
  const publicSiteInfo = getPublicSiteInfo();
  const operatorLine = formatPublicOperator(publicSiteInfo, "en");

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
                Create a schedule
              </a>
              <a className={styles.secondary} href="/privacy">
                View privacy
              </a>
            </div>
          </header>

          <DisplayAd pageContext="about" placement="top-banner" />

          <section className={styles.section}>
            <h2>Find a time without the back-and-forth</h2>
            <p>
              Group chats can fill up with screenshots, time-zone conversions, and tentative
              answers. Schedule Share gathers responses on one page so organizers can compare the
              overlap.
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
            <h2>Privacy and optional imports</h2>
            <p>
              Ads are currently off. Optional prefill tools create a preview for you to review
              before you submit. Read the <a href="/privacy">privacy and data details</a> before
              sharing schedule information.
            </p>
          </section>

          {operatorLine ? (
            <section className={styles.section}>
              <h2>Contact</h2>
              <p>
                Public operator: <strong>{operatorLine}</strong>. Feedback, archive requests, and
                deletion requests can be sent through the <a href="/contact">contact page</a>.
              </p>
            </section>
          ) : null}

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
