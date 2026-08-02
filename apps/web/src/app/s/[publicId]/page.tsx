import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarCheck, CalendarDays, Clock, ListChecks, Users } from "lucide-react";

import type {
  AvailabilityBlockDto,
  GetScheduleResponse,
  TimeSlotDto,
  TimeSlotAvailabilityDto
} from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { HttpError } from "@/server/errors";
import { getScheduleView } from "@/server/schedules/get-schedule";
import { isPublicImageImportVisible } from "@/server/schedules/image-import";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

import { AdPageChrome, DisplayAd } from "../../ads/display-ad";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityHeatmapPanel } from "./availability-heatmap-panel";
import {
  formatAvailableParticipantNames,
  formatUnavailableParticipantNames
} from "./availability-slot-names";
import { CandidatePollResultsPanel } from "./candidate-results-panel";
import styles from "./page.module.css";
import { RememberedEditLinkPanel } from "./remembered-edit-link-panel";

export const dynamic = "force-dynamic";

interface SchedulePageProps {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

const dayLabels: Record<number, string> = {
  0: "周日",
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六"
};

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { publicId } = await params;

  try {
    const repository = new DrizzleScheduleRepository(getDatabase());
    const schedule = await getScheduleView(publicId, { repository });

    return <ScheduleView data={schedule} />;
  } catch (error) {
    return <ErrorView message={toPageErrorMessage(error)} />;
  }
}

function ScheduleView({ data }: { readonly data: GetScheduleResponse }) {
  const isCandidatePoll = data.schedule.scheduleMode === "candidate_poll";
  const everyoneBlocks = data.results.everyoneAvailableBlocks.slice(0, 8);
  const rankedSlots = data.results.rankedSlots.slice(0, 8);

  return (
    <main className={styles.page}>
      <AdPageChrome mobileAnchor={false} pageContext="public-schedule">
        <div className={styles.shell}>
          <header className={styles.header}>
            <Link className={styles.backLink} href="/">
              <ArrowLeft aria-hidden="true" size={17} />
              返回首页
            </Link>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>Shared Schedule</p>
              <h1 className={styles.title}>{data.schedule.title}</h1>
              {data.schedule.description ? (
                <p className={styles.description}>{data.schedule.description}</p>
              ) : null}
            </div>
          </header>

          <section className={styles.summaryGrid} aria-label="日程概览">
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
              icon={<ListChecks aria-hidden="true" size={18} />}
              label={isCandidatePoll ? "模式" : "粒度"}
              value={isCandidatePoll ? "候选投票" : `${data.schedule.slotMinutes} 分钟`}
            />
            <SummaryItem
              icon={<Users aria-hidden="true" size={18} />}
              label="参与者"
              value={`${data.participants.length} 人`}
            />
          </section>

          {data.schedule.finalTime ? <FinalTimeNotice finalTime={data.schedule.finalTime} /> : null}

          <RememberedEditLinkPanel
            publicId={data.schedule.publicId}
            scheduleStatus={data.schedule.status}
          />

          <DisplayAd pageContext="public-schedule" placement="top-banner" />

          <AvailabilityForm
            publicId={data.schedule.publicId}
            imageImportVisible={isPublicImageImportVisible()}
            scheduleMode={data.schedule.scheduleMode}
            scheduleStatus={data.schedule.status}
            scheduleTimezone={data.schedule.timezone}
            slots={data.results.slotResults}
            totalParticipantCount={data.results.totalParticipantCount}
          />

          {isCandidatePoll ? (
            <>
              <DisplayAd pageContext="public-schedule" placement="inline-results" />
              <CandidatePollResultsPanel
                participants={data.participants}
                slots={data.results.slotResults}
              />
            </>
          ) : (
            <>
              <AvailabilityHeatmapPanel
                slots={data.results.slotResults}
                totalParticipantCount={data.results.totalParticipantCount}
              />

              <DisplayAd pageContext="public-schedule" placement="inline-results" />

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>全员可用时间</h2>
                  <span>{everyoneBlocks.length} 段</span>
                </div>
                {everyoneBlocks.length > 0 ? (
                  <div className={styles.blockList}>
                    {everyoneBlocks.map((block) => (
                      <AvailabilityBlockItem
                        block={block}
                        key={`${block.startUtc}-${block.endUtc}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="暂时没有全员都可用的时间"
                    body={
                      data.participants.length === 0
                        ? "等待参与者提交可用时间后，这里会自动汇总。"
                        : "可以扩大日期范围、调整时间段，或等待更多参与者更新。"
                    }
                  />
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>当前最优时间槽</h2>
                  <span>{data.results.totalParticipantCount} 人参与</span>
                </div>
                {rankedSlots.length > 0 ? (
                  <div className={styles.slotList}>
                    {rankedSlots.map((slot) => (
                      <RankedSlotItem
                        key={`${slot.startUtc}-${slot.endUtc}`}
                        participants={data.participants}
                        slot={slot}
                        totalParticipantCount={data.results.totalParticipantCount}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="还没有可排序的时间槽" body="目前没有参与者提交可用时间。" />
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>可选时间范围</h2>
                  <span>{data.schedule.dailyWindows.length} 组</span>
                </div>
                <div className={styles.windowList}>
                  {data.schedule.dailyWindows.map((window, index) => (
                    <div
                      className={styles.windowItem}
                      key={`${index}-${window.startTime}-${window.endTime}`}
                    >
                      <span>{index + 1}</span>
                      <strong>
                        {formatDays(window.daysOfWeek)} {window.startTime}-{window.endTime}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <DisplayAd pageContext="public-schedule" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}

function FinalTimeNotice({ finalTime }: { readonly finalTime: TimeSlotDto }) {
  return (
    <section className={styles.finalTimeNotice} aria-label="已确认最终时间">
      <div className={styles.finalTimeIcon}>
        <CalendarCheck aria-hidden="true" size={20} />
      </div>
      <div>
        <span>已确认最终时间</span>
        <strong>
          {formatLocalDateRange(finalTime)} {formatLocalTimeRange(finalTime)}
        </strong>
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

function AvailabilityBlockItem({ block }: { readonly block: AvailabilityBlockDto }) {
  return (
    <div className={styles.blockItem}>
      <div>
        <span>{formatLocalDateRange(block)}</span>
        <strong>{formatLocalTimeRange(block)}</strong>
      </div>
      <p>{block.slotCount} 个连续时间槽</p>
    </div>
  );
}

function RankedSlotItem({
  participants,
  slot,
  totalParticipantCount
}: {
  readonly participants: GetScheduleResponse["participants"];
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
      </div>
    </div>
  );
}

function EmptyState({ body, title }: { readonly body: string; readonly title: string }) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function ErrorView({ message }: { readonly message: string }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            返回首页
          </Link>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>Shared Schedule</p>
            <h1 className={styles.title}>无法打开日程</h1>
            <p className={styles.description}>{message}</p>
          </div>
        </header>
      </div>
    </main>
  );
}

function formatDays(daysOfWeek: readonly number[] | undefined): string {
  if (daysOfWeek === undefined) {
    return "每天";
  }

  return daysOfWeek.map((day) => dayLabels[day]).join("、");
}

function formatLocalDateRange(
  value: Pick<AvailabilityBlockDto, "localStartDate" | "localEndDate">
): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return `${value.localStartDate} 至 ${value.localEndDate}`;
}

function formatLocalTimeRange(
  value: Pick<AvailabilityBlockDto, "localStartTime" | "localEndTime">
): string {
  return `${value.localStartTime}-${value.localEndTime}`;
}

function toPageErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return "数据库尚未配置。";
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return "这个日程不存在或链接有误。";
    }

    return error.message;
  }

  return "服务器暂时无法读取这个日程。";
}
