import Link from "next/link";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import styles from "./page.module.css";
import { NewScheduleForm } from "./schedule-form";

export default function NewSchedulePage() {
  return (
    <main className={styles.page}>
      <AdPageChrome mobileAnchor={false} pageContext="create">
        <div className={styles.shell}>
          <header className={styles.header}>
            <Link className={styles.backLink} href="/">
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
