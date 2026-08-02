"use client";

import { useEffect } from "react";

import { rememberPreferredLocale } from "./language-preference";

export function PageLanguage({ lang }: { readonly lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;

    if (lang === "en") {
      rememberPreferredLocale(window.localStorage, "en");
    }
  }, [lang]);

  return <span aria-hidden="true" data-page-language={lang} hidden />;
}
