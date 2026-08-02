import {
  renderParticipantEditPage,
  type ParticipantEditPageProps
} from "../../../../../s/[publicId]/edit/[participantId]/participant-edit-page-view";

export const dynamic = "force-dynamic";

export default function ParticipantEditPage(props: ParticipantEditPageProps) {
  return renderParticipantEditPage(props, "zh-CN");
}
