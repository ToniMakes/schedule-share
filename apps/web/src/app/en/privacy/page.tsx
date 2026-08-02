import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../../ads/display-ad";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import { PageLanguage } from "../../i18n/page-language";
import styles from "../../privacy/page.module.css";

export const metadata: Metadata = {
  title: "Privacy and Data Retention | Schedule Share",
  description:
    "Learn what Schedule Share stores, how scheduling links work, how ads and AI image recognition are gated, and how schedule data is retained."
};

const dataItems = [
  "Schedule title, description, time zone, date range, available daily time windows, and slot length entered by the organizer.",
  "Participant display names and selected availability or candidate-time vote responses.",
  "Local browser memory for a recently used display name, edit link, weekly template, and create-schedule defaults.",
  "Random identifiers or hashed access keys needed for share links, management links, and edit links.",
  "Schedule creation time, update time, expiration time, and status."
];

const usageItems = [
  "Create and display shared scheduling pages.",
  "Let participants submit or edit their own availability.",
  "Calculate full-group overlap, partial overlap, and candidate-time voting results.",
  "Let organizers review, lock, archive, export, or confirm a final time."
];

const adItems = [
  "Real third-party display ads are off by default. They require production configuration, provider review, allowed hosts, and privacy or consent readiness before launch.",
  "Future ad providers may process ad request data such as page URL, browser, device, network, region, cookies or ad identifiers, web beacons, ad impressions, ad interactions, and invalid-traffic signals.",
  "Schedule Share should not intentionally send schedule titles, participant names, availability, uploaded images, recognition text, management keys, or edit keys to ad providers as ad-targeting fields.",
  "Pages that expose management or edit keys in the URL do not load third-party ad scripts before the key exposure risk is removed."
];

const aiItems = [
  "Image schedule recognition is not publicly open. An OpenAI API key alone does not enable it.",
  "When a user actively uses image recognition, the image may be sent to the configured AI provider to generate an editable availability preview.",
  "Recognition output is only a draft. The user must review and submit it before it becomes schedule data.",
  "The system is designed not to store original images, full OCR text, or unconfirmed recognition details by default. Cost and credit records only keep necessary metadata and status."
];

export default function EnglishPrivacyPage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome pageContext="privacy">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/en">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to home
          </a>
          <LanguageSwitcher chineseHref="/privacy" current="en" englishHref="/en/privacy" />

          <header className={styles.header}>
            <p className={styles.eyebrow}>Privacy</p>
            <h1>Privacy and Data Retention</h1>
            <p>
              This page explains the MVP data boundaries for Schedule Share. It is a product and
              engineering disclosure, not final legal advice. Before broad public launch, the policy
              should be reviewed against the target regions, ad providers, and operating entity.
            </p>
          </header>

          <DisplayAd pageContext="privacy" placement="top-banner" />

          <section className={styles.section}>
            <h2>What We Store</h2>
            <p>
              The current MVP does not require account registration and does not ask for email,
              phone, social account, or calendar-account access by default.
            </p>
            <ul>
              {dataItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>How We Use the Data</h2>
            <ul>
              {usageItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              The current MVP does not use core scheduling data for ad targeting, third-party
              marketing, or model training.
            </p>
          </section>

          <DisplayAd pageContext="privacy" placement="inline-results" />

          <section className={styles.section}>
            <h2>Ads and Third-Party Technology</h2>
            <p>
              The site has reserved display-ad placements and an <code>/ads.txt</code> route, but
              real production ads remain disabled. If Google AdSense or another display-ad provider
              is enabled later, this page will be updated with the actual provider, opt-out path,
              and region-specific consent approach.
            </p>
            <ul>
              {adItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              Users do not need to click ads to support the site. Automated refreshing, induced ad
              clicks, or fake traffic should not be used.
            </p>
          </section>

          <section className={styles.section}>
            <h2>AI Image Recognition</h2>
            <p>
              Image recognition for screenshots of schedules or shift tables is treated as a
              cost-sensitive advanced path, not as a public default feature.
            </p>
            <ul>
              {aiItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Links Act as Permissions</h2>
            <p>
              A public share link lets someone view the schedule and submit availability. A
              management link lets the organizer view results, export, lock, or archive the
              schedule. An edit link lets a participant modify their own submission.
            </p>
            <p>
              Please do not publish management links or participant edit links in public places.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Retention</h2>
            <p>
              New schedules expire by default after 90 days. The maintenance job can archive expired
              schedules and later hard-delete archived records after a grace period. Before broad
              public launch, production monitoring, backup-retention notes, and deletion-failure
              alerts still need to be finalized.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Related Pages</h2>
            <p>
              You can also read <a href="/en/about">About</a>, <a href="/en/terms">Terms</a>, and{" "}
              <a href="/en/feedback">Feedback and deletion requests</a>. Chinese version:{" "}
              <a href="/privacy">隐私与数据保留说明</a>.
            </p>
          </section>

          <DisplayAd pageContext="privacy" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
