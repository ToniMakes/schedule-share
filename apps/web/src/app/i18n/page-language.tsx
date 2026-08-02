"use client";

import { useEffect } from "react";

import { rememberPreferredLocale, type SiteLocale } from "./language-preference";

export function PageLanguage({ lang }: { readonly lang: SiteLocale }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    rememberPreferredLocale(window.localStorage, lang);
  }, [lang]);

  return <span aria-hidden="true" data-page-language={lang} hidden />;
}
