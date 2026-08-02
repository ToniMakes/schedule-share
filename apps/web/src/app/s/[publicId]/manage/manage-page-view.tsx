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
import { localizedApiErrorMessage } from "../../../i18n/api-error-messages";
import { LanguageSwitcher } from "../../../i18n/language-switcher";
import { PageLanguage } from "../../../i18n/page-language";
import { ConfirmFinalTimeButton } from "./final-time-control";
import { LockScheduleControl } from "./lock-schedule-control";
import {
  buildAvailabilityRecommendation,
  type AvailabilityRecommendation,
  type AvailabilityRecommendationItem
} from "./availability-recommendation";
import { CopyRankedSlotButton } from "./copy-ranked-slot-button";
import {
  confirmFinalTimeButtonCopy,
  copyRankedSlotButtonCopy,
  managePageCopy,
  manageResultSummaryPanelCopy,
  manageShareLinksPanelCopy
} from "./manage-copy";
import { ManageResultSummaryPanel } from "./result-summary-panel";
import { buildManageRankedSlotCopyText, buildManageResultSummary } from "./result-summary";
import { ManageShareLinksPanel } from "./share-links-panel";
import { AvailabilityHeatmapPanel } from "../availability-heatmap-panel";
import {
  formatAvailableParticipantNames,
  formatUnavailableParticipantNames
} from "../availability-slot-names";
import { CandidatePollResultsPanel } from "../candidate-results-panel";
import { schedulePageCopy, type SchedulePageLocale } from "../schedule-page-copy";
import styles from "../page.module.css";

export interface ManageSchedulePageProps {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
  readonly searchParams: Promise<{
    readonly key?: string | string[];
  }>;
}

export async function renderManageSchedulePage(
  { params, searchParams }: ManageSchedulePageProps,
  locale: SchedulePageLocale
) {
  const { publicId } = await params;
  const ownerKey = readSearchParam((await searchParams).key);

  try {
    const repository = new DrizzleScheduleRepository(getDatabase());
    const data = await getOwnerScheduleView(publicId, ownerKey, { repository });

    return <ManageView data={data} locale={locale} ownerKey={ownerKey} />;
  } catch (error) {
    return (
      <ErrorView
        locale={locale}
        message={toPageErrorMessage(error, locale)}
        ownerKey={ownerKey}
        publicId={publicId}
      />
    );
  }
}

function ManageView({
  data,
  locale,
  ownerKey
}: {
  readonly data: GetScheduleResponse;
  readonly locale: SchedulePageLocale;
  readonly ownerKey: string;
}) {
  const copy = managePageCopy[locale];
  const scheduleCopy = schedulePageCopy[locale];
  const isCandidatePoll = data.schedule.scheduleMode === "candidate_poll";
  const everyoneBlocks = data.results.everyoneAvailableBlocks.slice(0, 6);
  const rankedSlots = data.results.rankedSlots.slice(0, 8);
  const resultSummary = buildManageResultSummary(data, locale);
  const availabilityRecommendation = buildAvailabilityRecommendation(data);
  const publicPath = schedulePath(data.schedule.publicId, locale);

  return (
    <main className={styles.page}>
      <PageLanguage lang={locale === "en" ? "en" : "zh-CN"} />
      <AdPageChrome mobileAnchor={false} pageContext="manage-sensitive" thirdPartyAllowed={false}>
        <div className={styles.shell}>
          <LanguageSwitcher
            chineseHref={manageSchedulePath(data.schedule.publicId, ownerKey, "zh-CN")}
            current={locale}
            englishHref={manageSchedulePath(data.schedule.publicId, ownerKey, "en")}
          />
          <header className={styles.header}>
            <a className={styles.backLink} href={publicPath}>
              <ArrowLeft aria-hidden="true" size={17} />
              {copy.backSchedule}
            </a>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{copy.titleEyebrow}</p>
              <h1 className={styles.title}>{data.schedule.title}</h1>
              <p className={styles.description}>{copy.statusLabel(data.schedule.status)}</p>
            </div>
          </header>

          <section className={styles.summaryGrid} aria-label={copy.overviewAria}>
            <SummaryItem
              icon={<CalendarDays aria-hidden="true" size={18} />}
              label={scheduleCopy.dateLabel}
              value={copy.dateRange(data.schedule.dateRange.start, data.schedule.dateRange.end)}
            />
            <SummaryItem
              icon={<Clock aria-hidden="true" size={18} />}
              label={scheduleCopy.timezoneLabel}
              value={data.schedule.timezone}
            />
            <SummaryItem
              icon={<Users aria-hidden="true" size={18} />}
              label={copy.participantsLabel}
              value={copy.participantCount(data.participants.length)}
            />
            <SummaryItem
              icon={<Lock aria-hidden="true" size={18} />}
              label={copy.statusSummaryLabel}
              value={copy.statusLabel(data.schedule.status)}
            />
          </section>

          {data.schedule.finalTime ? (
            <FinalTimeNotice
              finalTime={data.schedule.finalTime}
              locale={locale}
              ownerKey={ownerKey}
              publicId={data.schedule.publicId}
            />
          ) : null}

          <ManageShareLinksPanel
            copy={manageShareLinksPanelCopy[locale]}
            ownerKey={ownerKey}
            publicId={data.schedule.publicId}
          />

          <LockScheduleControl
            locale={locale}
            ownerKey={ownerKey}
            publicId={data.schedule.publicId}
            status={data.schedule.status}
          />

          <DisplayAd
            pageContext="manage-sensitive"
            placement="top-banner"
            thirdPartyAllowed={false}
          />

          <ManageResultSummaryPanel
            copy={manageResultSummaryPanelCopy[locale]}
            summary={resultSummary}
          />

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
              locale={locale}
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
                locale={locale}
                selectedFinalTime={data.schedule.finalTime}
                slotMinutes={data.schedule.slotMinutes}
                status={data.schedule.status}
              />

              <AvailabilityHeatmapPanel
                locale={locale}
                slots={data.results.slotResults}
                totalParticipantCount={data.results.totalParticipantCount}
              />

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>{copy.allAvailableTitle}</h2>
                  <span>{copy.allAvailableCount(everyoneBlocks.length)}</span>
                </div>
                {everyoneBlocks.length > 0 ? (
                  <div className={styles.blockList}>
                    {everyoneBlocks.map((block) => (
                      <ManageAvailabilityBlockItem
                        block={block}
                        key={`${block.startUtc}-${block.endUtc}`}
                        locale={locale}
                        ownerKey={ownerKey}
                        publicId={data.schedule.publicId}
                        selectedFinalTime={data.schedule.finalTime}
                        status={data.schedule.status}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <strong>{copy.allAvailableEmptyTitle}</strong>
                    <p>{copy.allAvailableEmptyBody}</p>
                  </div>
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>{copy.bestSlotsTitle}</h2>
                  <span>{copy.rankedSlotCount(data.results.totalParticipantCount)}</span>
                </div>
                {rankedSlots.length > 0 ? (
                  <div className={styles.slotList}>
                    {rankedSlots.map((slot) => (
                      <ManageRankedSlotItem
                        key={`${slot.startUtc}-${slot.endUtc}`}
                        locale={locale}
                        participants={data.participants}
                        scheduleTitle={data.schedule.title}
                        slot={slot}
                        totalParticipantCount={data.results.totalParticipantCount}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <strong>{copy.rankedSlotEmptyTitle}</strong>
                    <p>{copy.rankedSlotEmptyBody}</p>
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
  locale,
  ownerKey,
  participants,
  publicId,
  recommendation,
  selectedFinalTime,
  slotMinutes,
  status
}: {
  readonly locale: SchedulePageLocale;
  readonly ownerKey: string;
  readonly participants: GetScheduleResponse["participants"];
  readonly publicId: string;
  readonly recommendation: AvailabilityRecommendation;
  readonly selectedFinalTime: TimeSlotDto | null;
  readonly slotMinutes: number;
  readonly status: GetScheduleResponse["schedule"]["status"];
}) {
  const copy = managePageCopy[locale];

  return (
    <section className={styles.bestTimeSection}>
      <div className={styles.sectionHeader}>
        <h2>{copy.recommendationTitle}</h2>
        <span>{recommendationStatusLabel(recommendation, locale)}</span>
      </div>

      {recommendation.status === "ready" ? (
        <div className={styles.bestTimePanel}>
          <RecommendedTimeCard
            item={recommendation.primary}
            locale={locale}
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
              <h3>{copy.recommendationAlternatesTitle}</h3>
              <ul className={styles.bestTimeAlternateList}>
                {recommendation.alternates.map((item) => (
                  <RecommendationAlternateItem
                    item={item}
                    key={`${item.startUtc}-${item.endUtc}`}
                    locale={locale}
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
          <strong>{recommendationEmptyTitle(recommendation, locale)}</strong>
          <p>{recommendationEmptyDescription(recommendation, locale)}</p>
        </div>
      )}
    </section>
  );
}

function RecommendedTimeCard({
  item,
  locale,
  ownerKey,
  participants,
  publicId,
  selectedFinalTime,
  slotMinutes,
  status,
  totalParticipantCount
}: {
  readonly item: AvailabilityRecommendationItem;
  readonly locale: SchedulePageLocale;
  readonly ownerKey: string;
  readonly participants: GetScheduleResponse["participants"];
  readonly publicId: string;
  readonly selectedFinalTime: TimeSlotDto | null;
  readonly slotMinutes: number;
  readonly status: GetScheduleResponse["schedule"]["status"];
  readonly totalParticipantCount: number;
}) {
  const copy = managePageCopy[locale];
  const nameOptions = participantNameOptions(locale);
  const availableNames = formatAvailableParticipantNames(
    item.availableParticipantIds,
    participants,
    nameOptions
  );
  const unavailableNames = formatUnavailableParticipantNames(
    item.availableParticipantIds,
    participants,
    nameOptions
  );
  const canConfirm = item.kind === "all_available";
  const exportIcsUrl = canConfirm ? availabilityBlockIcsExportUrl(publicId, ownerKey, item) : "";

  return (
    <article className={styles.bestTimeHero}>
      <div className={styles.bestTimeIcon}>
        <Trophy aria-hidden="true" size={22} />
      </div>
      <div className={styles.bestTimeHeroBody}>
        <span className={styles.bestTimeBadge}>{recommendationItemBadge(item, locale)}</span>
        <h3>
          {formatLocalDateRange(item, locale)} {formatLocalTimeRange(item)}
        </h3>
        <p>{recommendationHeadline(item, totalParticipantCount, locale)}</p>

        <div className={styles.bestTimeMetrics} aria-label={copy.recommendationBasisAria}>
          <span className={styles.bestTimeMetric}>
            <strong>{formatAvailabilityRatio(item, totalParticipantCount, locale)}</strong>
            <em>{copy.recommendationPeopleMetric}</em>
          </span>
          <span className={styles.bestTimeMetric}>
            <strong>{item.availablePercent}%</strong>
            <em>{copy.recommendationCoverageMetric}</em>
          </span>
          <span className={styles.bestTimeMetric}>
            <strong>{formatDuration(item.slotCount, slotMinutes, locale)}</strong>
            <em>{copy.recommendationDurationMetric}</em>
          </span>
        </div>

        <div className={styles.bestTimePeople}>
          <p>
            <strong>{copy.availableLabel}:</strong>
            {availableNames.length > 0 ? availableNames : locale === "en" ? "None yet" : "暂无"}
          </p>
          {unavailableNames.length > 0 ? (
            <p>
              <strong>{copy.unavailableLabel}:</strong>
              {unavailableNames}
            </p>
          ) : null}
        </div>

        {canConfirm ? (
          <div className={styles.bestTimeActions}>
            <ConfirmFinalTimeButton
              copy={confirmFinalTimeButtonCopy[locale]}
              isSelected={isSelectedFinalTime(selectedFinalTime, item)}
              locale={locale}
              ownerKey={ownerKey}
              publicId={publicId}
              status={status}
              time={item}
            />
            <a className={styles.compactButton} href={exportIcsUrl}>
              <CalendarDays aria-hidden="true" size={15} />
              {copy.exportThisTime}
            </a>
          </div>
        ) : (
          <p className={styles.bestTimePeakNote}>{copy.peakNote}</p>
        )}
      </div>
    </article>
  );
}

function RecommendationAlternateItem({
  item,
  locale,
  participants,
  slotMinutes,
  totalParticipantCount
}: {
  readonly item: AvailabilityRecommendationItem;
  readonly locale: SchedulePageLocale;
  readonly participants: GetScheduleResponse["participants"];
  readonly slotMinutes: number;
  readonly totalParticipantCount: number;
}) {
  const nameOptions = participantNameOptions(locale);
  const availableNames = formatAvailableParticipantNames(
    item.availableParticipantIds,
    participants,
    nameOptions
  );

  return (
    <li className={styles.bestTimeAlternateItem}>
      <div>
        <strong>
          {formatLocalDateRange(item, locale)} {formatLocalTimeRange(item)}
        </strong>
        <span>
          {formatAvailabilityRatio(item, totalParticipantCount, locale)} ·{" "}
          {formatDuration(item.slotCount, slotMinutes, locale)}
          {availableNames.length > 0
            ? `${locale === "en" ? " · Available: " : " · 可用："}${availableNames}`
            : ""}
        </span>
      </div>
      <span className={styles.bestTimeAlternateBadge}>{recommendationItemBadge(item, locale)}</span>
    </li>
  );
}

function ManageAvailabilityBlockItem({
  block,
  locale,
  ownerKey,
  publicId,
  selectedFinalTime,
  status
}: {
  readonly block: GetScheduleResponse["results"]["everyoneAvailableBlocks"][number];
  readonly locale: SchedulePageLocale;
  readonly ownerKey: string;
  readonly publicId: string;
  readonly selectedFinalTime: TimeSlotDto | null;
  readonly status: GetScheduleResponse["schedule"]["status"];
}) {
  const copy = managePageCopy[locale];
  const exportIcsUrl = availabilityBlockIcsExportUrl(publicId, ownerKey, block);
  const isSelected = isSelectedFinalTime(selectedFinalTime, block);

  return (
    <div className={styles.blockItem}>
      <div>
        <span>
          {block.localStartDate === block.localEndDate
            ? block.localStartDate
            : copy.dateRange(block.localStartDate, block.localEndDate)}
        </span>
        <strong>
          {block.localStartTime}-{block.localEndTime}
        </strong>
      </div>
      <div className={styles.blockItemActions}>
        <p>{copy.continuousSlots(block.slotCount)}</p>
        <ConfirmFinalTimeButton
          copy={confirmFinalTimeButtonCopy[locale]}
          isSelected={isSelected}
          locale={locale}
          ownerKey={ownerKey}
          publicId={publicId}
          status={status}
          time={block}
        />
        <a className={styles.compactButton} href={exportIcsUrl}>
          <CalendarDays aria-hidden="true" size={15} />
          {copy.exportThisTime}
        </a>
      </div>
    </div>
  );
}

function ManageRankedSlotItem({
  locale,
  participants,
  scheduleTitle,
  slot,
  totalParticipantCount
}: {
  readonly locale: SchedulePageLocale;
  readonly participants: GetScheduleResponse["participants"];
  readonly scheduleTitle: string;
  readonly slot: TimeSlotAvailabilityDto;
  readonly totalParticipantCount: number;
}) {
  const copy = managePageCopy[locale];
  const copyButtonCopy = copyRankedSlotButtonCopy[locale];
  const nameOptions = participantNameOptions(locale);
  const availableNames = formatAvailableParticipantNames(
    slot.availableParticipantIds,
    participants,
    nameOptions
  );
  const unavailableNames = formatUnavailableParticipantNames(
    slot.availableParticipantIds,
    participants,
    nameOptions
  );
  const copyText = buildManageRankedSlotCopyText({
    locale,
    participants,
    scheduleTitle,
    slot,
    totalParticipantCount
  });

  return (
    <div className={styles.slotItem}>
      <div>
        <span>{formatLocalDateRange(slot, locale)}</span>
        <strong>{formatLocalTimeRange(slot)}</strong>
      </div>
      <div className={styles.slotItemDetails}>
        <p>
          {locale === "en"
            ? `${slot.availableParticipantCount}/${totalParticipantCount} available`
            : `${slot.availableParticipantCount}/${totalParticipantCount} 可用`}
        </p>
        {availableNames.length > 0 ? (
          <span>
            {copy.availableLabel}: {availableNames}
          </span>
        ) : null}
        {unavailableNames.length > 0 ? (
          <span className={styles.slotItemMuted}>
            {locale === "en" ? "Not selected for this time" : "未选此时间"}: {unavailableNames}
          </span>
        ) : null}
        <CopyRankedSlotButton
          copiedLabel={copyButtonCopy.copied}
          copyFailedLabel={copyButtonCopy.copyFailed}
          fallbackAriaLabel={copyButtonCopy.fallbackAriaLabel}
          idleLabel={copyButtonCopy.idleLabel}
          text={copyText}
        />
      </div>
    </div>
  );
}

function FinalTimeNotice({
  finalTime,
  locale,
  ownerKey,
  publicId
}: {
  readonly finalTime: TimeSlotDto;
  readonly locale: SchedulePageLocale;
  readonly ownerKey: string;
  readonly publicId: string;
}) {
  const copy = managePageCopy[locale];
  const exportFinalTimeIcsUrl = finalTimeIcsExportUrl(publicId, ownerKey);

  return (
    <section className={styles.finalTimeNotice} aria-label={copy.finalTimeAria}>
      <div className={styles.finalTimeIcon}>
        <CalendarCheck aria-hidden="true" size={20} />
      </div>
      <div className={styles.finalTimeNoticeBody}>
        <div>
          <span>{copy.finalTimeTitle}</span>
          <strong>
            {formatLocalDateRange(finalTime, locale)} {formatLocalTimeRange(finalTime)}
          </strong>
        </div>
        <a className={styles.compactButton} href={exportFinalTimeIcsUrl}>
          <CalendarDays aria-hidden="true" size={15} />
          {copy.exportFinalTime}
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

function ErrorView({
  locale,
  message,
  ownerKey,
  publicId
}: {
  readonly locale: SchedulePageLocale;
  readonly message: string;
  readonly ownerKey: string;
  readonly publicId: string;
}) {
  const copy = managePageCopy[locale];

  return (
    <main className={styles.page}>
      <PageLanguage lang={locale === "en" ? "en" : "zh-CN"} />
      <div className={styles.shell}>
        <LanguageSwitcher
          chineseHref={manageSchedulePath(publicId, ownerKey, "zh-CN")}
          current={locale}
          englishHref={manageSchedulePath(publicId, ownerKey, "en")}
        />
        <header className={styles.header}>
          <a className={styles.backLink} href={schedulePath(publicId, locale)}>
            <ArrowLeft aria-hidden="true" size={17} />
            {copy.backSchedule}
          </a>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>{copy.titleEyebrow}</p>
            <h1 className={styles.title}>
              {locale === "en" ? "Cannot Open Manage Page" : "无法打开管理页"}
            </h1>
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

function toPageErrorMessage(error: unknown, locale: SchedulePageLocale): string {
  if (error instanceof HttpError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return locale === "en" ? "The database is not configured yet." : "数据库尚未配置。";
    }

    if (error.code === "INVALID_OWNER_KEY") {
      return locale === "en"
        ? "The organizer link is invalid or missing its key."
        : "管理链接无效或缺少密钥。";
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return locale === "en"
        ? "This schedule does not exist, or the link is incorrect."
        : "这个日程不存在或链接有误。";
    }

    return localizedApiErrorMessage(error.code, locale);
  }

  return locale === "en"
    ? "The server cannot read the manage page right now."
    : "服务器暂时无法读取管理页。";
}

function recommendationStatusLabel(
  recommendation: AvailabilityRecommendation,
  locale: SchedulePageLocale
): string {
  if (recommendation.status === "ready") {
    return recommendationItemBadge(recommendation.primary, locale);
  }

  if (recommendation.status === "waiting") {
    return managePageCopy[locale].recommendationStatusWaiting;
  }

  return managePageCopy[locale].participantSummary(recommendation.totalParticipantCount);
}

function recommendationItemBadge(
  item: AvailabilityRecommendationItem,
  locale: SchedulePageLocale
): string {
  const copy = managePageCopy[locale];

  if (item.kind === "all_available") {
    return copy.recommendedAllAvailable;
  }

  return copy.recommendedMostAvailable;
}

function recommendationHeadline(
  item: AvailabilityRecommendationItem,
  totalParticipantCount: number,
  locale: SchedulePageLocale
): string {
  const copy = managePageCopy[locale];

  if (item.kind === "all_available") {
    return copy.recommendationHeadlineAllAvailable;
  }

  return copy.recommendationHeadlinePeak(
    formatAvailabilityRatio(item, totalParticipantCount, locale)
  );
}

function recommendationEmptyTitle(
  recommendation: Exclude<AvailabilityRecommendation, { status: "ready" }>,
  locale: SchedulePageLocale
): string {
  const copy = managePageCopy[locale];

  if (recommendation.status === "waiting") {
    return copy.recommendationEmptyWaiting;
  }

  return copy.recommendationEmptyNoTime;
}

function recommendationEmptyDescription(
  recommendation: Exclude<AvailabilityRecommendation, { status: "ready" }>,
  locale: SchedulePageLocale
): string {
  const copy = managePageCopy[locale];

  if (recommendation.status === "waiting") {
    return copy.recommendationEmptyNoSubmissions;
  }

  return copy.recommendationEmptyAfterSubmissions(recommendation.totalParticipantCount);
}

function formatLocalDateRange(
  value: Pick<TimeSlotDto, "localStartDate" | "localEndDate">,
  locale: SchedulePageLocale
): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return managePageCopy[locale].dateRange(value.localStartDate, value.localEndDate);
}

function formatLocalTimeRange(value: Pick<TimeSlotDto, "localStartTime" | "localEndTime">): string {
  return `${value.localStartTime}-${value.localEndTime}`;
}

function formatAvailabilityRatio(
  item: Pick<AvailabilityRecommendationItem, "availableParticipantCount">,
  totalParticipantCount: number,
  locale: SchedulePageLocale
): string {
  if (locale === "en") {
    return `${item.availableParticipantCount}/${totalParticipantCount} people`;
  }

  return `${item.availableParticipantCount}/${totalParticipantCount} 人`;
}

function formatDuration(
  slotCount: number,
  slotMinutes: number,
  locale: SchedulePageLocale
): string {
  const totalMinutes = slotCount * slotMinutes;

  if (totalMinutes < 60) {
    if (locale === "en") {
      return `${totalMinutes} minutes`;
    }

    return `${totalMinutes} 分钟`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    if (locale === "en") {
      return hours === 1 ? "1 hour" : `${hours} hours`;
    }

    return `${hours} 小时`;
  }

  if (locale === "en") {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} minutes`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

function participantNameOptions(locale: SchedulePageLocale): {
  readonly separator: string;
  readonly unknownParticipant: string;
} {
  return {
    separator: locale === "en" ? ", " : "、",
    unknownParticipant: managePageCopy[locale].unknownParticipant
  };
}

function schedulePath(publicId: string, locale: SchedulePageLocale): string {
  return `${locale === "en" ? "/s/" : "/zh/s/"}${encodeURIComponent(publicId)}`;
}

function manageSchedulePath(
  publicId: string,
  ownerKey: string,
  locale: SchedulePageLocale
): string {
  return `${schedulePath(publicId, locale)}/manage?${new URLSearchParams({
    key: ownerKey
  }).toString()}`;
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
