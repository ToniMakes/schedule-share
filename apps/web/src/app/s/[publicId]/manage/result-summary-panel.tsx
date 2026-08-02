"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

import { manageResultSummaryPanelCopy, type ManageResultSummaryPanelCopy } from "./manage-copy";
import styles from "../page.module.css";

type CopyState = "idle" | "copied" | "failed";

export function ManageResultSummaryPanel({
  copy = manageResultSummaryPanelCopy["zh-CN"],
  summary
}: {
  readonly copy?: ManageResultSummaryPanelCopy;
  readonly summary: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className={styles.resultSummaryPanel} aria-label={copy.ariaLabel}>
      <div className={styles.resultSummaryHeader}>
        <div>
          <strong>{copy.title}</strong>
          <p>{copy.safeHint}</p>
        </div>
        <button className={styles.copyButton} onClick={handleCopy} type="button">
          {copyState === "copied" ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Clipboard aria-hidden="true" size={17} />
          )}
          {copyState === "copied" ? copy.copied : copy.copySummary}
        </button>
      </div>
      <textarea
        aria-label={copy.textAreaLabel}
        className={styles.resultSummaryTextArea}
        readOnly
        value={summary}
      />
      {copyState === "failed" ? <p className={styles.inlineWarning}>{copy.copyFailed}</p> : null}
    </section>
  );
}
