export function PageLanguage({ lang }: { readonly lang: string }) {
  const serializedLang = JSON.stringify(lang);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${serializedLang};`
        }}
      />
      <span aria-hidden="true" data-page-language={lang} hidden />
    </>
  );
}
