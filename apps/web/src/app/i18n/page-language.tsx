"use client";

import { useEffect } from "react";

export function PageLanguage({ lang }: { readonly lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <span aria-hidden="true" data-page-language={lang} hidden />;
}
