import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppDoc — AI Documentation Generator",
  description: "Generate markdown documentation from Jira epics and UI screenshots using Claude AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
