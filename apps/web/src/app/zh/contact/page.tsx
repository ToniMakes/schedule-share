import type { Metadata } from "next";

import { SupportPageView } from "../../feedback/feedback-page-view";

export const metadata: Metadata = {
  title: "联系 | 日程表共享",
  description: "联系日程表共享，提交反馈、归档请求、删除请求或隐私相关问题。"
};

export default function ContactPage() {
  return <SupportPageView locale="zh-CN" route="contact" />;
}
