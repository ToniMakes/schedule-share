import { renderManageSchedulePage, type ManageSchedulePageProps } from "./manage-page-view";

export const dynamic = "force-dynamic";

export default function ManageSchedulePage(props: ManageSchedulePageProps) {
  return renderManageSchedulePage(props, "zh-CN");
}
