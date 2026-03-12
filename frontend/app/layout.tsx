import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBRE Copilot Studio POC",
  description:
    "External web app using M365 auth to access a Copilot Studio agent grounded with SharePoint knowledge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
