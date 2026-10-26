import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Test | Hello English Classes",
  description: "Timed English practice tests: verbs, everyday sentences and essential words, with Hindi meanings.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Hind:wght@400;500;600;700&display=swap" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
