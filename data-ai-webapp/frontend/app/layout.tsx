import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data AI WebApp",
  description: "Data-centric AI application with RAG, file management, and analytics",
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
