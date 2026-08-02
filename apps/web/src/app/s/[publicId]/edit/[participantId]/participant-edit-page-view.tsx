import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, Clock, ListChecks } from "lucide-react";

import type { GetParticipantAvailabilityResponse } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { HttpError } from "@/server/errors";
import { getParticipantAvailabilityView } from "@/server/schedules/get-participant-availability";
import { isPublicImageImportVisible } from "@/server/schedules/image-import";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

import { AdPageChrome, DisplayAd } from "../../../../ads/display-ad";
import { LanguageSwitcher } from "../../../../i18n/language-switcher";
import { localizedApiErrorMessage } from "../../../../i18n/api-error-messages";
import { PageLanguage } from "../../../../i18n/page-language";
import { EditAvailabilityForm } from "./edit-availability-form";
import styles from "../../page.module.css";
import { schedulePageCopy, type SchedulePageLocale } from "../../schedule-page-copy";

export interface ParticipantEditPageProps {
  readonly params: Promise<{
    readonly publicId: string;
    readonly participantId: string;
  }>;
  readonly searchParams: Promise<{
    readonly key?: string | string[];
  }>;
}

interface ParticipantEditPageCopy {
  readonly backSchedule: string;
  readonly editEyebrow: string;
  readonly titleAvailability: string;
  readonly titleCandidate: string;
  readonly unableTitle: string;
}

const participantEditPageCopy: Record<SchedulePageLocale, ParticipantEditPageCopy> = {
  "zh-CN": {
    backSchedule: "返回日程",
    editEyebrow: "Edit Availability",
    titleAvailability: "修改可用时间",
    titleCandidate: "修改候选投票",
    unableTitle: "无法打开编辑页"
  },
  en: {
    backSchedule: "Back to Schedule",
    editEyebrow: "Edit Availability",
    titleAvailability: "Edit Availability",
    titleCandidate: "Edit Candidate Vote",
    unableTitle: "Cannot Open Edit Page"
  }
};

export async function renderParticipantEditPage(
  { params, searchParams }: ParticipantEditPageProps,
  locale: SchedulePageLocale
) {
  const { publicId, participantId } = await params;
  const editKey = readSearchParam((await searchParams).key);

  try {
    const repository = new DrizzleScheduleRepository(getDatabase());
    const data = await getParticipantAvailabilityView(publicId, participantId, editKey, {
      repository
    });

    return <EditView data={data} editKey={editKey} locale={locale} />;
  } catch (error) {
    return (
      <ErrorView
        editKey={editKey}
        locale={locale}
        message={toPageErrorMessage(error, locale)}
        participantId={participantId}
        publicId={publicId}
      />
    );
  }
}

function EditView({
  data,
  editKey,
  locale
}: {
  readonly data: GetParticipantAvailabilityResponse;
  readonly editKey: string;
  readonly locale: SchedulePageLocale;
}) {
  const copy = schedulePageCopy[locale];
  const editCopy = participantEditPageCopy[locale];
  const isCandidatePoll = data.schedule.scheduleMode === "candidate_poll";
  const languageHrefs = buildEditLanguageHrefs(
    data.schedule.publicId,
    data.participant.id,
    editKey
  );

  return (
    <main className={styles.page}>
      <PageLanguage lang={locale === "en" ? "en" : "zh-CN"} />
      <AdPageChrome mobileAnchor={false} pageContext="edit-sensitive" thirdPartyAllowed={false}>
        <div className={styles.shell}>
          <LanguageSwitcher
            chineseHref={languageHrefs.chineseHref}
            current={locale}
            englishHref={languageHrefs.englishHref}
          />
          <header className={styles.header}>
            <Link
              className={styles.backLink}
              href={
                locale === "en" ? `/s/${data.schedule.publicId}` : `/zh/s/${data.schedule.publicId}`
              }
            >
              <ArrowLeft aria-hidden="true" size={17} />
              {editCopy.backSchedule}
            </Link>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{editCopy.editEyebrow}</p>
              <h1 className={styles.title}>{data.participant.displayName}</h1>
              <p className={styles.description}>{data.schedule.title}</p>
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
          </section>

          <DisplayAd
            pageContext="edit-sensitive"
            placement="top-banner"
            thirdPartyAllowed={false}
          />

          <EditAvailabilityForm
            editKey={editKey}
            imageImportVisible={isPublicImageImportVisible()}
            initialAvailableSlots={data.participant.availableSlots}
            initialCandidateVotes={data.participant.candidateVotes}
            initialDisplayName={data.participant.displayName}
            locale={locale}
            participantId={data.participant.id}
            publicId={data.schedule.publicId}
            scheduleMode={data.schedule.scheduleMode}
            scheduleStatus={data.schedule.status}
            scheduleTimezone={data.schedule.timezone}
            slots={data.slots}
          />

          <DisplayAd
            pageContext="edit-sensitive"
            placement="bottom-banner"
            thirdPartyAllowed={false}
          />
        </div>
      </AdPageChrome>
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

function ErrorView({
  editKey,
  locale,
  message,
  participantId,
  publicId
}: {
  readonly editKey: string;
  readonly locale: SchedulePageLocale;
  readonly message: string;
  readonly participantId: string;
  readonly publicId: string;
}) {
  const editCopy = participantEditPageCopy[locale];
  const languageHrefs = buildEditLanguageHrefs(publicId, participantId, editKey);

  return (
    <main className={styles.page}>
      <PageLanguage lang={locale === "en" ? "en" : "zh-CN"} />
      <div className={styles.shell}>
        <LanguageSwitcher
          chineseHref={languageHrefs.chineseHref}
          current={locale}
          englishHref={languageHrefs.englishHref}
        />
        <header className={styles.header}>
          <Link
            className={styles.backLink}
            href={locale === "en" ? `/s/${publicId}` : `/zh/s/${publicId}`}
          >
            <ArrowLeft aria-hidden="true" size={17} />
            {editCopy.backSchedule}
          </Link>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>{editCopy.editEyebrow}</p>
            <h1 className={styles.title}>{editCopy.unableTitle}</h1>
            <p className={styles.description}>{message}</p>
          </div>
        </header>
      </div>
    </main>
  );
}

function buildEditLanguageHrefs(publicId: string, participantId: string, editKey: string) {
  const query = editKey.length > 0 ? `?key=${encodeURIComponent(editKey)}` : "";

  return {
    chineseHref: `/zh/s/${publicId}/edit/${participantId}${query}`,
    englishHref: `/s/${publicId}/edit/${participantId}${query}`
  };
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

    if (error.code === "INVALID_EDIT_KEY") {
      return locale === "en"
        ? "The edit link is invalid or missing its key."
        : "编辑链接无效或缺少密钥。";
    }

    if (error.code === "PARTICIPANT_NOT_FOUND") {
      return locale === "en"
        ? "This participant submission does not exist, or the link is incorrect."
        : "这个参与者提交不存在或链接有误。";
    }

    return localizedApiErrorMessage(error.code, locale);
  }

  return locale === "en"
    ? "The server cannot read this submission right now."
    : "服务器暂时无法读取这个提交。";
}
