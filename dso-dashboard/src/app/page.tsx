"use client";

import { useDashboard } from "@/context/dashboard-context";
import { Sidebar } from "@/components/layout/sidebar";
import { GlobalFilters } from "@/components/layout/global-filters";
import { HeroKPIBand } from "@/components/layout/hero-kpi-band";
import { ThemeDensityToggle } from "@/components/layout/theme-density-toggle";
import { ExecutiveKPIs } from "@/components/sections/executive-kpis";
import { CollectionEfficiency } from "@/components/sections/collection-efficiency";
import { AgingRisk } from "@/components/sections/aging-risk";
import { OperationalKPIs } from "@/components/sections/operational-kpis";
import { AdvancedDashboard } from "@/components/sections/advanced-dashboard";
import { AIInsightsDashboard } from "@/components/sections/ai-insights-dashboard";
import { AdminPanel } from "@/components/sections/admin-panel";
import { Chatbot } from "@/components/chatbot";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BarChart3, Layers, Brain, Settings2 } from "lucide-react";

const SECTION_CONFIG = {
  basic: { title: "Overview", subtitle: "Core receivables KPIs", icon: BarChart3 },
  advanced: { title: "Advanced Analytics", subtitle: "Decomposition · risk · process", icon: Layers },
  "ai-insights": { title: "AI Insights", subtitle: "Executive intelligence", icon: Brain },
  admin: { title: "Administration", subtitle: "KPI visibility & configuration", icon: Settings2 },
};

function BasicDashboard() {
  return (
    <>
      <ExecutiveKPIs />
      <CollectionEfficiency />
      <AgingRisk />
      <OperationalKPIs />
    </>
  );
}

function DashboardContent() {
  const { activeSection } = useDashboard();
  switch (activeSection) {
    case "basic":
      return <BasicDashboard />;
    case "advanced":
      return <AdvancedDashboard />;
    case "ai-insights":
      return <AIInsightsDashboard />;
    case "admin":
      return <AdminPanel />;
    default:
      return <BasicDashboard />;
  }
}

export default function Dashboard() {
  const { activeSection, sidebarCollapsed } = useDashboard();
  const config = SECTION_CONFIG[activeSection];
  const SectionIcon = config.icon;
  const showHero = activeSection !== "admin";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div
        className={cn(
          "transition-all duration-300 min-h-screen",
          "md:ml-[220px]",
          sidebarCollapsed && "md:ml-[68px]"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/85 border-b border-border">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SectionIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold tracking-tight text-foreground truncate">
                  {config.title}
                </span>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {config.subtitle}
                </span>
              </div>
              <Badge variant="neutral" className="hidden md:inline-flex">
                DSO Visibility
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <GlobalFilters />
              <Separator orientation="vertical" className="h-5 hidden md:block" />
              <ThemeDensityToggle />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-5 pb-24 md:pb-6 space-y-5">
          {showHero && <HeroKPIBand section={activeSection} />}
          <DashboardContent />

          <footer className="pt-6 mt-6 border-t border-border">
            <p className="text-[11px] text-muted-foreground text-center">
              All metrics computed from the local SQLite database · No external AI APIs ·
              <span className="ml-1 text-muted-foreground/70">
                Click any KPI title <span className="inline-block px-1 rounded border border-border">i</span> for business purpose, formula & insight
              </span>
            </p>
          </footer>
        </main>
      </div>

      <Chatbot />
    </div>
  );
}
