import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日程表共享",
  description: "快速找出多人共同空闲时间"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
