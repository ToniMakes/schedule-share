import type { AppLanguage } from "./i18n";

export function formatLocalDate(date: string, language: AppLanguage): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
