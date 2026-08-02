import type { Route } from "next";
import { redirect } from "next/navigation";

interface LegacyEnglishParticipantEditPageProps {
  readonly params: Promise<{
    readonly participantId: string;
    readonly publicId: string;
  }>;
  readonly searchParams: Promise<{
    readonly key?: string | string[];
  }>;
}

export const dynamic = "force-dynamic";

export default async function LegacyEnglishParticipantEditPage({
  params,
  searchParams
}: LegacyEnglishParticipantEditPageProps) {
  const { participantId, publicId } = await params;
  const key = readSearchParam((await searchParams).key);
  const query = key.length > 0 ? `?key=${encodeURIComponent(key)}` : "";

  redirect(
    `/s/${encodeURIComponent(publicId)}/edit/${encodeURIComponent(participantId)}${query}` as Route
  );
}

function readSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
