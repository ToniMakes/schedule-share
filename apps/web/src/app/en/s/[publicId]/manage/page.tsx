import {
  renderManageSchedulePage,
  type ManageSchedulePageProps
} from "../../../../s/[publicId]/manage/manage-page-view";

export const dynamic = "force-dynamic";

export default function EnglishManageSchedulePage(props: ManageSchedulePageProps) {
  return renderManageSchedulePage(props, "en");
}
