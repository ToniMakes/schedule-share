"use client";

import { useEffect, useState } from "react";
import { Clipboard, KeyRound, Share2, type LucideIcon } from "lucide-react";

import styles from "../page.module.css";

type CopyTarget = "owner" | "share";
type CopyState =
  | { readonly status: "idle" }
  | { readonly status: "copied"; readonly target: CopyTarget }
  | { readonly status: "failed" };

export function ManageShareLinksPanel({
  ownerKey,
  publicId
}: {
  readonly ownerKey: string;
  readonly publicId: string;
}) {
  const [origin, setOrigin] = useState("");
  const [copyState, setCopyState] = useState<CopyState>({ status: "idle" });
  const sharePath = `/s/${encodeURIComponent(publicId)}`;
  const ownerPath = `/s/${encodeURIComponent(publicId)}/manage?${new URLSearchParams({
    key: ownerKey
  }).toString()}`;
  const shareUrl = toDisplayUrl(sharePath, origin);
  const ownerUrl = toDisplayUrl(ownerPath, origin);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyLink(target: CopyTarget, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState({ status: "copied", target });
    } catch {
      setCopyState({ status: "failed" });
    }
  }

  return (
    <section className={styles.section} aria-label="分享与管理链接">
      <div className={styles.sectionHeader}>
        <h2>分享链接</h2>
        <span>可随时复制</span>
      </div>
      <div className={styles.shareLinkPanel}>
        <LinkRow
          copied={copyState.status === "copied" && copyState.target === "share"}
          icon={Share2}
          label="公开填写链接"
          onCopy={() => copyLink("share", shareUrl)}
          value={shareUrl}
        />
        <LinkRow
          copied={copyState.status === "copied" && copyState.target === "owner"}
          icon={KeyRound}
          label="管理链接"
          onCopy={() => copyLink("owner", ownerUrl)}
          value={ownerUrl}
        />
        {copyState.status === "failed" ? (
          <p className={styles.inlineWarning}>无法自动复制，可以手动选中链接。</p>
        ) : null}
      </div>
    </section>
  );
}

function LinkRow({
  copied,
  icon: Icon,
  label,
  onCopy,
  value
}: {
  readonly copied: boolean;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly onCopy: () => void;
  readonly value: string;
}) {
  return (
    <div className={styles.copyLinkRow}>
      <label className={styles.shareLinkField}>
        <span>
          <Icon aria-hidden="true" size={15} />
          {label}
        </span>
        <input aria-label={label} readOnly value={value} />
      </label>
      <button className={styles.copyButton} onClick={onCopy} type="button">
        <Clipboard aria-hidden="true" size={17} />
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}

function toDisplayUrl(path: string, origin: string): string {
  if (origin.length === 0) {
    return path;
  }

  return new URL(path, origin).toString();
}
