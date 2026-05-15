import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DashboardProvider } from "@/context/dashboard-context";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: "DSO Visibility · Working Capital Dashboard",
  description:
    "Receivables intelligence — DSO, Collection Efficiency, Aging & Risk, AI Insights. Computed from a local database; no external AI APIs.",
};

// Runs before React paints — prevents flash of light theme on hard reload.
const themeInitScript = `
(function(){
  try {
    var saved = localStorage.getItem('dso-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    var d = document.documentElement;
    if (theme === 'dark') d.classList.add('dark');
    d.style.colorScheme = theme;
    var density = localStorage.getItem('dso-density');
    if (density === 'compact') d.classList.add('density-compact');
    else if (density === 'comfortable') d.classList.add('density-comfortable');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <DashboardProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </DashboardProvider>
      </body>
    </html>
  );
}
