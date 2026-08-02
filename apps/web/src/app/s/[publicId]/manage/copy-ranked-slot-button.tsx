"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

import styles from "../page.module.css";

type CopyState = "idle" | "copied" | "failed";

export function CopyRankedSlotButton({
  fallbackAriaLabel = "备选时间复制文本",
  idleLabel = "复制此备选",
  text
}: {
  readonly fallbackAriaLabel?: string;
  readonly idleLabel?: string;
  readonly text: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await copyText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className={styles.inlineActionStack}>
      <button className={styles.compactButton} onClick={handleCopy} type="button">
        {copyState === "copied" ? (
          <Check aria-hidden="true" size={15} />
        ) : (
          <Clipboard aria-hidden="true" size={15} />
        )}
        {copyState === "copied" ? "已复制" : idleLabel}
      </button>
      {copyState === "failed" ? (
        <>
          <span className={styles.inlineActionError} role="alert">
            无法自动复制，可手动选中文本。
          </span>
          <textarea
            aria-label={fallbackAriaLabel}
            className={styles.inlineCopyFallback}
            readOnly
            value={text}
          />
        </>
      ) : null}
    </div>
  );
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    if (copyTextWithTemporaryElement(value)) {
      return;
    }

    throw new Error("Clipboard unavailable");
  }
}

function copyTextWithTemporaryElement(value: string): boolean {
  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
