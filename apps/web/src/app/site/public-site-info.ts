type Locale = "en" | "zh-CN";

export interface PublicSiteInfo {
  readonly operatorName?: string;
  readonly operatorRegion?: string;
  readonly supportEmail?: string;
}

export function getPublicSiteInfo(): PublicSiteInfo {
  return {
    operatorName: normalizePublicText(process.env.NEXT_PUBLIC_SITE_OPERATOR_NAME),
    operatorRegion: normalizePublicText(process.env.NEXT_PUBLIC_SITE_OPERATOR_REGION),
    supportEmail: normalizePublicEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL)
  };
}

export function formatPublicOperator(
  publicSiteInfo: Pick<PublicSiteInfo, "operatorName" | "operatorRegion">,
  locale: Locale
): string | undefined {
  if (publicSiteInfo.operatorName === undefined) {
    return undefined;
  }

  if (publicSiteInfo.operatorRegion === undefined) {
    return publicSiteInfo.operatorName;
  }

  return locale === "zh-CN"
    ? `${publicSiteInfo.operatorName}（${publicSiteInfo.operatorRegion}）`
    : `${publicSiteInfo.operatorName} (${publicSiteInfo.operatorRegion})`;
}

function normalizePublicText(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized && normalized.length <= 160 ? normalized : undefined;
}

function normalizePublicEmail(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : undefined;
}
