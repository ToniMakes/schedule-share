import type { Metadata } from "next";

import { SupportPageView } from "./feedback-page-view";

export const metadata: Metadata = {
  title: "Feedback and Deletion Requests | Schedule Share",
  description:
    "Learn how to report issues, share feedback, request archive or deletion, and avoid exposing management or edit links."
};

export default function EnglishFeedbackPage() {
  return <SupportPageView locale="en" route="feedback" />;
}
