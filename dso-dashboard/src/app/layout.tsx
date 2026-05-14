import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DashboardProvider } from "@/context/dashboard-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DSO Visibility | Working Capital Dashboard",
  description:
    "Real-time receivables intelligence powered by AI insights — DSO, Collection Efficiency, Aging & Risk, Operational KPIs, Advanced Analytics, AI Insights & Admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DashboardProvider>{children}</DashboardProvider>
      </body>
    </html>
  );
}
