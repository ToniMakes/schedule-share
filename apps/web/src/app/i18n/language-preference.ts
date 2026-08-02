export type SiteLocale = "en" | "zh-CN";

export const languagePreferenceStorageKey = "schedule-share.locale";

type LocaleStorage = Pick<Storage, "getItem" | "setItem">;

export function isSiteLocale(value: unknown): value is SiteLocale {
  return value === "en" || value === "zh-CN";
}

export function readPreferredLocale(storage: Pick<Storage, "getItem">): SiteLocale | undefined {
  try {
    const value = storage.getItem(languagePreferenceStorageKey);
    return isSiteLocale(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function rememberPreferredLocale(storage: LocaleStorage, locale: SiteLocale): void {
  try {
    storage.setItem(languagePreferenceStorageKey, locale);
  } catch {
    // Browsers can deny localStorage in private or restricted contexts.
  }
}
