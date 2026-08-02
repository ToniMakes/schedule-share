import { renderSchedulePage } from "../../../s/[publicId]/schedule-page-view";

export const dynamic = "force-dynamic";

interface SchedulePageProps {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { publicId } = await params;

  return renderSchedulePage(publicId, "zh-CN");
}
