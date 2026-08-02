import { ArrowLeft, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { PageLanguage } from "../i18n/page-language";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Feedback and Deletion Requests | Schedule Share",
  description:
    "Learn how to report issues, share feedback, request archive or deletion, and avoid exposing management or edit links."
};

const feedbackItems = [
  "The page URL where the issue happened, plus browser and device type.",
  "What you expected to do, and what actually happened.",
  "For time-result issues, include the schedule time zone, date range, and slot length.",
  "If you share a screenshot, remove management keys, edit keys, and private participant details."
];

const deletionItems = [
  "Organizers can use the management link to archive a schedule and stop new submissions.",
  "For manual deletion, provide the public schedule link and the reason for the request.",
  "If organizer proof is needed, only share the management link through a private trusted channel.",
  "Participants who want to remove their own submission should contact the organizer and avoid posting their edit link publicly."
];

function getSupportEmail() {
  const value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined;
}

export default function EnglishFeedbackPage() {
  const supportEmail = getSupportEmail();

  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome pageContext="feedback">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to home
          </a>
          <LanguageSwitcher chineseHref="/zh/feedback" current="en" englishHref="/feedback" />

          <header className={styles.header}>
            <p className={styles.eyebrow}>Feedback</p>
            <h1>Feedback and Deletion Requests</h1>
            <p>
              This page describes how feedback, archive requests, and deletion requests are handled
              during the MVP stage. A dedicated public support email or form should be finalized
              before broad public testing.
            </p>
          </header>

          <DisplayAd pageContext="feedback" placement="top-banner" />

          <section className={styles.notice} aria-label="Current contact status">
            <MessageSquareText aria-hidden="true" size={22} />
            <div>
              <h2>{supportEmail ? "Current contact channel" : "No public form yet"}</h2>
              {supportEmail ? (
                <p>
                  Feedback, archive requests, or deletion requests can be sent to{" "}
                  <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Do not put management
                  links, edit links, or screenshots containing keys in public posts, forums, or
                  group chats.
                </p>
              ) : (
                <p>
                  During internal testing, please use the private channel provided by the organizer.
                  Do not publish management links, edit links, or screenshots containing keys in
                  public posts, forums, or group chats.
                </p>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h2>When Reporting an Issue, Include</h2>
            <ul>
              {feedbackItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <DisplayAd pageContext="feedback" placement="inline-results" />

          <section className={styles.section}>
            <h2>Archive or Deletion Requests</h2>
            <ul>
              {deletionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Please Do Not Send</h2>
            <p>
              Do not send database URLs, backend configuration, unrelated identity documents, or
              public screenshots that contain complete management or edit links.
            </p>
          </section>

          <footer className={styles.footer}>
            <a href="/about">About</a>
            <a href="/privacy">Privacy and Data Retention</a>
            <a href="/terms">Terms</a>
            <a href="/zh/feedback">中文</a>
          </footer>
          <DisplayAd pageContext="feedback" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
