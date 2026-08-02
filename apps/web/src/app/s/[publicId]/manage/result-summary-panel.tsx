"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

import styles from "../page.module.css";

type CopyState = "idle" | "copied" | "failed";

export function ManageResultSummaryPanel({ summary }: { readonly summary: string }) {
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
    <section className={styles.resultSummaryPanel} aria-label="结果摘要">
      <div className={styles.resultSummaryHeader}>
        <div>
          <strong>结果摘要</strong>
          <p>不包含管理密钥。</p>
        </div>
        <button className={styles.copyButton} onClick={handleCopy} type="button">
          {copyState === "copied" ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Clipboard aria-hidden="true" size={17} />
          )}
          {copyState === "copied" ? "已复制" : "复制摘要"}
        </button>
      </div>
      <textarea
        aria-label="结果摘要文本"
        className={styles.resultSummaryTextArea}
        readOnly
        value={summary}
      />
      {copyState === "failed" ? (
        <p className={styles.inlineWarning}>无法自动复制，可以手动选中摘要文本。</p>
      ) : null}
    </section>
  );
}
