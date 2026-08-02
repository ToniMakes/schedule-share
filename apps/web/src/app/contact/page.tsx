import type { Metadata } from "next";

import { SupportPageView } from "../feedback/feedback-page-view";

export const metadata: Metadata = {
  title: "Contact | Schedule Share",
  description:
    "Contact Schedule Share for feedback, archive requests, deletion requests, and privacy-related questions."
};

export default function ContactPage() {
  return <SupportPageView locale="en" route="contact" />;
}
