import styles from "./language-switcher.module.css";

interface LanguageSwitcherProps {
  readonly chineseHref: string;
  readonly current: "en" | "zh-CN";
  readonly englishHref: string;
}

export function LanguageSwitcher({ chineseHref, current, englishHref }: LanguageSwitcherProps) {
  return (
    <nav aria-label="Language" className={styles.switcher}>
      <a
        aria-current={current === "zh-CN" ? "page" : undefined}
        className={current === "zh-CN" ? styles.active : styles.link}
        href={chineseHref}
      >
        中文
      </a>
      <a
        aria-current={current === "en" ? "page" : undefined}
        className={current === "en" ? styles.active : styles.link}
        href={englishHref}
      >
        English
      </a>
    </nav>
  );
}
