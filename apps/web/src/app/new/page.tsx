import type { Metadata } from "next";
import Link from "next/link";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { PageLanguage } from "../i18n/page-language";
import styles from "./page.module.css";
import { NewScheduleForm } from "./schedule-form";

export const metadata: Metadata = {
  title: "Create a schedule | Schedule Share",
  description: "Create a schedule to collect availability or vote on proposed times."
};

export default function EnglishNewSchedulePage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome mobileAnchor={false} pageContext="create">
        <div className={styles.shell}>
          <LanguageSwitcher chineseHref="/zh/new" current="en" englishHref="/new" />
          <header className={styles.header}>
            <Link className={styles.backLink} href="/">
              Home
            </Link>
            <div>
              <p className={styles.eyebrow}>Schedule Share</p>
              <h1 className={styles.title}>Create a schedule</h1>
            </div>
          </header>

          <DisplayAd pageContext="create" placement="top-banner" />

          <NewScheduleForm locale="en" />

          <DisplayAd pageContext="create" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
