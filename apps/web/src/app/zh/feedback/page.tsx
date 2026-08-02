import type { Metadata } from "next";

import { SupportPageView } from "../../feedback/feedback-page-view";

export const metadata: Metadata = {
  title: "反馈与删除请求 | 日程表共享",
  description: "了解如何在内测阶段提交问题反馈、体验建议、归档请求或删除请求。"
};

export default function FeedbackPage() {
  return <SupportPageView locale="zh-CN" route="feedback" />;
}
