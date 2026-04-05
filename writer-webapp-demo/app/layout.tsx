import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Writer's Studio — AI Writing Companion",
  description: "Ingest your writings, audio transcripts, and notes — then generate summaries, analysis, and new creative works from your corpus",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
