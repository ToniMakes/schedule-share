import Link from "next/link";

import styles from "./page.module.css";
import { NewScheduleForm } from "./schedule-form";

export default function NewSchedulePage() {
  return (
    <main className={styles.page}>
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
        <NewScheduleForm />
      </div>
    </main>
  );
}
