import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, Clock, Lock, Users } from "lucide-react";

import type { GetScheduleResponse } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { HttpError } from "@/server/errors";
import { getOwnerScheduleView } from "@/server/schedules/get-owner-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

import { LockScheduleControl } from "./lock-schedule-control";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

interface ManageSchedulePageProps {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
  readonly searchParams: Promise<{
    readonly key?: string | string[];
  }>;
}

export default async function ManageSchedulePage({
  params,
  searchParams
}: ManageSchedulePageProps) {
  const { publicId } = await params;
  const ownerKey = readSearchParam((await searchParams).key);

  try {
    const repository = new DrizzleScheduleRepository(getDatabase());
    const data = await getOwnerScheduleView(publicId, ownerKey, { repository });

    return <ManageView data={data} ownerKey={ownerKey} />;
  } catch (error) {
    return <ErrorView message={toPageErrorMessage(error)} publicId={publicId} />;
  }
}

function ManageView({
  data,
  ownerKey
}: {
  readonly data: GetScheduleResponse;
  readonly ownerKey: string;
}) {
  const everyoneBlocks = data.results.everyoneAvailableBlocks.slice(0, 6);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.backLink} href={`/s/${data.schedule.publicId}`}>
            <ArrowLeft aria-hidden="true" size={17} />
            返回日程
          </Link>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>Manage Schedule</p>
            <h1 className={styles.title}>{data.schedule.title}</h1>
            <p className={styles.description}>{statusLabel(data.schedule.status)}</p>
          </div>
        </header>

        <section className={styles.summaryGrid} aria-label="管理概览">
          <SummaryItem
            icon={<CalendarDays aria-hidden="true" size={18} />}
            label="日期"
            value={`${data.schedule.dateRange.start} 至 ${data.schedule.dateRange.end}`}
          />
          <SummaryItem
            icon={<Clock aria-hidden="true" size={18} />}
            label="时区"
            value={data.schedule.timezone}
          />
          <SummaryItem
            icon={<Users aria-hidden="true" size={18} />}
            label="参与者"
            value={`${data.participants.length} 人`}
          />
          <SummaryItem
            icon={<Lock aria-hidden="true" size={18} />}
            label="状态"
            value={statusLabel(data.schedule.status)}
          />
        </section>

        <LockScheduleControl
          ownerKey={ownerKey}
          publicId={data.schedule.publicId}
          status={data.schedule.status}
        />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>全员可用时间</h2>
            <span>{everyoneBlocks.length} 段</span>
          </div>
          {everyoneBlocks.length > 0 ? (
            <div className={styles.blockList}>
              {everyoneBlocks.map((block) => (
                <div className={styles.blockItem} key={`${block.startUtc}-${block.endUtc}`}>
                  <div>
                    <span>
                      {block.localStartDate === block.localEndDate
                        ? block.localStartDate
                        : `${block.localStartDate} 至 ${block.localEndDate}`}
                    </span>
                    <strong>
                      {block.localStartTime}-{block.localEndTime}
                    </strong>
                  </div>
                  <p>{block.slotCount} 个连续时间槽</p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>暂时没有全员都可用的时间</strong>
              <p>当前参与者提交还没有形成全员共同时间。</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryItem({
  icon,
  label,
  value
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className={styles.summaryItem}>
      <div className={styles.summaryIcon}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function ErrorView({ message, publicId }: { readonly message: string; readonly publicId: string }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.backLink} href={`/s/${publicId}`}>
            <ArrowLeft aria-hidden="true" size={17} />
            返回日程
          </Link>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>Manage Schedule</p>
            <h1 className={styles.title}>无法打开管理页</h1>
            <p className={styles.description}>{message}</p>
          </div>
        </header>
      </div>
    </main>
  );
}

function readSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function statusLabel(status: GetScheduleResponse["schedule"]["status"]): string {
  if (status === "open") {
    return "开放中";
  }

  if (status === "locked") {
    return "已锁定";
  }

  return "已归档";
}

function toPageErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return "数据库尚未配置。";
    }

    if (error.code === "INVALID_OWNER_KEY") {
      return "管理链接无效或缺少密钥。";
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return "这个日程不存在或链接有误。";
    }

    return error.message;
  }

  return "服务器暂时无法读取管理页。";
}
