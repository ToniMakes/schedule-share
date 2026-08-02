import type { Metadata } from "next";
import Link from "next/link";

import { AdPageChrome, DisplayAd } from "../../ads/display-ad";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import { PageLanguage } from "../../i18n/page-language";
import styles from "../../new/page.module.css";
import { NewScheduleForm } from "../../new/schedule-form";

export const metadata: Metadata = {
  title: "Create Schedule | Schedule Share",
  description:
    "Create a shared scheduling page with an open availability grid or candidate time voting."
};

export default function EnglishNewSchedulePage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="en" />
      <AdPageChrome mobileAnchor={false} pageContext="create">
        <div className={styles.shell}>
          <LanguageSwitcher chineseHref="/new" current="en" englishHref="/en/new" />
          <header className={styles.header}>
            <Link className={styles.backLink} href="/en">
              Back Home
            </Link>
            <div>
              <p className={styles.eyebrow}>Create Schedule</p>
              <h1 className={styles.title}>Create Schedule</h1>
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
