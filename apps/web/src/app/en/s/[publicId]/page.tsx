import { renderSchedulePage } from "../../../s/[publicId]/schedule-page-view";

interface EnglishSchedulePageProps {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function EnglishSchedulePage({ params }: EnglishSchedulePageProps) {
  const { publicId } = await params;

  return renderSchedulePage(publicId, "en");
}
