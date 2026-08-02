"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import styles from "./display-ad.module.css";

type DisplayAdProvider = "adsense" | "placeholder";

export type DisplayAdPageContext =
  | "home"
  | "create"
  | "public-schedule"
  | "manage-sensitive"
  | "edit-sensitive"
  | "privacy"
  | "feedback";

export type DisplayAdPlacement =
  | "top-banner"
  | "bottom-banner"
  | "inline-results"
  | "post-submit"
  | "desktop-rail-left"
  | "desktop-rail-right"
  | "mobile-anchor";

interface DisplayAdConfig {
  readonly adsenseClientId: string;
  readonly allowedHosts: readonly string[];
  readonly enabled: boolean;
  readonly keyedUrlMode: "off" | "internal" | "full";
  readonly provider: DisplayAdProvider;
  readonly showPlaceholders: boolean;
  readonly slotIds: Record<DisplayAdPlacement, string>;
  readonly testMode: boolean;
}

interface AdPageChromeProps {
  readonly children: ReactNode;
  readonly mobileAnchor?: boolean;
  readonly pageContext: DisplayAdPageContext;
  readonly rails?: boolean;
  readonly thirdPartyAllowed?: boolean;
}

interface DisplayAdProps {
  readonly className?: string;
  readonly pageContext: DisplayAdPageContext;
  readonly placement: DisplayAdPlacement;
  readonly thirdPartyAllowed?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const pagePlacementPolicy: Record<DisplayAdPageContext, readonly DisplayAdPlacement[]> = {
  home: [
    "top-banner",
    "bottom-banner",
    "inline-results",
    "desktop-rail-left",
    "desktop-rail-right",
    "mobile-anchor"
  ],
  create: ["top-banner", "bottom-banner", "post-submit", "desktop-rail-left", "desktop-rail-right"],
  "public-schedule": [
    "top-banner",
    "bottom-banner",
    "inline-results",
    "desktop-rail-left",
    "desktop-rail-right"
  ],
  "manage-sensitive": [
    "top-banner",
    "bottom-banner",
    "inline-results",
    "desktop-rail-left",
    "desktop-rail-right"
  ],
  "edit-sensitive": ["top-banner", "bottom-banner", "desktop-rail-left", "desktop-rail-right"],
  privacy: [
    "top-banner",
    "bottom-banner",
    "inline-results",
    "desktop-rail-left",
    "desktop-rail-right",
    "mobile-anchor"
  ],
  feedback: [
    "top-banner",
    "bottom-banner",
    "inline-results",
    "desktop-rail-left",
    "desktop-rail-right",
    "mobile-anchor"
  ]
};

const placementLabels: Record<DisplayAdPlacement, string> = {
  "top-banner": "Advertisement",
  "bottom-banner": "Advertisement",
  "inline-results": "Advertisement",
  "post-submit": "Advertisement",
  "desktop-rail-left": "Advertisement",
  "desktop-rail-right": "Advertisement",
  "mobile-anchor": "Advertisement"
};

const placementNotes: Record<DisplayAdPlacement, string> = {
  "top-banner": "Top banner",
  "bottom-banner": "Bottom banner",
  "inline-results": "Result section",
  "post-submit": "After completion",
  "desktop-rail-left": "Side rail",
  "desktop-rail-right": "Side rail",
  "mobile-anchor": "Mobile anchor"
};

const placementClassNames: Record<DisplayAdPlacement, string> = {
  "top-banner": styles.topBanner ?? "",
  "bottom-banner": styles.bottomBanner ?? "",
  "inline-results": styles.inlineResults ?? "",
  "post-submit": styles.postSubmit ?? "",
  "desktop-rail-left": styles.desktopRailLeft ?? "",
  "desktop-rail-right": styles.desktopRailRight ?? "",
  "mobile-anchor": styles.mobileAnchor ?? ""
};

export function AdPageChrome({
  children,
  mobileAnchor = true,
  pageContext,
  rails = true,
  thirdPartyAllowed = true
}: AdPageChromeProps) {
  return (
    <>
      {children}
      {rails ? (
        <>
          <DisplayAd
            pageContext={pageContext}
            placement="desktop-rail-left"
            thirdPartyAllowed={thirdPartyAllowed}
          />
          <DisplayAd
            pageContext={pageContext}
            placement="desktop-rail-right"
            thirdPartyAllowed={thirdPartyAllowed}
          />
        </>
      ) : null}
      {mobileAnchor ? (
        <DisplayAd
          pageContext={pageContext}
          placement="mobile-anchor"
          thirdPartyAllowed={thirdPartyAllowed}
        />
      ) : null}
    </>
  );
}

export function DisplayAd({
  className,
  pageContext,
  placement,
  thirdPartyAllowed = true
}: DisplayAdProps) {
  const config = getDisplayAdConfig();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isBrowserSafeForThirdParty, setIsBrowserSafeForThirdParty] = useState(false);
  const slotId = config.slotIds[placement];
  const placementAllowed = pagePlacementPolicy[pageContext].includes(placement);
  const canTryAdsense =
    config.provider === "adsense" &&
    thirdPartyAllowed &&
    config.adsenseClientId.length > 0 &&
    slotId.length > 0;

  useEffect(() => {
    if (!canTryAdsense) {
      setIsBrowserSafeForThirdParty(false);
      return;
    }

    setIsBrowserSafeForThirdParty(isCurrentBrowserSafeForThirdPartyAds(config));
  }, [canTryAdsense, config.allowedHosts, config.keyedUrlMode, config.testMode]);

  useEffect(() => {
    if (!canTryAdsense || !isBrowserSafeForThirdParty) {
      return;
    }

    ensureAdsenseScript(config.adsenseClientId, config.testMode);
    window.adsbygoogle = window.adsbygoogle ?? [];
    window.adsbygoogle.push({});
  }, [canTryAdsense, config.adsenseClientId, config.testMode, isBrowserSafeForThirdParty]);

  const classNames = useMemo(
    () =>
      [
        styles.adSlot,
        placementClassNames[placement],
        canTryAdsense && isBrowserSafeForThirdParty ? styles.adsenseSlot : "",
        className ?? ""
      ]
        .filter(Boolean)
        .join(" "),
    [canTryAdsense, className, isBrowserSafeForThirdParty, placement]
  );

  if (!config.enabled || !placementAllowed || isDismissed) {
    return null;
  }

  if (canTryAdsense && isBrowserSafeForThirdParty) {
    return (
      <aside
        aria-label={placementLabels[placement]}
        className={classNames}
        data-ad-placement={placement}
      >
        <span className={styles.adLabel}>{placementLabels[placement]}</span>
        <ins
          className="adsbygoogle"
          data-ad-client={config.adsenseClientId}
          data-ad-format="auto"
          data-ad-slot={slotId}
          data-full-width-responsive="true"
          style={{ display: "block" }}
        />
        {placement === "mobile-anchor" ? (
          <DismissButton onDismiss={() => setIsDismissed(true)} />
        ) : null}
      </aside>
    );
  }

  if (!config.showPlaceholders && config.provider !== "placeholder") {
    return null;
  }

  return (
    <aside
      aria-label={placementLabels[placement]}
      className={classNames}
      data-ad-placement={placement}
    >
      <span className={styles.adLabel}>{placementLabels[placement]}</span>
      <strong>{placementNotes[placement]}</strong>
      <p>Reserved sponsor space</p>
      {placement === "mobile-anchor" ? (
        <DismissButton onDismiss={() => setIsDismissed(true)} />
      ) : null}
    </aside>
  );
}

function DismissButton({ onDismiss }: { readonly onDismiss: () => void }) {
  return (
    <button
      aria-label="Close advertisement"
      className={styles.dismissButton}
      onClick={onDismiss}
      type="button"
    >
      <X aria-hidden="true" size={14} />
    </button>
  );
}

function getDisplayAdConfig(): DisplayAdConfig {
  return {
    adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? "",
    allowedHosts: parseCsv(process.env.NEXT_PUBLIC_DISPLAY_ADS_ALLOWED_HOSTS),
    enabled:
      parseBooleanFlag(process.env.NEXT_PUBLIC_DISPLAY_ADS_ENABLED) ||
      parseBooleanFlag(process.env.NEXT_PUBLIC_DISPLAY_ADS_PREVIEW),
    keyedUrlMode: parseKeyedUrlMode(process.env.NEXT_PUBLIC_DISPLAY_ADS_KEYED_URL_MODE),
    provider: parseProvider(process.env.NEXT_PUBLIC_DISPLAY_ADS_PROVIDER),
    showPlaceholders:
      parseBooleanFlag(process.env.NEXT_PUBLIC_DISPLAY_ADS_PLACEHOLDERS) ||
      parseBooleanFlag(process.env.NEXT_PUBLIC_DISPLAY_ADS_PREVIEW),
    slotIds: {
      "top-banner": process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP_BANNER?.trim() ?? "",
      "bottom-banner": process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM_BANNER?.trim() ?? "",
      "inline-results": process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE_RESULTS?.trim() ?? "",
      "post-submit": process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_SUBMIT?.trim() ?? "",
      "desktop-rail-left": process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_RAIL?.trim() ?? "",
      "desktop-rail-right": process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_RAIL?.trim() ?? "",
      "mobile-anchor": process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_ANCHOR?.trim() ?? ""
    },
    testMode: parseBooleanFlag(process.env.NEXT_PUBLIC_DISPLAY_ADS_TEST_MODE)
  };
}

function isCurrentBrowserSafeForThirdPartyAds(config: DisplayAdConfig): boolean {
  if (config.keyedUrlMode !== "full" && hasSensitiveQueryKey(window.location.search)) {
    return false;
  }

  if (config.testMode) {
    return true;
  }

  return config.allowedHosts.includes(window.location.hostname.toLowerCase());
}

function ensureAdsenseScript(clientId: string, testMode: boolean): void {
  const scriptId = "schedule-share-adsense-script";

  if (document.getElementById(scriptId) !== null) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.id = scriptId;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;

  if (testMode) {
    script.dataset.adbreakTest = "on";
  }

  document.head.appendChild(script);
}

function hasSensitiveQueryKey(search: string): boolean {
  const params = new URLSearchParams(search);
  const sensitiveKeys = ["key", "ownerKey", "editKey", "token"];

  return sensitiveKeys.some((key) => params.has(key));
}

function parseProvider(value: string | undefined): DisplayAdProvider {
  return value?.trim().toLowerCase() === "adsense" ? "adsense" : "placeholder";
}

function parseKeyedUrlMode(value: string | undefined): DisplayAdConfig["keyedUrlMode"] {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "full" || normalized === "off") {
    return normalized;
  }

  return "internal";
}

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function parseCsv(value: string | undefined): readonly string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}
