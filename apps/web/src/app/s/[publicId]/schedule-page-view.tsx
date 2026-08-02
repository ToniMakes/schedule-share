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
import { localizedApiErrorMessage } from "../../i18n/api-error-messages";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import { PageLanguage } from "../../i18n/page-language";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityHeatmapPanel } from "./availability-heatmap-panel";
import {
  formatAvailableParticipantNames,
  formatUnavailableParticipantNames
} from "./availability-slot-names";
import { CandidatePollResultsPanel } from "./candidate-results-panel";
import styles from "./page.module.css";
import { RememberedEditLinkPanel } from "./remembered-edit-link-panel";
import {
  schedulePageCopy,
  type SchedulePageCopy,
  type SchedulePageLocale
} from "./schedule-page-copy";

export async function renderSchedulePage(publicId: string, locale: SchedulePageLocale) {
  try {
    const repository = new DrizzleScheduleRepository(getDatabase());
    const schedule = await getScheduleView(publicId, { repository });

    return <ScheduleView data={schedule} locale={locale} />;
  } catch (error) {
    return <ErrorView locale={locale} message={toPageErrorMessage(error, locale)} />;
  }
}

function ScheduleView({
  data,
  locale
}: {
  readonly data: GetScheduleResponse;
  readonly locale: SchedulePageLocale;
}) {
  const copy = schedulePageCopy[locale];
  const isCandidatePoll = data.schedule.scheduleMode === "candidate_poll";
  const everyoneBlocks = data.results.everyoneAvailableBlocks.slice(0, 8);
  const rankedSlots = data.results.rankedSlots.slice(0, 8);

  return (
    <main className={styles.page}>
      {locale === "en" ? <PageLanguage lang="en" /> : null}
      <AdPageChrome mobileAnchor={false} pageContext="public-schedule">
        <div className={styles.shell}>
          <LanguageSwitcher
            chineseHref={`/s/${data.schedule.publicId}`}
            current={locale}
            englishHref={`/en/s/${data.schedule.publicId}`}
          />
          <header className={styles.header}>
            <Link className={styles.backLink} href={locale === "en" ? "/en" : "/"}>
              <ArrowLeft aria-hidden="true" size={17} />
              {copy.backHome}
            </Link>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{copy.sharedScheduleEyebrow}</p>
              <h1 className={styles.title}>{data.schedule.title}</h1>
              {data.schedule.description ? (
                <p className={styles.description}>{data.schedule.description}</p>
              ) : null}
            </div>
          </header>

          <section className={styles.summaryGrid} aria-label={copy.scheduleOverviewAria}>
            <SummaryItem
              icon={<CalendarDays aria-hidden="true" size={18} />}
              label={copy.dateLabel}
              value={`${data.schedule.dateRange.start}${copy.dateSeparator}${data.schedule.dateRange.end}`}
            />
            <SummaryItem
              icon={<Clock aria-hidden="true" size={18} />}
              label={copy.timezoneLabel}
              value={data.schedule.timezone}
            />
            <SummaryItem
              icon={<ListChecks aria-hidden="true" size={18} />}
              label={isCandidatePoll ? copy.modeLabel : copy.slotLengthLabel}
              value={
                isCandidatePoll
                  ? copy.candidateMode
                  : locale === "en"
                    ? `${data.schedule.slotMinutes} minutes`
                    : `${data.schedule.slotMinutes} 分钟`
              }
            />
            <SummaryItem
              icon={<Users aria-hidden="true" size={18} />}
              label={copy.participantsLabel}
              value={copy.participantCount(data.participants.length)}
            />
          </section>

          {data.schedule.finalTime ? (
            <FinalTimeNotice copy={copy} finalTime={data.schedule.finalTime} />
          ) : null}

          <RememberedEditLinkPanel
            locale={locale}
            publicId={data.schedule.publicId}
            scheduleStatus={data.schedule.status}
          />

          <DisplayAd pageContext="public-schedule" placement="top-banner" />

          <AvailabilityForm
            publicId={data.schedule.publicId}
            imageImportVisible={isPublicImageImportVisible()}
            locale={locale}
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
                locale={locale}
                participants={data.participants}
                slots={data.results.slotResults}
              />
            </>
          ) : (
            <>
              <AvailabilityHeatmapPanel
                locale={locale}
                slots={data.results.slotResults}
                totalParticipantCount={data.results.totalParticipantCount}
              />

              <DisplayAd pageContext="public-schedule" placement="inline-results" />

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>{copy.everyoneAvailableTitle}</h2>
                  <span>{copy.slotsPlural(everyoneBlocks.length)}</span>
                </div>
                {everyoneBlocks.length > 0 ? (
                  <div className={styles.blockList}>
                    {everyoneBlocks.map((block) => (
                      <AvailabilityBlockItem
                        block={block}
                        copy={copy}
                        key={`${block.startUtc}-${block.endUtc}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={copy.fullAvailabilityEmptyTitle}
                    body={copy.fullAvailabilityEmptyBody(data.participants.length > 0)}
                  />
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>{copy.bestSlotsTitle}</h2>
                  <span>{copy.participantCount(data.results.totalParticipantCount)}</span>
                </div>
                {rankedSlots.length > 0 ? (
                  <div className={styles.slotList}>
                    {rankedSlots.map((slot) => (
                      <RankedSlotItem
                        key={`${slot.startUtc}-${slot.endUtc}`}
                        participants={data.participants}
                        copy={copy}
                        slot={slot}
                        totalParticipantCount={data.results.totalParticipantCount}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title={copy.emptyRankedSlotsTitle} body={copy.emptyRankedSlotsBody} />
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>{copy.windowRangesTitle}</h2>
                  <span>{copy.rangeGroups(data.schedule.dailyWindows.length)}</span>
                </div>
                <div className={styles.windowList}>
                  {data.schedule.dailyWindows.map((window, index) => (
                    <div
                      className={styles.windowItem}
                      key={`${index}-${window.startTime}-${window.endTime}`}
                    >
                      <span>{index + 1}</span>
                      <strong>
                        {formatDays(window.daysOfWeek, copy)} {window.startTime}
                        {copy.rangeSeparator}
                        {window.endTime}
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

function FinalTimeNotice({
  copy,
  finalTime
}: {
  readonly copy: SchedulePageCopy;
  readonly finalTime: TimeSlotDto;
}) {
  return (
    <section className={styles.finalTimeNotice} aria-label={copy.finalTimeAria}>
      <div className={styles.finalTimeIcon}>
        <CalendarCheck aria-hidden="true" size={20} />
      </div>
      <div>
        <span>{copy.finalTimeTitle}</span>
        <strong>
          {formatLocalDateRange(finalTime, copy)} {formatLocalTimeRange(finalTime, copy)}
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

function AvailabilityBlockItem({
  block,
  copy
}: {
  readonly block: AvailabilityBlockDto;
  readonly copy: SchedulePageCopy;
}) {
  return (
    <div className={styles.blockItem}>
      <div>
        <span>{formatLocalDateRange(block, copy)}</span>
        <strong>{formatLocalTimeRange(block, copy)}</strong>
      </div>
      <p>{copy.slotsPlural(block.slotCount)}</p>
    </div>
  );
}

function RankedSlotItem({
  participants,
  copy,
  slot,
  totalParticipantCount
}: {
  readonly participants: GetScheduleResponse["participants"];
  readonly copy: SchedulePageCopy;
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
        <span>{formatLocalDateRange(slot, copy)}</span>
        <strong>{formatLocalTimeRange(slot, copy)}</strong>
      </div>
      <div className={styles.slotItemDetails}>
        <p>{copy.slotsAvailable(slot.availableParticipantCount, totalParticipantCount)}</p>
        {availableNames.length > 0 ? <span>{copy.slotsAvailableNames(availableNames)}</span> : null}
        {unavailableNames.length > 0 ? (
          <span className={styles.slotItemMuted}>
            {copy.slotsUnavailableNames(unavailableNames)}
          </span>
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

function ErrorView({
  locale,
  message
}: {
  readonly locale: SchedulePageLocale;
  readonly message: string;
}) {
  const copy = schedulePageCopy[locale];

  return (
    <main className={styles.page}>
      {locale === "en" ? <PageLanguage lang="en" /> : null}
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.backLink} href={locale === "en" ? "/en" : "/"}>
            <ArrowLeft aria-hidden="true" size={17} />
            {copy.backHome}
          </Link>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>{copy.sharedScheduleEyebrow}</p>
            <h1 className={styles.title}>{copy.unableTitle}</h1>
            <p className={styles.description}>{message}</p>
          </div>
        </header>
      </div>
    </main>
  );
}

function formatDays(daysOfWeek: readonly number[] | undefined, copy: SchedulePageCopy): string {
  if (daysOfWeek === undefined) {
    return copy.daysEveryday;
  }

  return daysOfWeek.map((day) => copy.availabilitySlotGrid.weekdayLabels[day]).join(copy.dayJoiner);
}

function formatLocalDateRange(
  value: Pick<AvailabilityBlockDto, "localStartDate" | "localEndDate">,
  copy: SchedulePageCopy
): string {
  if (value.localStartDate === value.localEndDate) {
    return value.localStartDate;
  }

  return `${value.localStartDate}${copy.dateSeparator}${value.localEndDate}`;
}

function formatLocalTimeRange(
  value: Pick<AvailabilityBlockDto, "localStartTime" | "localEndTime">,
  copy: SchedulePageCopy
): string {
  return `${value.localStartTime}${copy.rangeSeparator}${value.localEndTime}`;
}

function toPageErrorMessage(error: unknown, locale: SchedulePageLocale): string {
  const copy = schedulePageCopy[locale];

  if (error instanceof HttpError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return copy.serverErrorDatabase;
    }

    if (error.code === "SCHEDULE_NOT_FOUND") {
      return copy.serverErrorNotFound;
    }

    return localizedApiErrorMessage(error.code, locale);
  }

  return copy.serverErrorDefault;
}
