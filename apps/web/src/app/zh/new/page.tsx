import Link from "next/link";

import { AdPageChrome, DisplayAd } from "../../ads/display-ad";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import { PageLanguage } from "../../i18n/page-language";
import styles from "../../new/page.module.css";
import { NewScheduleForm } from "../../new/schedule-form";

export default function NewSchedulePage() {
  return (
    <main className={styles.page}>
      <PageLanguage lang="zh-CN" />
      <AdPageChrome mobileAnchor={false} pageContext="create">
        <div className={styles.shell}>
          <LanguageSwitcher chineseHref="/zh/new" current="zh-CN" englishHref="/new" />
          <header className={styles.header}>
            <Link className={styles.backLink} href="/zh">
              返回首页
            </Link>
            <div>
              <p className={styles.eyebrow}>Create Schedule</p>
              <h1 className={styles.title}>创建日程</h1>
            </div>
          </header>

          <DisplayAd pageContext="create" placement="top-banner" />

          <NewScheduleForm />

          <DisplayAd pageContext="create" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
