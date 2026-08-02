import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../../ads/display-ad";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import { PageLanguage } from "../../i18n/page-language";
import styles from "../../terms/page.module.css";

export const metadata: Metadata = {
  title: "Terms of Use | Schedule Share",
  description:
    "Basic MVP terms for using Schedule Share, including acceptable use, link permissions, ad status, AI recognition boundaries, and service limitations."
};

const acceptableUseItems = [
  "Do not submit illegal, abusive, discriminatory, infringing, malicious, or spam content.",
  "Do not upload or paste sensitive identity documents, financial data, medical records, or private content unrelated to scheduling.",
  "Do not publicly share management links, edit links, database URLs, API keys, or other secrets.",
  "Do not use automation to spam schedule creation, submissions, ad impressions, AI recognition, reward credits, or export endpoints.",
  "Do not encourage, require, or induce ad clicks, and do not create artificial ad views with refresh loops, scripts, or fake traffic."
];

const organizerItems = [
  "Organizers are responsible for choosing an appropriate sharing scope and keeping management links private.",
  "Organizers should share normal participant links in public group chats, not management links.",
  "If a participant asks to edit or remove their submission, the organizer should help through the schedule flow or direct them to the feedback channel."
];

const aiAndAdItems = [
  "Manual entry, candidate voting, text paste, CSV import, and ICS import should remain usable without watching ads.",
  "If image recognition opens later, it may require free credits, rewarded-ad credits, or future paid credits. The credit rules will be shown before launch.",
  "Rewarded ads must be actively chosen by the user and verified by the server before any image-recognition credit is granted.",
  "Ordinary display ads are not rewarded ads. Clicking a normal display ad does not grant extra credits."
];

export default function EnglishTermsPage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome pageContext="terms">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/en">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to home
          </a>
          <LanguageSwitcher chineseHref="/terms" current="en" englishHref="/en/terms" />

          <header className={styles.header}>
            <p className={styles.eyebrow}>Terms</p>
            <h1>Terms of Use</h1>
            <p>
              These are basic MVP rules for Schedule Share. They describe the current internal-test
              service boundaries and do not replace final legal terms. Before broad public launch,
              they should be reviewed against the target regions, ad platform requirements, and the
              chosen operating entity.
            </p>
          </header>

          <DisplayAd pageContext="terms" placement="top-banner" />

          <section className={styles.section}>
            <h2>Service Purpose</h2>
            <p>
              Schedule Share creates one-off or short-term group scheduling pages. Organizers can
              collect participant availability, compare candidate times, export calendar files, and
              confirm a final time. Please use it only for lawful, low-risk scheduling scenarios.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Acceptable Use</h2>
            <ul>
              {acceptableUseItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <DisplayAd pageContext="terms" placement="inline-results" />

          <section className={styles.section}>
            <h2>Organizer Responsibilities</h2>
            <ul>
              {organizerItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Data and Link Permissions</h2>
            <p>
              Share links, management links, and participant edit links carry different permissions.
              A management link can review results, lock, archive, and export the schedule. An edit
              link can modify the corresponding participant submission. More details are available
              in the <a href="/en/privacy">Privacy and Data Retention</a> page.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Advertising and Paid Features</h2>
            <p>
              Real display ads, rewarded ads, payment features, and public image-recognition mode
              are not open yet. The site keeps a low-interruption ad framework for future service
              cost coverage, but core scheduling actions should not be blocked by ordinary display
              ads.
            </p>
            <ul>
              {aiAndAdItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Recognition Results and Final Confirmation</h2>
            <p>
              Text, CSV, ICS, template, and future image recognition flows only create editable
              previews. The system can misread dates, time zones, course periods, overnight ranges,
              or screenshot content. Users should review and correct the preview before submitting.
              Organizers should also verify results before confirming a final time.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Service Limitations</h2>
            <p>
              This MVP may change, become temporarily unavailable, migrate data, or clean up test
              schedules. Do not use it as the only source of truth for medical, legal, financial,
              safety-critical, or other high-risk decisions. For issues, archive requests, or
              deletion requests, see <a href="/en/feedback">Feedback and deletion requests</a>.
            </p>
          </section>

          <footer className={styles.footer}>
            <a href="/en/about">About</a>
            <a href="/en/privacy">Privacy and Data Retention</a>
            <a href="/terms">中文</a>
          </footer>

          <DisplayAd pageContext="terms" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
