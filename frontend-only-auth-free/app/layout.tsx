import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clean Sweep! — House Cleaning Game",
  description:
    "Grab your tools and clean a messy house before time runs out! A pure frontend game — deploy to Azure Static Web App in minutes.",
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
