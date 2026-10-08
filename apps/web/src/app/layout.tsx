import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schedule Share",
  description: "Find shared availability across time zones"
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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="set-document-language" strategy="beforeInteractive">
          {`const path = location.pathname;
document.documentElement.lang = path === "/zh" || path.startsWith("/zh/") ? "zh-CN" : "en";`}
        </Script>
        {children}
      </body>
    </html>
  );
}
