import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarCheck, CalendarDays, Clock, Lock, Users } from "lucide-react";

import type {
  GetScheduleResponse,
  TimeSlotAvailabilityDto,
  TimeSlotDto
} from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { HttpError } from "@/server/errors";
import { getOwnerScheduleView } from "@/server/schedules/get-owner-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

import { ConfirmFinalTimeButton } from "./final-time-control";
import { LockScheduleControl } from "./lock-schedule-control";
import { CopyRankedSlotButton } from "./copy-ranked-slot-button";
import { ManageResultSummaryPanel } from "./result-summary-panel";
import { buildManageRankedSlotCopyText, buildManageResultSummary } from "./result-summary";
import { ManageShareLinksPanel } from "./share-links-panel";
import { AvailabilityHeatmapPanel } from "../availability-heatmap-panel";
import {
  formatAvailableParticipantNames,
  formatUnavailableParticipantNames
} from "../availability-slot-names";
import { CandidatePollResultsPanel } from "../candidate-results-panel";
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
  const isCandidatePoll = data.schedule.scheduleMode === "candidate_poll";
  const everyoneBlocks = data.results.everyoneAvailableBlocks.slice(0, 6);
  const rankedSlots = data.results.rankedSlots.slice(0, 8);
  const resultSummary = buildManageResultSummary(data);

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

        {data.schedule.finalTime ? (
          <FinalTimeNotice
            finalTime={data.schedule.finalTime}
            ownerKey={ownerKey}
            publicId={data.schedule.publicId}
          />
        ) : null}

        <ManageShareLinksPanel ownerKey={ownerKey} publicId={data.schedule.publicId} />

        <LockScheduleControl
          ownerKey={ownerKey}
          publicId={data.schedule.publicId}
          status={data.schedule.status}
        />

        <ManageResultSummaryPanel summary={resultSummary} />

        {isCandidatePoll ? (
          <CandidatePollResultsPanel
            finalTimeControls={{
              ownerKey,
              publicId: data.schedule.publicId,
              selectedFinalTime: data.schedule.finalTime,
              status: data.schedule.status
            }}
            participants={data.participants}
            scheduleTitle={data.schedule.title}
            slots={data.results.slotResults}
          />
        ) : (
          <>
            <AvailabilityHeatmapPanel
              slots={data.results.slotResults}
              totalParticipantCount={data.results.totalParticipantCount}
            />

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>全员可用时间</h2>
                <span>{everyoneBlocks.length} 段</span>
              </div>
              {everyoneBlocks.length > 0 ? (
                <div className={styles.blockList}>
                  {everyoneBlocks.map((block) => (
                    <ManageAvailabilityBlockItem
                      block={block}
                      key={`${block.startUtc}-${block.endUtc}`}
                      ownerKey={ownerKey}
                      publicId={data.schedule.publicId}
                      selectedFinalTime={data.schedule.finalTime}
                      status={data.schedule.status}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <strong>暂时没有全员都可用的时间</strong>
                  <p>当前参与者提交还没有形成全员共同时间。</p>
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>当前较优时间槽</h2>
                <span>{data.results.totalParticipantCount} 人参与</span>
              </div>
              {rankedSlots.length > 0 ? (
                <div className={styles.slotList}>
                  {rankedSlots.map((slot) => (
                    <ManageRankedSlotItem
                      key={`${slot.startUtc}-${slot.endUtc}`}
                      participants={data.participants}
                      scheduleTitle={data.schedule.title}
                      slot={slot}
                      totalParticipantCount={data.results.totalParticipantCount}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <strong>还没有可排序的时间槽</strong>
                  <p>目前没有参与者提交可用时间。</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ManageAvailabilityBlockItem({
  block,
  ownerKey,
  publicId,
  selectedFinalTime,
  status
}: {
  readonly block: GetScheduleResponse["results"]["everyoneAvailableBlocks"][number];
  readonly ownerKey: string;
  readonly publicId: string;
  readonly selectedFinalTime: TimeSlotDto | null;
  readonly status: GetScheduleResponse["schedule"]["status"];
}) {
  const exportIcsUrl = availabilityBlockIcsExportUrl(publicId, ownerKey, block);
  const isSelected =
    selectedFinalTime?.startUtc === block.startUtc && selectedFinalTime.endUtc === block.endUtc;

  return (
    <div className={styles.blockItem}>
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
      <div className={styles.blockItemActions}>
        <p>{block.slotCount} 个连续时间槽</p>
        <ConfirmFinalTimeButton
          isSelected={isSelected}
          ownerKey={ownerKey}
          publicId={publicId}
          status={status}
          time={block}
        />
        <a className={styles.compactButton} href={exportIcsUrl}>
          <CalendarDays aria-hidden="true" size={15} />
          导出此时间
        </a>
      </div>
    </div>
  );
}

function ManageRankedSlotItem({
  participants,
  scheduleTitle,
  slot,
  totalParticipantCount
}: {
  readonly participants: GetScheduleResponse["participants"];
  readonly scheduleTitle: string;
  readonly slot: TimeSlotAvailabilityDto;
  readonly totalParticipantCount: number;
}) {
  const availableNames = formatAvailableParticipantNames(
    slot.availableParticipantIds,
    participants
  );
  const unavailableNames = formatUnavailableParticipantNames(
    slot.availableParticipantIds,
    participants
  );
  const copyText = buildManageRankedSlotCopyText({
    participants,
    scheduleTitle,
    slot,
    totalParticipantCount
  });

  return (
    <div className={styles.slotItem}>
      <div>
        <span>{formatLocalDateRange(slot)}</span>
        <strong>{formatLocalTimeRange(slot)}</strong>
      </div>
      <div className={styles.slotItemDetails}>
        <p>
          {slot.availableParticipantCount}/{totalParticipantCount} 可用
        </p>
        {availableNames.length > 0 ? <span>方便：{availableNames}</span> : null}
        {unavailableNames.length > 0 ? (
          <span className={styles.slotItemMuted}>未选此时间：{unavailableNames}</span>
        ) : null}
        <CopyRankedSlotButton text={copyText} />
      </div>
    </div>
  );
}

function FinalTimeNotice({
  finalTime,
  ownerKey,
  publicId
}: {
  readonly finalTime: TimeSlotDto;
  readonly ownerKey: string;
  readonly publicId: string;
}) {
  const exportFinalTimeIcsUrl = finalTimeIcsExportUrl(publicId, ownerKey);

  return (
    <section className={styles.finalTimeNotice} aria-label="已确认最终时间">
      <div className={styles.finalTimeIcon}>
        <CalendarCheck aria-hidden="true" size={20} />
      </div>
      <div className={styles.finalTimeNoticeBody}>
        <div>
          <span>已确认最终时间</span>
          <strong>
            {formatLocalDateRange(finalTime)} {formatLocalTimeRange(finalTime)}
          </strong>
        </div>
        <a className={styles.compactButton} href={exportFinalTimeIcsUrl}>
          <CalendarDays aria-hidden="true" size={15} />
          导出最终时间
        </a>
      </div>
    </section>
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

function formatLocalDateRange(value: Pick<TimeSlotDto, "localStartDate" | "localEndDate">): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return `${value.localStartDate} 至 ${value.localEndDate}`;
}

function formatLocalTimeRange(value: Pick<TimeSlotDto, "localStartTime" | "localEndTime">): string {
  return `${value.localStartTime}-${value.localEndTime}`;
}

function availabilityBlockIcsExportUrl(
  publicId: string,
  ownerKey: string,
  block: GetScheduleResponse["results"]["everyoneAvailableBlocks"][number]
): string {
  return `/api/schedules/${encodeURIComponent(publicId)}/export?${new URLSearchParams({
    endUtc: block.endUtc,
    format: "ics",
    key: ownerKey,
    startUtc: block.startUtc
  }).toString()}`;
}

function finalTimeIcsExportUrl(publicId: string, ownerKey: string): string {
  return `/api/schedules/${encodeURIComponent(publicId)}/export?${new URLSearchParams({
    format: "ics",
    key: ownerKey,
    target: "final-time"
  }).toString()}`;
}
