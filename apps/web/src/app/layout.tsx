import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日程表共享",
  description: "快速找出多人共同空闲时间"
};

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width"
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
