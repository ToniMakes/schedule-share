import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarCheck, CalendarDays, Clock, Lock, Trophy, Users } from "lucide-react";

import type {
  GetScheduleResponse,
  TimeSlotAvailabilityDto,
  TimeSlotDto
} from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { HttpError } from "@/server/errors";
import { getOwnerScheduleView } from "@/server/schedules/get-owner-schedule";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

import { AdPageChrome, DisplayAd } from "../../../ads/display-ad";
import { ConfirmFinalTimeButton } from "./final-time-control";
import { LockScheduleControl } from "./lock-schedule-control";
import {
  buildAvailabilityRecommendation,
  type AvailabilityRecommendation,
  type AvailabilityRecommendationItem
} from "./availability-recommendation";
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
  const availabilityRecommendation = buildAvailabilityRecommendation(data);

  return (
    <main className={styles.page}>
      <AdPageChrome mobileAnchor={false} pageContext="manage-sensitive" thirdPartyAllowed={false}>
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

          <DisplayAd
            pageContext="manage-sensitive"
            placement="top-banner"
            thirdPartyAllowed={false}
          />

          <ManageResultSummaryPanel summary={resultSummary} />

          <DisplayAd
            pageContext="manage-sensitive"
            placement="inline-results"
            thirdPartyAllowed={false}
          />

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
              <AvailabilityRecommendationPanel
                ownerKey={ownerKey}
                participants={data.participants}
                publicId={data.schedule.publicId}
                recommendation={availabilityRecommendation}
                selectedFinalTime={data.schedule.finalTime}
                slotMinutes={data.schedule.slotMinutes}
                status={data.schedule.status}
              />

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
          <DisplayAd
            pageContext="manage-sensitive"
            placement="bottom-banner"
            thirdPartyAllowed={false}
          />
        </div>
      </AdPageChrome>
    </main>
  );
}

function AvailabilityRecommendationPanel({
  ownerKey,
  participants,
  publicId,
  recommendation,
  selectedFinalTime,
  slotMinutes,
  status
}: {
  readonly ownerKey: string;
  readonly participants: GetScheduleResponse["participants"];
  readonly publicId: string;
  readonly recommendation: AvailabilityRecommendation;
  readonly selectedFinalTime: TimeSlotDto | null;
  readonly slotMinutes: number;
  readonly status: GetScheduleResponse["schedule"]["status"];
}) {
  return (
    <section className={styles.bestTimeSection}>
      <div className={styles.sectionHeader}>
        <h2>系统推荐最佳时间</h2>
        <span>{recommendationStatusLabel(recommendation)}</span>
      </div>

      {recommendation.status === "ready" ? (
        <div className={styles.bestTimePanel}>
          <RecommendedTimeCard
            item={recommendation.primary}
            ownerKey={ownerKey}
            participants={participants}
            publicId={publicId}
            selectedFinalTime={selectedFinalTime}
            slotMinutes={slotMinutes}
            status={status}
            totalParticipantCount={recommendation.totalParticipantCount}
          />

          {recommendation.alternates.length > 0 ? (
            <div className={styles.bestTimeAlternates}>
              <h3>备选推荐</h3>
              <ul className={styles.bestTimeAlternateList}>
                {recommendation.alternates.map((item) => (
                  <RecommendationAlternateItem
                    item={item}
                    key={`${item.startUtc}-${item.endUtc}`}
                    participants={participants}
                    slotMinutes={slotMinutes}
                    totalParticipantCount={recommendation.totalParticipantCount}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>{recommendationEmptyTitle(recommendation)}</strong>
          <p>{recommendationEmptyDescription(recommendation)}</p>
        </div>
      )}
    </section>
  );
}

function RecommendedTimeCard({
  item,
  ownerKey,
  participants,
  publicId,
  selectedFinalTime,
  slotMinutes,
  status,
  totalParticipantCount
}: {
  readonly item: AvailabilityRecommendationItem;
  readonly ownerKey: string;
  readonly participants: GetScheduleResponse["participants"];
  readonly publicId: string;
  readonly selectedFinalTime: TimeSlotDto | null;
  readonly slotMinutes: number;
  readonly status: GetScheduleResponse["schedule"]["status"];
  readonly totalParticipantCount: number;
}) {
  const availableNames = formatAvailableParticipantNames(
    item.availableParticipantIds,
    participants
  );
  const unavailableNames = formatUnavailableParticipantNames(
    item.availableParticipantIds,
    participants
  );
  const canConfirm = item.kind === "all_available";
  const exportIcsUrl = canConfirm ? availabilityBlockIcsExportUrl(publicId, ownerKey, item) : "";

  return (
    <article className={styles.bestTimeHero}>
      <div className={styles.bestTimeIcon}>
        <Trophy aria-hidden="true" size={22} />
      </div>
      <div className={styles.bestTimeHeroBody}>
        <span className={styles.bestTimeBadge}>{recommendationItemBadge(item)}</span>
        <h3>
          {formatLocalDateRange(item)} {formatLocalTimeRange(item)}
        </h3>
        <p>{recommendationHeadline(item, totalParticipantCount)}</p>

        <div className={styles.bestTimeMetrics} aria-label="推荐依据">
          <span className={styles.bestTimeMetric}>
            <strong>{formatAvailabilityRatio(item, totalParticipantCount)}</strong>
            <em>可用人数</em>
          </span>
          <span className={styles.bestTimeMetric}>
            <strong>{item.availablePercent}%</strong>
            <em>覆盖率</em>
          </span>
          <span className={styles.bestTimeMetric}>
            <strong>{formatDuration(item.slotCount, slotMinutes)}</strong>
            <em>连续时长</em>
          </span>
        </div>

        <div className={styles.bestTimePeople}>
          <p>
            <strong>可用：</strong>
            {availableNames.length > 0 ? availableNames : "暂无"}
          </p>
          {unavailableNames.length > 0 ? (
            <p>
              <strong>未覆盖：</strong>
              {unavailableNames}
            </p>
          ) : null}
        </div>

        {canConfirm ? (
          <div className={styles.bestTimeActions}>
            <ConfirmFinalTimeButton
              isSelected={isSelectedFinalTime(selectedFinalTime, item)}
              ownerKey={ownerKey}
              publicId={publicId}
              status={status}
              time={item}
            />
            <a className={styles.compactButton} href={exportIcsUrl}>
              <CalendarDays aria-hidden="true" size={15} />
              导出此时间
            </a>
          </div>
        ) : (
          <p className={styles.bestTimePeakNote}>
            这不是全员可用时间，先作为折中建议展示；最终确认仍需要选择全员可用时间，或让未覆盖的人再调整。
          </p>
        )}
      </div>
    </article>
  );
}

function RecommendationAlternateItem({
  item,
  participants,
  slotMinutes,
  totalParticipantCount
}: {
  readonly item: AvailabilityRecommendationItem;
  readonly participants: GetScheduleResponse["participants"];
  readonly slotMinutes: number;
  readonly totalParticipantCount: number;
}) {
  const availableNames = formatAvailableParticipantNames(
    item.availableParticipantIds,
    participants
  );

  return (
    <li className={styles.bestTimeAlternateItem}>
      <div>
        <strong>
          {formatLocalDateRange(item)} {formatLocalTimeRange(item)}
        </strong>
        <span>
          {formatAvailabilityRatio(item, totalParticipantCount)} ·{" "}
          {formatDuration(item.slotCount, slotMinutes)}
          {availableNames.length > 0 ? ` · 可用：${availableNames}` : ""}
        </span>
      </div>
      <span className={styles.bestTimeAlternateBadge}>{recommendationItemBadge(item)}</span>
    </li>
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
  const isSelected = isSelectedFinalTime(selectedFinalTime, block);

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

function recommendationStatusLabel(recommendation: AvailabilityRecommendation): string {
  if (recommendation.status === "ready") {
    return recommendationItemBadge(recommendation.primary);
  }

  if (recommendation.status === "waiting") {
    return "等待填写";
  }

  return `${recommendation.totalParticipantCount} 人参与`;
}

function recommendationItemBadge(item: AvailabilityRecommendationItem): string {
  if (item.kind === "all_available") {
    return "全员可用";
  }

  return "最多人可用";
}

function recommendationHeadline(
  item: AvailabilityRecommendationItem,
  totalParticipantCount: number
): string {
  if (item.kind === "all_available") {
    return "这是当前最长的全员共同可用时间，可以直接设为最终时间并导出日历。";
  }

  return `当前没有全员重叠时间，这一段覆盖 ${formatAvailabilityRatio(
    item,
    totalParticipantCount
  )}，适合作为下一轮协调的首选。`;
}

function recommendationEmptyTitle(
  recommendation: Exclude<AvailabilityRecommendation, { status: "ready" }>
): string {
  if (recommendation.status === "waiting") {
    return "还在等待参与者填写";
  }

  return "还没有可推荐的时间";
}

function recommendationEmptyDescription(
  recommendation: Exclude<AvailabilityRecommendation, { status: "ready" }>
): string {
  if (recommendation.status === "waiting") {
    return "有人提交可用时间后，系统会自动挑出覆盖人数最多、连续时长更好的时间段。";
  }

  return `已有 ${recommendation.totalParticipantCount} 人参与，但还没有任何可用时间槽。`;
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

function formatAvailabilityRatio(
  item: Pick<AvailabilityRecommendationItem, "availableParticipantCount">,
  totalParticipantCount: number
): string {
  return `${item.availableParticipantCount}/${totalParticipantCount} 人`;
}

function formatDuration(slotCount: number, slotMinutes: number): string {
  const totalMinutes = slotCount * slotMinutes;

  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

function isSelectedFinalTime(
  selectedFinalTime: TimeSlotDto | null,
  time: Pick<TimeSlotDto, "startUtc" | "endUtc">
): boolean {
  return (
    selectedFinalTime !== null &&
    selectedFinalTime.startUtc === time.startUtc &&
    selectedFinalTime.endUtc === time.endUtc
  );
}

function availabilityBlockIcsExportUrl(
  publicId: string,
  ownerKey: string,
  block: Pick<TimeSlotDto, "startUtc" | "endUtc">
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
