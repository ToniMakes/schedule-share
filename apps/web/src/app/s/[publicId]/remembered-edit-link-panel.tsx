"use client";

import { useEffect, useState } from "react";
import { Clipboard, ExternalLink, Pencil } from "lucide-react";

import type { ScheduleDetail } from "@schedule-share/api-client";

import {
  readRememberedParticipantEditLink,
  type RememberedParticipantEditLink
} from "./participant-edit-link-memory";
import styles from "./page.module.css";

interface RememberedEditLinkPanelProps {
  readonly publicId: string;
  readonly scheduleStatus: ScheduleDetail["status"];
}

type CopyState = "idle" | "copied" | "failed";

export function RememberedEditLinkPanel({
  publicId,
  scheduleStatus
}: RememberedEditLinkPanelProps) {
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
    <section className={styles.rememberedEditPanel} aria-label="已记住的编辑链接">
      <div className={styles.rememberedEditIcon}>
        <Pencil aria-hidden="true" size={18} />
      </div>
      <div className={styles.rememberedEditBody}>
        <div className={styles.rememberedEditText}>
          <strong>这台浏览器记得你的提交</strong>
          <p>{rememberedLink.displayName} 可以直接回到自己的编辑页面。</p>
        </div>
        <div className={styles.rememberedEditActions}>
          <a className={styles.secondaryButton} href={rememberedLink.editUrl}>
            <ExternalLink aria-hidden="true" size={17} />
            打开编辑
          </a>
          <button className={styles.copyButton} onClick={copyEditLink} type="button">
            <Clipboard aria-hidden="true" size={17} />
            {copyState === "copied" ? "已复制" : "复制"}
          </button>
        </div>
        {copyState === "failed" ? (
          <p className={styles.inlineWarning}>无法自动复制，可以打开编辑页面或手动复制链接。</p>
        ) : null}
      </div>
    </section>
  );
}
