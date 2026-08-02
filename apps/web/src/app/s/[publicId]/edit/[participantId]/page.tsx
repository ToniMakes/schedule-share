import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, Clock, ListChecks } from "lucide-react";

import type { GetParticipantAvailabilityResponse } from "@schedule-share/api-client";

import { getDatabase } from "@/server/db";
import { HttpError } from "@/server/errors";
import { getParticipantAvailabilityView } from "@/server/schedules/get-participant-availability";
import { DrizzleScheduleRepository } from "@/server/schedules/repository";

import { EditAvailabilityForm } from "./edit-availability-form";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

interface ParticipantEditPageProps {
  readonly params: Promise<{
    readonly publicId: string;
    readonly participantId: string;
  }>;
  readonly searchParams: Promise<{
    readonly key?: string | string[];
  }>;
}

export default async function ParticipantEditPage({
  params,
  searchParams
}: ParticipantEditPageProps) {
  const { publicId, participantId } = await params;
  const editKey = readSearchParam((await searchParams).key);

  try {
    const repository = new DrizzleScheduleRepository(getDatabase());
    const data = await getParticipantAvailabilityView(publicId, participantId, editKey, {
      repository
    });

    return <EditView data={data} editKey={editKey} />;
  } catch (error) {
    return <ErrorView message={toPageErrorMessage(error)} publicId={publicId} />;
  }
}

function EditView({
  data,
  editKey
}: {
  readonly data: GetParticipantAvailabilityResponse;
  readonly editKey: string;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.backLink} href={`/s/${data.schedule.publicId}`}>
            <ArrowLeft aria-hidden="true" size={17} />
            返回日程
          </Link>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>Edit Availability</p>
            <h1 className={styles.title}>{data.participant.displayName}</h1>
            <p className={styles.description}>{data.schedule.title}</p>
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
            label="粒度"
            value={`${data.schedule.slotMinutes} 分钟`}
          />
        </section>

        <EditAvailabilityForm
          editKey={editKey}
          initialAvailableSlots={data.participant.availableSlots}
          initialCandidateVotes={data.participant.candidateVotes}
          initialDisplayName={data.participant.displayName}
          participantId={data.participant.id}
          publicId={data.schedule.publicId}
          scheduleMode={data.schedule.scheduleMode}
          scheduleStatus={data.schedule.status}
          scheduleTimezone={data.schedule.timezone}
          slots={data.slots}
        />
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
            <p className={styles.eyebrow}>Edit Availability</p>
            <h1 className={styles.title}>无法打开编辑页</h1>
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

function toPageErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.code === "DATABASE_UNAVAILABLE") {
      return "数据库尚未配置。";
    }

    if (error.code === "INVALID_EDIT_KEY") {
      return "编辑链接无效或缺少密钥。";
    }

    if (error.code === "PARTICIPANT_NOT_FOUND") {
      return "这个参与者提交不存在或链接有误。";
    }

    return error.message;
  }

  return "服务器暂时无法读取这个提交。";
}
