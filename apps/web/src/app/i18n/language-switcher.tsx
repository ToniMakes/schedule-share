"use client";

import { rememberPreferredLocale, type SiteLocale } from "./language-preference";
import styles from "./language-switcher.module.css";

interface LanguageSwitcherProps {
  readonly chineseHref: string;
  readonly current: SiteLocale;
  readonly englishHref: string;
}

export function LanguageSwitcher({ chineseHref, current, englishHref }: LanguageSwitcherProps) {
  return (
    <nav aria-label="Language" className={styles.switcher}>
      <a
        aria-current={current === "zh-CN" ? "page" : undefined}
        className={current === "zh-CN" ? styles.active : styles.link}
        href={chineseHref}
        onClick={() => rememberPreferredLocale(window.localStorage, "zh-CN")}
      >
        中文
      </a>
      <a
        aria-current={current === "en" ? "page" : undefined}
        className={current === "en" ? styles.active : styles.link}
        href={englishHref}
        onClick={() => rememberPreferredLocale(window.localStorage, "en")}
      >
        English
      </a>
    </nav>
  );
}
