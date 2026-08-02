import { redirect } from "next/navigation";

interface LegacyEnglishSchedulePageProps {
  readonly params: Promise<{
    readonly publicId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function LegacyEnglishSchedulePage({
  params
}: LegacyEnglishSchedulePageProps) {
  const { publicId } = await params;

  redirect(`/s/${encodeURIComponent(publicId)}`);
}
