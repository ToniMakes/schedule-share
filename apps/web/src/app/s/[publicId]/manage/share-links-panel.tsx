"use client";

import { useEffect, useState } from "react";
import { Clipboard, KeyRound, Share2, type LucideIcon } from "lucide-react";

import { manageShareLinksPanelCopy, type ManageShareLinksPanelCopy } from "./manage-copy";
import styles from "../page.module.css";

type CopyTarget = "owner" | "share";
type CopyState =
  | { readonly status: "idle" }
  | { readonly status: "copied"; readonly target: CopyTarget }
  | { readonly status: "failed" };

export function ManageShareLinksPanel({
  copy = manageShareLinksPanelCopy["zh-CN"],
  ownerKey,
  publicId
}: {
  readonly copy?: ManageShareLinksPanelCopy;
  readonly ownerKey: string;
  readonly publicId: string;
}) {
  const [origin, setOrigin] = useState("");
  const [copyState, setCopyState] = useState<CopyState>({ status: "idle" });
  const sharePath = `${copy.publicPathPrefix}${encodeURIComponent(publicId)}`;
  const ownerPath = `${copy.managerPathPrefix}${encodeURIComponent(publicId)}/manage?${new URLSearchParams(
    {
      key: ownerKey
    }
  ).toString()}`;
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
    <section className={styles.section} aria-label={copy.ariaLabel}>
      <div className={styles.sectionHeader}>
        <h2>{copy.title}</h2>
        <span>{copy.subtitle}</span>
      </div>
      <div className={styles.shareLinkPanel}>
        <LinkRow
          copiedLabel={copy.copied}
          copyLabel={copy.copy}
          copied={copyState.status === "copied" && copyState.target === "share"}
          icon={Share2}
          label={copy.shareLabel}
          onCopy={() => copyLink("share", shareUrl)}
          value={shareUrl}
        />
        <LinkRow
          copiedLabel={copy.copied}
          copyLabel={copy.copy}
          copied={copyState.status === "copied" && copyState.target === "owner"}
          icon={KeyRound}
          label={copy.ownerLabel}
          onCopy={() => copyLink("owner", ownerUrl)}
          value={ownerUrl}
        />
        {copyState.status === "failed" ? (
          <p className={styles.inlineWarning}>{copy.copyFailed}</p>
        ) : null}
      </div>
    </section>
  );
}

function LinkRow({
  copied,
  copiedLabel,
  copyLabel,
  icon: Icon,
  label,
  onCopy,
  value
}: {
  readonly copied: boolean;
  readonly copiedLabel: string;
  readonly copyLabel: string;
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
        {copied ? copiedLabel : copyLabel}
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
