"use client";

import { useEffect, useState } from "react";
import { Clipboard, ExternalLink, Pencil } from "lucide-react";

import type { ScheduleDetail } from "@schedule-share/api-client";

import {
  readRememberedParticipantEditLink,
  type RememberedParticipantEditLink
} from "./participant-edit-link-memory";
import styles from "./page.module.css";
import { schedulePageCopy, type SchedulePageLocale } from "./schedule-page-copy";

interface RememberedEditLinkPanelProps {
  readonly locale?: SchedulePageLocale;
  readonly publicId: string;
  readonly scheduleStatus: ScheduleDetail["status"];
}

type CopyState = "idle" | "copied" | "failed";

export function RememberedEditLinkPanel({
  locale = "zh-CN",
  publicId,
  scheduleStatus
}: RememberedEditLinkPanelProps) {
  const copy = schedulePageCopy[locale].rememberedEditLink;
  const [rememberedLink, setRememberedLink] = useState<RememberedParticipantEditLink | undefined>();
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (scheduleStatus !== "open") {
      return;
    }

    setRememberedLink(readRememberedParticipantEditLink(window.localStorage, publicId));
  }, [publicId, scheduleStatus]);

  if (scheduleStatus !== "open" || rememberedLink === undefined) {
    return null;
  }

  async function copyEditLink() {
    if (rememberedLink === undefined) {
      return;
    }

    try {
      await navigator.clipboard.writeText(rememberedLink.editUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className={styles.rememberedEditPanel} aria-label={copy.ariaLabel}>
      <div className={styles.rememberedEditIcon}>
        <Pencil aria-hidden="true" size={18} />
      </div>
      <div className={styles.rememberedEditBody}>
        <div className={styles.rememberedEditText}>
          <strong>{copy.rememberedTitle}</strong>
          <p>{copy.rememberedBody(rememberedLink.displayName)}</p>
        </div>
        <div className={styles.rememberedEditActions}>
          <a className={styles.secondaryButton} href={rememberedLink.editUrl}>
            <ExternalLink aria-hidden="true" size={17} />
            {copy.openEdit}
          </a>
          <button className={styles.copyButton} onClick={copyEditLink} type="button">
            <Clipboard aria-hidden="true" size={17} />
            {copyState === "copied" ? copy.copied : copy.copy}
          </button>
        </div>
        {copyState === "failed" ? <p className={styles.inlineWarning}>{copy.copyFailed}</p> : null}
      </div>
    </section>
  );
}
